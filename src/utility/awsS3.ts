import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import axios from 'axios';
import dotenv from 'dotenv';
import FormData from 'form-data';
import { startSession, Types } from 'mongoose';
import { Readable } from 'stream';
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

export const uploadFileToWhatsApp = async (key: string, fileName: string, _id: Types.ObjectId) => {
    const session = await startSession();
    try {
        // 1. Get the file from S3
        const s3Response = await s3.send(
            new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME!,
                Key: key
            })
        );

        const stream = s3Response.Body as Readable;
        const mimeType = s3Response.ContentType || 'application/octet-stream';

        // 2. Prepare FormData for WhatsApp upload
        const form = new FormData();
        form.append('file', stream, {
            filename: fileName,
            contentType: mimeType
        });

        // 3. Call WhatsApp Upload API
        const response = await axios.post(
            'https://next.meteor.sitaraakka.org/api/athena/media/upload',
            form,
            {
                headers: {
                    'x-api-key': process.env.WP_API_KEY,
                    'Cookie':
                        '__Host-authjs.csrf-token=c0f984da4a3f6b2bafc9798f34a233c3c44dc48e6aead3d3b30ae9f693328cae%7Cfe5ac1a7ad92e0d19e356847bb646f13b8f7564aa9da79fbd27365ccbe7accb3; __Secure-authjs.callback-url=https%3A%2F%2Fnext.meteor.sitaraakka.org%2F; __Secure-authjs.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwia2lkIjoiMTlUdVZtVmRxRG5yU3JuUFZwN0hFdjZrNDRNQjNQLXNDSmxzbWE0cVZFQThfUVQ1MktNcDAwNFBfOHBlWWNYVllZX3FOcUJCd1pQSllaVnFnLWdPYncifQ..FhZyZp2mAdf8cyt5cEYdjQ.oQfzCk822ny_gTYeesUTSvkyAJ0U4l5p6avsQgaQKFNEuGlgU8fcP9vOWQ9FZzML7iE-kmAfliK6_Mf7ZsO4N8CjjymzM5FPVGkZ7hayC6iV5DpmK2Ph2uj9mKr7_QdB4mIjvUxTi6_03VvJe9xp0TGv9Zm4NVA4UMvIDsE6ZACRBxjykk-uwy-PT7z33e_0nl_BsLMmJs0FXIb4F7MYqbtntsu3K4yuB8dM5Iw3sBA.7oIqi_eTb95X-4aUY-sRMnXYcazl2nPRz2XGIImGiiw',
                    ...form.getHeaders()
                },
                maxBodyLength: Infinity, // allow large uploads
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
        throw error;
    } finally {
        await session.endSession();
    }
}