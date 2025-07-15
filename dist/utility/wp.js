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
exports.openWhatsAppWindow = exports.sendMediaToWhatsApp = exports.getWindowOpenStatus = void 0;
const axios_1 = __importDefault(require("axios"));
const wpEndPoint_1 = require("../constants/wpEndPoint");
const getWindowOpenStatus = (phoneNumber) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.default.get(`${process.env.WP_SERVER_BASE_URL}/${wpEndPoint_1.wpEndPoint.userStatus}/${phoneNumber}`);
    return response.data.isChatOpen;
});
exports.getWindowOpenStatus = getWindowOpenStatus;
const sendMediaToWhatsApp = (mediaId, toPhoneNumber, mimeType) => __awaiter(void 0, void 0, void 0, function* () {
    const isWindowOpen = yield (0, exports.getWindowOpenStatus)(toPhoneNumber);
    if (!isWindowOpen) {
        yield (0, exports.openWhatsAppWindow)(toPhoneNumber);
    }
    const response = yield axios_1.default.post(`${process.env.WP_SERVER_BASE_URL}/${wpEndPoint_1.wpEndPoint.sendMedia}`, {
        mediaId,
        mimeType,
        toPhoneNumber,
    });
    return response.data;
});
exports.sendMediaToWhatsApp = sendMediaToWhatsApp;
const openWhatsAppWindow = (toPhoneNumber) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.post(`${process.env.WP_SERVER_BASE_URL}/${wpEndPoint_1.wpEndPoint.openWhatsAppWindow}`, {
            toPhoneNumber,
            templateName: process.env.WP_TEMPLATE_NAME,
            templateLanguage: process.env.WP_TEMPLATE_LANGUAGE,
        }, {
            headers: {
                'x-api-key': process.env.WP_API_KEY,
            },
        });
        return response.data;
    }
    catch (error) {
        console.log(error);
    }
});
exports.openWhatsAppWindow = openWhatsAppWindow;
