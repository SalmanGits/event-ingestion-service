import dotenv from 'dotenv'
dotenv.config()
import './workers/event.worker'

import App from './app'

const app = new App()
const PORT: number = Number(process.env.PORT) || 3000

app.start(PORT)
