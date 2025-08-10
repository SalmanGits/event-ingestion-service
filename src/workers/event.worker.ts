import { Worker, Job } from 'bullmq'
import { redis } from '../config/redis'
import Event from '../models/event.model'
import { chunkArray } from '../utils/chunkArray'

const BATCH_CHUNK_SIZE = parseInt(process.env.BATCH_CHUNK_SIZE || '1000')

new Worker(
    'event-ingestion',
    async (job: Job) => {
        const events = job.data.events || []
        if (!Array.isArray(events) || events.length === 0) return

        const chunks = chunkArray(events, BATCH_CHUNK_SIZE)

        for (const chunk of chunks) {
            try {
                await Event.insertMany(chunk, { ordered: false })
            } catch (err: any) {
                if (err?.code && err.code === 11000) {
                    console.log('duplicate')
                } else {
                    throw err
                }
            }
        }
    },
    {
        connection: redis,
    }
)
