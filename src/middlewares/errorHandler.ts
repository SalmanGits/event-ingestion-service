import { Request, Response, NextFunction } from 'express'
import { sendResponse } from 'res-express'

interface CustomError extends Error {
    status?: number
}

const errorHandler = (
    error: CustomError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.log(error)

    if (error.status === 401 && error.message === 'Unauthorized') {
        return sendResponse(res, 401, { message: 'Requires authentication' })
    }

    if (
        error.status === 401 &&
        (error.message === 'Permission denied' ||
            error.message === 'Invalid token')
    ) {
        return sendResponse(res, 403, { message: error.message })
    }

    return sendResponse(res, error.status || 500, {
        message: error.message || 'Internal Server Error',
    })
}

export default errorHandler
