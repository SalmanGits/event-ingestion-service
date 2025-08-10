import { Request, Response, NextFunction } from 'express'
import { sendResponse } from 'res-express'
import { z } from 'zod'

const eventSchema = z.object({
    orgId: z.string(),
    projectId: z.string(),
    userId: z.string(),
    eventName: z.string(),
    timestamp: z.string().datetime(),
})

const batchSchema = z.object({
    events: z.array(eventSchema).max(1000),
})

export const validateBatchEvents = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const result = batchSchema.safeParse(req.body)
    if (!result.success) {
        return sendResponse(res, 400, { error: result.error.issues })
    }
    ;+next()
}
