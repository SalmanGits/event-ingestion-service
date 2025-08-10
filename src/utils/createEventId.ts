import crypto from 'crypto'

export function creatEventId(e: {
    orgId: string
    projectId: string
    userId: string
    eventName: string
    timestamp: string | Date
}) {
    const t =
        typeof e.timestamp === 'string'
            ? e.timestamp
            : e.timestamp.toISOString()
    const raw = `${e.orgId}|${e.projectId}|${e.userId}|${e.eventName}|${t}`
    return crypto.createHash('sha1').update(raw).digest('hex')
}
