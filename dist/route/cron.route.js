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
exports.cronRouter = void 0;
const express_1 = require("express");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const awsS3_1 = require("../utility/awsS3");
const resourceDataEntry_model_1 = require("../models/resourceDataEntry.model");
const expiringMedia_model_1 = require("../models/expiringMedia.model");
exports.cronRouter = (0, express_1.Router)();
const EXPIRY_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const MEDIA_EXPIRY_DURATION_MS = 28 * 24 * 60 * 60 * 1000; // 28 days
exports.cronRouter.get('/check-uploads', (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    try {
        const cursor = resourceDataEntry_model_1.ResourceDataEntryModel.find().cursor();
        const now = Date.now();
        const triggeredUploads = [];
        try {
            for (var _d = true, cursor_1 = __asyncValues(cursor), cursor_1_1; cursor_1_1 = yield cursor_1.next(), _a = cursor_1_1.done, !_a; _d = true) {
                _c = cursor_1_1.value;
                _d = false;
                const resource = _c;
                const existingMedia = yield expiringMedia_model_1.ExpiringMediaModel.findById(resource._id);
                if (existingMedia) {
                    const createdAt = new Date(existingMedia.createdAt).getTime();
                    const expiryTime = createdAt + MEDIA_EXPIRY_DURATION_MS;
                    const timeLeft = expiryTime - now;
                    if (timeLeft <= EXPIRY_THRESHOLD_MS) {
                        yield (0, awsS3_1.uploadFileToWhatsApp)(resource.link, resource.name, resource._id);
                        triggeredUploads.push({
                            action: 'reupload',
                            resourceId: resource._id,
                            name: resource.name,
                            expiresInMs: timeLeft
                        });
                    }
                }
                else {
                    // First-time upload
                    yield (0, awsS3_1.uploadFileToWhatsApp)(resource.link, resource.name, resource._id);
                    triggeredUploads.push({
                        action: 'initial upload',
                        resourceId: resource._id,
                        name: resource.name,
                        expiresInMs: null
                    });
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = cursor_1.return)) yield _b.call(cursor_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        res.status(200).json({
            message: 'Upload checks completed.',
            uploadsTriggered: triggeredUploads.length,
            data: triggeredUploads
        });
    }
    catch (err) {
        console.error('Error in check-uploads handler:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
})));
