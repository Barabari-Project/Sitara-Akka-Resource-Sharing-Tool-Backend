import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import axios from 'axios';
import dotenv from 'dotenv';
import createHttpError from 'http-errors';
import { startSession, Types } from 'mongoose';
import { ExpiringMediaModel } from '../models/expiringMedia.model';
dotenv.config();

// AWS S3 Config
const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
});

export const uploadToS3 = async (fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> => {
    const key = fileName;

    const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
        // ACL: 'public-read'
    });

    await s3.send(command);

    return `https://${process.env.AWS_BUCKET_NAME!}.s3.${process.env.AWS_REGION!}.amazonaws.com/${key}`;
};

export const deleteFromS3 = async (key: string) => {
    const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: key
    });
    await s3.send(command);
};

export const getS3Link = (key: string) => {
    return `https://${process.env.AWS_BUCKET_NAME!}.s3.${process.env.AWS_REGION!}.amazonaws.com/${key}`;
};

export const getFileFromS3 = async (key: string) => {
    const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: key
    });
    const response = await s3.send(command);
    return {
        stream: response.Body as NodeJS.ReadableStream,
        contentType: response.ContentType || 'application/octet-stream', // fallback
        metadata: response.Metadata, // optional: could store extension here
        fileName: key.split('/').pop() // extract file name from key
    };
};

export const uploadFileToWhatsApp = async (s3Url: string,mimeType:string, _id: Types.ObjectId) => {
    const session = await startSession();
    try {
        // 3. Call WhatsApp Upload API
        const response = await axios.post(
            'https://next.meteor.sitaraakka.org/api/athena/media/upload',
            {
                s3Url
            },
            {
                headers: {
                    'x-api-key': process.env.WP_API_KEY,
                    'Content-Type': 'application/json',
                    'Cookie':
                        `__Host-authjs.csrf-token=${process.env.CSRF_TOKEN}`,
                },
            }
        );
        // 4. MongoDB Transaction
        await session.withTransaction(async () => {
            await ExpiringMediaModel.findByIdAndDelete(_id, { session });

            const mediaObj = new ExpiringMediaModel({
                mediaId: response.data.id,
                _id,
                mimeType,
            });

            await mediaObj.save({ session });
        });
        console.log('Upload successful:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('Upload failed:', error.response?.data || error.message);
        throw createHttpError(400,"Whatsapp Upload get failed. Please connect your developer.");
    } finally {
        await session.endSession();
    }
}