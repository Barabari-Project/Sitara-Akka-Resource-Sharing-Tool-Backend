import { Request, Response, Router } from "express";
import expressAsyncHandler from "express-async-handler";
import { uploadFileToWhatsApp } from "../utility/awsS3";
import { ResourceDataEntryModel } from "../models/resourceDataEntry.model";
import { ExpiringMediaModel } from "../models/expiringMedia.model";

export const cronRouter = Router();

const EXPIRY_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const MEDIA_EXPIRY_DURATION_MS = 28 * 24 * 60 * 60 * 1000; // 28 days

cronRouter.get('/check-uploads', expressAsyncHandler(async (req: Request, res: Response) => {
    try {
        const cursor = ResourceDataEntryModel.find().cursor();
        const now = Date.now();
        const triggeredUploads: any[] = [];

        for await (const resource of cursor) {
            const existingMedia = await ExpiringMediaModel.findById(resource._id);

            if (existingMedia) {
                const createdAt = new Date(existingMedia.createdAt).getTime();
                const expiryTime = createdAt + MEDIA_EXPIRY_DURATION_MS;
                const timeLeft = expiryTime - now;

                if (timeLeft <= EXPIRY_THRESHOLD_MS) {
                    await uploadFileToWhatsApp(resource.link, resource.name, resource._id);
                    triggeredUploads.push({
                        action: 'reupload',
                        resourceId: resource._id,
                        name: resource.name,
                        expiresInMs: timeLeft
                    });
                }
            } else {
                // First-time upload
                await uploadFileToWhatsApp(resource.link, resource.name, resource._id);
                triggeredUploads.push({
                    action: 'initial upload',
                    resourceId: resource._id,
                    name: resource.name,
                    expiresInMs: null
                });
            }
        }

        res.status(200).json({
            message: 'Upload checks completed.',
            uploadsTriggered: triggeredUploads.length,
            data: triggeredUploads
        });
    } catch (err) {
        console.error('Error in check-uploads handler:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
}));