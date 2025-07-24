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
const http_errors_1 = __importDefault(require("http-errors"));
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
const uploadFileToWhatsApp = (s3Url, mimeType, _id) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const session = yield (0, mongoose_1.startSession)();
    try {
        // 3. Call WhatsApp Upload API
        const response = yield axios_1.default.post('https://next.meteor.sitaraakka.org/api/athena/media/upload', {
            s3Url
        }, {
            headers: {
                'x-api-key': process.env.WP_API_KEY,
                'Content-Type': 'application/json',
                'Cookie': `__Host-authjs.csrf-token=${process.env.CSRF_TOKEN}`,
            },
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
        throw (0, http_errors_1.default)(400, "Whatsapp Upload get failed. Please connect your developer.");
    }
    finally {
        yield session.endSession();
    }
});
exports.uploadFileToWhatsApp = uploadFileToWhatsApp;
