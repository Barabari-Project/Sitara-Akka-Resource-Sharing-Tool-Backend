import mongoose, { Document, Schema } from 'mongoose';
import collectionName from '../constants/collectionName';

// Define interface
interface ExpiringMedia extends Document {
    mediaId: string;
    createdAt: Date;
    mimeType: string;
}

// Define schema
const ExpiringMediaSchema = new Schema<ExpiringMedia>({
    mediaId: { type: String, required: true },
    mimeType: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: '28d' } // TTL index here
});

// Create model
export const ExpiringMediaModel = mongoose.model<ExpiringMedia>(collectionName.expiringMedia, ExpiringMediaSchema,collectionName.expiringMedia);