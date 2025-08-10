import rateLimit from 'express-rate-limit'
import { RedisStore, type RedisReply } from 'rate-limit-redis'
import { Request, Response, NextFunction } from 'express'
import { redis } from '../config/redis'
import { sendResponse } from 'res-express'

function apiKeyCheck(req: Request, res: Response, next: NextFunction) {
    if (!req.headers['x-api-key']) {
        return sendResponse(res, 400, { error: 'API key missing' })
    }
    next()
}

export const rateLimiter = [
    apiKeyCheck,
    rateLimit({
        store: new RedisStore({
            sendCommand: (command: string, ...args: string[]) =>
                redis.call(command, ...args) as Promise<RedisReply>,
        }),
        keyGenerator: (req: Request) => req.headers['x-api-key'] as string,
        windowMs: 60 * 1000,
        max: 10,
        message: 'Too many requests, please try again later.',
    }),
]
