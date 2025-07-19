"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFileToWhatsApp = exports.getFileFromS3 = exports.getS3Link = exports.deleteFromS3 = exports.uploadToS3 = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const form_data_1 = __importDefault(require("form-data"));
const mongoose_1 = require("mongoose");
const expiringMedia_model_1 = require("../models/expiringMedia.model");
dotenv_1.default.config();
// AWS S3 Config
const s3 = new client_s3_1.S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});
const uploadToS3 = (fileBuffer, fileName, mimeType) => __awaiter(void 0, void 0, void 0, function* () {
    const key = fileName;
    const command = new client_s3_1.PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
        // ACL: 'public-read'
    });
    yield s3.send(command);
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
});
exports.uploadToS3 = uploadToS3;
const deleteFromS3 = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const command = new client_s3_1.DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
    });
    yield s3.send(command);
});
exports.deleteFromS3 = deleteFromS3;
const getS3Link = (key) => {
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};
exports.getS3Link = getS3Link;
const getFileFromS3 = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const command = new client_s3_1.GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
    });
    const response = yield s3.send(command);
    return {
        stream: response.Body,
        contentType: response.ContentType || 'application/octet-stream', // fallback
        metadata: response.Metadata, // optional: could store extension here
        fileName: key.split('/').pop() // extract file name from key
    };
});
exports.getFileFromS3 = getFileFromS3;
const uploadFileToWhatsApp = (key, fileName, _id) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const session = yield (0, mongoose_1.startSession)();
    try {
        // 1. Get the file from S3
        const s3Response = yield s3.send(new client_s3_1.GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key
        }));
        const stream = s3Response.Body;
        const mimeType = s3Response.ContentType || 'application/octet-stream';
        // 2. Prepare FormData for WhatsApp upload
        const form = new form_data_1.default();
        form.append('file', stream, {
            filename: fileName,
            contentType: mimeType
        });
        // 3. Call WhatsApp Upload API
        const response = yield axios_1.default.post('https://next.meteor.sitaraakka.org/api/athena/media/upload', form, {
            headers: Object.assign({ 'x-api-key': process.env.WP_API_KEY, 'Cookie': '__Host-authjs.csrf-token=c0f984da4a3f6b2bafc9798f34a233c3c44dc48e6aead3d3b30ae9f693328cae%7Cfe5ac1a7ad92e0d19e356847bb646f13b8f7564aa9da79fbd27365ccbe7accb3; __Secure-authjs.callback-url=https%3A%2F%2Fnext.meteor.sitaraakka.org%2F; __Secure-authjs.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwia2lkIjoiMTlUdVZtVmRxRG5yU3JuUFZwN0hFdjZrNDRNQjNQLXNDSmxzbWE0cVZFQThfUVQ1MktNcDAwNFBfOHBlWWNYVllZX3FOcUJCd1pQSllaVnFnLWdPYncifQ..FhZyZp2mAdf8cyt5cEYdjQ.oQfzCk822ny_gTYeesUTSvkyAJ0U4l5p6avsQgaQKFNEuGlgU8fcP9vOWQ9FZzML7iE-kmAfliK6_Mf7ZsO4N8CjjymzM5FPVGkZ7hayC6iV5DpmK2Ph2uj9mKr7_QdB4mIjvUxTi6_03VvJe9xp0TGv9Zm4NVA4UMvIDsE6ZACRBxjykk-uwy-PT7z33e_0nl_BsLMmJs0FXIb4F7MYqbtntsu3K4yuB8dM5Iw3sBA.7oIqi_eTb95X-4aUY-sRMnXYcazl2nPRz2XGIImGiiw' }, form.getHeaders()),
            maxBodyLength: Infinity, // allow large uploads
        });
        // 4. MongoDB Transaction
        yield session.withTransaction(() => __awaiter(void 0, void 0, void 0, function* () {
            yield expiringMedia_model_1.ExpiringMediaModel.findByIdAndDelete(_id, { session });
            const mediaObj = new expiringMedia_model_1.ExpiringMediaModel({
                mediaId: response.data.id,
                _id,
                mimeType,
            });
            yield mediaObj.save({ session });
        }));
        console.log('Upload successful:', response.data);
        return response.data;
    }
    catch (error) {
        console.error('Upload failed:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        throw error;
    }
    finally {
        yield session.endSession();
    }
});
exports.uploadFileToWhatsApp = uploadFileToWhatsApp;
