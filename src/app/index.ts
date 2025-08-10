import express from 'express'
import cors from 'cors'
import connectDB from '../config/db'
import errorHandler from '../middlewares/errorHandler'
import { swaggerDocsHandler, swaggerUiHandler } from '../swagger'
import eventRoutes from '../routes/event.route'

class App {
    public app: express.Application
    constructor() {
        this.app = express()
        this.initMiddlewares()
        this.mountRoutes()
    }
    mountRoutes() {
        this.app.use('/api-docs', swaggerUiHandler, swaggerDocsHandler)
        this.app.use('/api/v1/events', eventRoutes)
        this.app.use(errorHandler as any)
    }
    initMiddlewares() {
        this.app.use(express.json())
        this.app.use(express.urlencoded({ extended: true }))
        this.app.use(cors())
    }
    start(port: number) {
        connectDB()
        this.app.listen(port, () => {
            console.log(`Server started at http://localhost:${port}`)
        })
    }
}
export default App
