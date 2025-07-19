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
                'Cookie': '__Host-authjs.csrf-token=c0f984da4a3f6b2bafc9798f34a233c3c44dc48e6aead3d3b30ae9f693328cae%7Cfe5ac1a7ad92e0d19e356847bb646f13b8f7564aa9da79fbd27365ccbe7accb3; __Secure-authjs.callback-url=https%3A%2F%2Fnext.meteor.sitaraakka.org; __Secure-authjs.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwia2lkIjoiMTlUdVZtVmRxRG5yU3JuUFZwN0hFdjZrNDRNQjNQLXNDSmxzbWE0cVZFQThfUVQ1MktNcDAwNFBfOHBlWWNYVllZX3FOcUJCd1pQSllaVnFnLWdPYncifQ..3ksh8kNtfRLvV6mrvvMonA.dfxvazzSBxsdV6nmMUE6V-_DgcXkGgaSKEeTcO4joPzTSPWKe9W_47Jr7hz4nMwIt_17aYk4yGyw9UeN3iSbRvjA790PkuF0NrlGxx7_JAEaYbGLqCKYOaeY2eOHkJNFdTK2jASl953I_RHLPNZe6bpe8ZZJAFptPLAbt6j-NA6EzT22BFU46v5RxkMfJRhbBB0SI-aApBXN_Apm-wu1v5Jy09wIiVtEs98m4IOCOws.HBXJSnxwpiVma3DsFtc6p-TiVbPgKM6MCsfIpBG0Wl0'
            },
        });
        return response.data;
    }
    catch (error) {
        console.log(error);
    }
});
exports.sendTextTemplateMsg = sendTextTemplateMsg;
const sendMediaTemplate = (toPhoneNumber, mediaId, fileNmae) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const response = yield axios_1.default.post('https://next.meteor.sitaraakka.org/api/athena/messages/media', {
            templateName: 'test_3',
            templateLanguage: 'en',
            toPhoneNumber: toPhoneNumber,
            components: [
                {
                    type: 'header',
                    parameters: [
                        {
                            type: 'document', // TODO: ask him about types which are other types of document will be
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
                'Cookie': '__Secure-authjs.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwia2lkIjoiMTlUdVZtVmRxRG5yU3JuUFZwN0hFdjZrNDRNQjNQLXNDSmxzbWE0cVZFQThfUVQ1MktNcDAwNFBfOHBlWWNYVllZX3FOcUJCd1pQSllaVnFnLWdPYncifQ..fzXkn71pexD2ms2c-elWbw.HnvC9PfOIWCTryvExRe8FAUnV0B0NVIwgnvvCwQqv7X0swLpfFkPk4sE7Nl4Bv0xpvydyZbE0l98_7UAijAVz7-DyJ_JiWJKI3UXYd5Ko03hoOLOOVxhfCDv7PF1ZZLVQbAhgIyCpkqBr2xl-H-_j3xpkPgicFs-_Qp-JyvLzhJuWEXWlMPS8MetFs5UC9qQOq9yiNHB2h7tpKchb1hLbROaTMXr-kUyYDhfhCqflr8.Hgx9Z67XJylLxsCrualN8EeZ4gG1QkO963idwweB4MY'
            }
        });
        console.log('Media template sent successfully:', response.data);
    }
    catch (error) {
        console.error('Error sending media template:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
    }
});
exports.sendMediaTemplate = sendMediaTemplate;
