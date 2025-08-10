import { NextFunction, Request, Response } from 'express'
import { sendResponse } from 'res-express'
import { creatEventId } from '../../../utils/createEventId'
import { eventQueue } from '../../../queues/event.queue'
import eventModel, { IEvent } from '../../../models/event.model'
import { redis } from '../../../config/redis'
import { PipelineStage } from 'mongoose'


const MAX_PER_REQUEST = parseInt(process.env.MAX_PER_REQUEST || '1000', 10);


interface IngestEventsBody {
    events: Omit<IEvent, 'eventId'>[];
}

export const ingestEvents = async (
    req: Request<{}, {}, IngestEventsBody>,
    res: Response,
    next: NextFunction
) => {
    try {
        const rawEvents = req.body.events || [];
        const limitedEvents = rawEvents.slice(0, MAX_PER_REQUEST);

        const seen = new Set<string>();
        const dedupedEvents: IEvent[] = [];

        for (const e of limitedEvents) {
            const timestampIso = new Date(e.timestamp).toISOString();
            const eventId = creatEventId({ ...e, timestamp: timestampIso });

            if (!seen.has(eventId)) {
                seen.add(eventId);
                dedupedEvents.push({
                    eventId,
                    orgId: e.orgId,
                    projectId: e.projectId,
                    userId: e.userId,
                    eventName: e.eventName,
                    timestamp: new Date(timestampIso),
                } as IEvent);
            }
        }

        if (!dedupedEvents.length) {
            return sendResponse(res, 202, { status: 'no_new_events', count: 0 });
        }

        await eventQueue.add(
            'persistBatch',
            { events: dedupedEvents },
            {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: { age: 3600 },
                removeOnFail: { age: 86400 },
            }
        );

        return sendResponse(res, 202, {
            status: 'queued',
            count: dedupedEvents.length,
        });
    } catch (err) {
        next(err);
    }
};


interface FunnelStep {
    eventName: string;
}

interface FunnelsRequestBody {
    steps: FunnelStep[];
    startDate: string;
    endDate: string;
}

export const getFunnels = async (
    req: Request<{}, {}, FunnelsRequestBody>,
    res: Response,
    next: NextFunction
) => {
    try {
        const { steps, startDate, endDate } = req.body;
        if (!steps?.length || !startDate || !endDate) {
            return sendResponse(res, 400, { error: 'Missing steps, startDate, or endDate' });
        }

        const cacheKey = `funnels:${JSON.stringify({ steps, startDate, endDate })}`;
        const cached = await redis.get(cacheKey);
        if (cached) return sendResponse(res, 200, JSON.parse(cached));

        const events = await eventModel.aggregate([
            {
                $match: {
                    timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) },
                    eventName: { $in: steps.map((s) => s.eventName) },
                },
            },
            { $sort: { userId: 1, timestamp: 1 } },
            { $project: { userId: 1, eventName: 1, timestamp: 1 } },
        ]);

        const userEventsMap = new Map<string, string[]>();
        for (const ev of events) {
            if (!userEventsMap.has(ev.userId)) userEventsMap.set(ev.userId, []);
            userEventsMap.get(ev.userId)!.push(ev.eventName);
        }

        const stepCounts = new Array(steps.length).fill(0);
        for (const [, userSteps] of userEventsMap) {
            let stepIndex = 0;
            for (const eventName of userSteps) {
                if (eventName === steps[stepIndex].eventName) {
                    stepCounts[stepIndex]++;
                    stepIndex++;
                    if (stepIndex >= steps.length) break;
                }
            }
        }

        const response = {
            steps: steps.map((step, i) => ({
                eventName: step.eventName,
                userCount: stepCounts[i],
            })),
        };

        await redis.set(cacheKey, JSON.stringify(response), 'EX', 3600);
        return sendResponse(res, 200, response);
    } catch (err) {
        next(err);
    }
};


