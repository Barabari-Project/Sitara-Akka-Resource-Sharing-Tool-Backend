import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import axios from 'axios';
import dotenv from 'dotenv';
import { Readable } from 'node:stream';
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

export const getS3Link =  (key: string) => {
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


const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

const getBufferFromStream = async (stream: Readable): Promise<Buffer> => {
  const chunks: any[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

export const uploadMediaToWhatsApp = async (key: string) => {
  const s3Response = await s3.send(new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key
  }));

  const stream = s3Response.Body as Readable;
  const mimeType = s3Response.ContentType || 'application/octet-stream';
  const filename = key.split('/').pop() || 'file';

  const buffer = await getBufferFromStream(stream);

  const formData = new FormData();
  formData.append('file', buffer, {
    filename,
    contentType: mimeType
  });
  formData.append('messaging_product', 'whatsapp');
  formData.append('type', mimeType.split('/')[0]); // "image", "video", etc.

  const response = await axios.post(
    `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/media`,
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${WHATSAPP_TOKEN}`
      }
    }
  );

  return response.data.id; // ✅ media_id
};
