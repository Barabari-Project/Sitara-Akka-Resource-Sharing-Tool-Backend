import axios from "axios";
import { wpEndPoint } from "../constants/wpEndPoint";
import { ExpiringMediaModel } from "../models/expiringMedia.model";
import { Readable } from "node:stream";

export const getWindowOpenStatus = async (phoneNumber: string) => {
    const response = await axios.get(`${process.env.WP_SERVER_BASE_URL}/${wpEndPoint.userStatus}/${phoneNumber}`);
    return response.data.isChatOpen;
}

export const sendMediaToWhatsApp = async (mediaId: string, toPhoneNumber: string, mimeType: string) => {
    const isWindowOpen = await getWindowOpenStatus(toPhoneNumber);
    if (!isWindowOpen) {
        await openWhatsAppWindow(toPhoneNumber);
    }
    const response = await axios.post(`${process.env.WP_SERVER_BASE_URL}/${wpEndPoint.sendMedia}`, {
        mediaId,
        mimeType,
        toPhoneNumber,
    });
    return response.data;
}

export const openWhatsAppWindow = async (toPhoneNumber: string) => {
    try {
        const response = await axios.post(`${process.env.WP_SERVER_BASE_URL}/${wpEndPoint.openWhatsAppWindow}`, {
            toPhoneNumber,
            templateName: process.env.WP_TEMPLATE_NAME,
            templateLanguage: process.env.WP_TEMPLATE_LANGUAGE,
        }, {
            headers: {
                'x-api-key': process.env.WP_API_KEY,
            },
        });
        return response.data;
    } catch (error) {
        console.log(error);
    }
}