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
exports.sendMediaTemplate = exports.sendTextTemplateMsg = void 0;
const axios_1 = __importDefault(require("axios"));
const wpEndPoint_1 = require("../constants/wpEndPoint");
// @Deprecated
const getWindowOpenStatus = (phoneNumber) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.default.get(`${process.env.WP_SERVER_BASE_URL}/${wpEndPoint_1.wpEndPoint.userStatus}/${phoneNumber}`);
    return response.data.isChatOpen;
});
// @Deprecated
const sendMediaToWhatsApp = (mediaId, toPhoneNumber, mimeType) => __awaiter(void 0, void 0, void 0, function* () {
    const isWindowOpen = yield getWindowOpenStatus(toPhoneNumber);
    if (!isWindowOpen) {
        // await openWhatsAppWindow(toPhoneNumber);
    }
    const response = yield axios_1.default.post(`${process.env.WP_SERVER_BASE_URL}/${wpEndPoint_1.wpEndPoint.sendMedia}`, {
        mediaId,
        mimeType,
        toPhoneNumber,
    });
    return response.data;
});
const sendTextTemplateMsg = (toPhoneNumber, templateNmae) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.post(`${process.env.WP_SERVER_BASE_URL}/${wpEndPoint_1.wpEndPoint.openWhatsAppWindow}`, {
            toPhoneNumber,
            templateName: templateNmae,
            templateLanguage: process.env.WP_TEMPLATE_LANGUAGE,
        }, {
            headers: {
                'x-api-key': process.env.WP_API_KEY,
                'Content-Type': 'application/json',
                'Cookie': `__Host-authjs.csrf-token=${process.env.CSRF_TOKEN}`,
            },
        });
        return response.data;
    }
    catch (error) {
        console.log(error);
    }
});
exports.sendTextTemplateMsg = sendTextTemplateMsg;
const sendMediaTemplate = (toPhoneNumber, mediaId, fileNmae, mimetype) => __awaiter(void 0, void 0, void 0, function* () {
    const normalizedMimeType = mimetype.toLowerCase();
    let type = "";
    if (normalizedMimeType.startsWith('image/')) {
        type = 'image';
    }
    else if (normalizedMimeType.startsWith('video/')) {
        type = 'video';
    }
    else {
        type = 'document';
    }
    const response = yield axios_1.default.post(`${process.env.WP_SERVER_BASE_URL}/${wpEndPoint_1.wpEndPoint.openWhatsAppWindow}`, {
        templateName: 'test_3',
        templateLanguage: 'en',
        toPhoneNumber: toPhoneNumber,
        components: [
            {
                type: 'header',
                parameters: [
                    {
                        type,
                        document: {
                            id: mediaId,
                            filename: fileNmae
                        }
                    }
                ]
            }
        ]
    }, {
        headers: {
            'x-api-key': process.env.WP_API_KEY,
            'Content-Type': 'application/json',
            'Cookie': `__Secure-authjs.session-token=${process.env.SESSION_TOKEN}`
        }
    });
    console.log('Media template sent successfully:', response.data);
});
exports.sendMediaTemplate = sendMediaTemplate;
