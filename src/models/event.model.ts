import mongoose, { Document } from 'mongoose';

export interface IEvent extends Document {
    eventId: string;
    orgId: string;
    projectId: string;
    userId: string;
    eventName: string;
    timestamp: Date;
}

const EventSchema = new mongoose.Schema<IEvent>(
    {
        eventId: { type: String, required: true, unique: true },
        orgId: { type: String, required: true },
        projectId: { type: String, required: true },
        userId: { type: String, required: true },
        eventName: { type: String, required: true },
        timestamp: { type: Date, required: true },
    },
    { timestamps: true }
);

EventSchema.index({ orgId: 1, projectId: 1, userId: 1, eventName: 1, timestamp: -1 });


export default mongoose.model<IEvent>('Event', EventSchema);



