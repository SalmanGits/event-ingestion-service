import express from 'express'
import {
    getEventMetrics,
    getFunnels,
    getRetention,
    getUserJourney,
    ingestEvents,
} from '../modules/event/controller/event.controller'
import { auth } from '../middlewares/auth'
import { validateBatchEvents } from '../utils/validate'
import { rateLimiter } from '../middlewares/rateLimit'

const router = express.Router()

/**
 * @openapi
 * /events:
 *   post:
 *     summary: Ingest a batch of user events
 *     tags:
 *       - Events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               events:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     orgId:
 *                       type: string
 *                     projectId:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     eventName:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *     responses:
 *       202:
 *         description: Events queued for processing
 */
router.post('/ingest', auth, validateBatchEvents, rateLimiter, ingestEvents)

/**
 * @openapi
 * /funnels:
 *   post:
 *     summary: Compute user drop-off across ordered steps
 *     tags:
 *       - Analytics
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               steps:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     eventName:
 *                       type: string
 *               startDate:
 *                 type: string
 *               endDate:
 *                 type: string
 *     responses:
 *       200:
 *         description: Funnel analysis results
 */
router.post('/funnels', auth, rateLimiter, getFunnels)

/**
 * @openapi
 * /users/{id}/journey:
 *   get:
 *     summary: Retrieve an ordered event timeline for a specific user
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of events per page
 *     responses:
 *       200:
 *         description: User journey timeline
 */
router.get('/users/:id/journey', auth, rateLimiter, getUserJourney as any)

/**
 * @openapi
 * /retention:
 *   get:
 *     summary: Show cohort retention by day or week
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: query
 *         name: cohort
 *         required: true
 *         schema:
 *           type: string
 *         description: Cohort event name (e.g., signup)
 *       - in: query
 *         name: days
 *         required: true
 *         schema:
 *           type: integer
 *         description: Number of days to calculate retention
 *     responses:
 *       200:
 *         description: Retention analysis results
 */
router.get('/retention', auth, rateLimiter, getRetention as any)

/**
 * @openapi
 * /metrics:
 *   get:
 *     summary: Aggregated counts of events with time bucketing
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: query
 *         name: event
 *         required: true
 *         schema:
 *           type: string
 *         description: Event name to analyze
 *       - in: query
 *         name: interval
 *         required: true
 *         schema:
 *           type: string
 *           enum: [daily, weekly]
 *         description: Time interval for aggregation
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *         description: Start date for the analysis
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *         description: End date for the analysis
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Event metrics results
 */
router.get('/metrics', auth, rateLimiter, getEventMetrics as any)

export default router
