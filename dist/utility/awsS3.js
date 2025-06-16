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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMediaToWhatsApp = exports.getFileFromS3 = exports.getS3Link = exports.deleteFromS3 = exports.uploadToS3 = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const dotenv_1 = __importDefault(require("dotenv"));
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
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const getBufferFromStream = (stream) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, stream_1, stream_1_1;
    var _b, e_1, _c, _d;
    const chunks = [];
    try {
        for (_a = true, stream_1 = __asyncValues(stream); stream_1_1 = yield stream_1.next(), _b = stream_1_1.done, !_b; _a = true) {
            _d = stream_1_1.value;
            _a = false;
            const chunk = _d;
            chunks.push(chunk);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (!_a && !_b && (_c = stream_1.return)) yield _c.call(stream_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return Buffer.concat(chunks);
});
const uploadMediaToWhatsApp = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const s3Response = yield s3.send(new client_s3_1.GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
    }));
    const stream = s3Response.Body;
    const mimeType = s3Response.ContentType || 'application/octet-stream';
    const filename = key.split('/').pop() || 'file';
    const buffer = yield getBufferFromStream(stream);
    // const formData = new FormData();
    // formData.append('file', buffer, {
    //   filename,
    //   contentType: mimeType
    // });
    // formData.append('messaging_product', 'whatsapp');
    // formData.append('type', mimeType.split('/')[0]); // "image", "video", etc.
    // const response = await axios.post(
    //   `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/media`,
    //   formData,
    //   {
    //     headers: {
    //       ...formData.getHeaders(),
    //       Authorization: `Bearer ${WHATSAPP_TOKEN}`
    //     }
    //   }
    // );
    // return response.data.id; // ✅ media_id
});
exports.uploadMediaToWhatsApp = uploadMediaToWhatsApp;