interface UserJourneyParams {
    id: string;
}
interface PaginationQuery {
    page?: string;
    limit?: string;
}

export const getUserJourney = async (
    req: Request<UserJourneyParams, {}, {}, PaginationQuery>,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params;
        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);

        const cacheKey = `userJourney:${id}:${page}:${limit}`;
        const cached = await redis.get(cacheKey);
        if (cached) return sendResponse(res, 200, JSON.parse(cached));

        const events = await eventModel
            .find({ userId: id })
            .sort({ timestamp: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select({ eventName: 1, timestamp: 1, _id: 0 });

        const totalCount = await eventModel.countDocuments({ userId: id });
        const totalPages = Math.ceil(totalCount / limit);

        const response = { userId: id, page, limit, totalPages, events };
        await redis.set(cacheKey, JSON.stringify(response), 'EX', 3600);
        return sendResponse(res, 200, response);
    } catch (err) {
        next(err);
    }
};

interface RetentionQuery {
    cohort: string;
    days: string;
    page?: string;
    limit?: string;
}

export const getRetention = async (
    req: Request<{}, {}, {}, RetentionQuery>,
    res: Response,
    next: NextFunction
) => {
    try {
        const { cohort, days, page = '1', limit = '50' } = req.query;
        const daysNum = parseInt(days, 10);
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);

        const cacheKey = `retention:${cohort}:${daysNum}:p${pageNum}:l${limitNum}`;
        const cached = await redis.get(cacheKey);
        if (cached) return sendResponse(res, 200, JSON.parse(cached));

        const pipeline: PipelineStage[] = [
            { $match: { eventName: cohort } },
            { $group: { _id: '$userId', firstEventDate: { $min: '$timestamp' } } },
            {
                $lookup: {
                    from: 'events',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'events'
                }
            },
            { $unwind: { path: '$events' } },
            {
                $project: {
                    day: {
                        $floor: {
                            $divide: [
                                { $subtract: ['$events.timestamp', '$firstEventDate'] },
                                1000 * 60 * 60 * 24
                            ]
                        }
                    }
                }
            },
            { $match: { day: { $gte: 0, $lte: daysNum } } },
            { $group: { _id: '$day', userCount: { $sum: 1 } } },
            { $sort: { _id: 1 } },
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum }
        ];

        const results = await eventModel.aggregate(pipeline);
        const response = { cohort, retention: results };

        await redis.set(cacheKey, JSON.stringify(response), 'EX', 3600);
        return sendResponse(res, 200, response);
    } catch (err) {
        next(err);
    }
};

interface EventMetricsQuery {
    event: string;
    interval: 'daily' | 'weekly';
    startDate: string;
    endDate: string;
    page?: string;
    limit?: string;
}

export const getEventMetrics = async (
    req: Request<{}, {}, {}, EventMetricsQuery>,
    res: Response,
    next: NextFunction
) => {
    try {
        const {
            event,
            interval,
            startDate,
            endDate,
            page = '1',
            limit = '50'
        } = req.query;

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);

        const cacheKey = `eventMetrics:${event}:${interval}:${startDate}:${endDate}:p${pageNum}:l${limitNum}`;
        const cached = await redis.get(cacheKey);
        if (cached) return sendResponse(res, 200, JSON.parse(cached));

        const groupBy =
            interval === 'daily'
                ? { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
                : { $dateToString: { format: '%Y-%U', date: '$timestamp' } };

        const pipeline: PipelineStage[] = [
            {
                $match: {
                    eventName: event,
                    timestamp: {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate)
                    }
                }
            },
            { $group: { _id: groupBy, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum }
        ];

        const results = await eventModel.aggregate(pipeline);
        const response = {
            event,
            metrics: results.map(r => ({ date: r._id, count: r.count }))
        };

        await redis.set(cacheKey, JSON.stringify(response), 'EX', 3600);
        return sendResponse(res, 200, response);
    } catch (err) {
        next(err);
    }
};