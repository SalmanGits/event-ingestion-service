import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { sendResponse } from 'res-express'

const JWT_SECRET = process.env.JWT_SECRET!

declare global {
    namespace Express {
        interface Request {
            userId?: string
        }
    }
}

export const auth = (req: Request, res: Response, next: NextFunction) => {
    try {
        // const authHeader = req.headers.authorization

        // if (!authHeader || !authHeader.startsWith('Bearer ')) {
        //     return sendResponse(res, 401, { error: 'Unauthorized' })
        // }

        // const token = authHeader.split(' ')[1]

        // const decoded = jwt.verify(token, JWT_SECRET) as { id: string }

        // req.userId = decoded.id

        //assuming user has a valid token
        return next()
    } catch (err) {
        next(err)
    }
}
