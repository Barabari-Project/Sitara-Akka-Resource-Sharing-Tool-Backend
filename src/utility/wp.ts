import axios from "axios";
import { wpEndPoint } from "../constants/wpEndPoint";

// @Deprecated
const getWindowOpenStatus = async (phoneNumber: string) => {
  const response = await axios.get(`${process.env.WP_SERVER_BASE_URL}/${wpEndPoint.userStatus}/${phoneNumber}`);
  return response.data.isChatOpen;
}

// @Deprecated
const sendMediaToWhatsApp = async (mediaId: string, toPhoneNumber: string, mimeType: string) => {
  const isWindowOpen = await getWindowOpenStatus(toPhoneNumber);
  if (!isWindowOpen) {
    // await openWhatsAppWindow(toPhoneNumber);
  }
  const response = await axios.post(`${process.env.WP_SERVER_BASE_URL}/${wpEndPoint.sendMedia}`, {
    mediaId,
    mimeType,
    toPhoneNumber,
  });
  return response.data;
}

export const sendTextTemplateMsg = async (toPhoneNumber: string, templateNmae: string) => {
  try {
    const response = await axios.post(`${process.env.WP_SERVER_BASE_URL}/${wpEndPoint.openWhatsAppWindow}`, {
      toPhoneNumber,
      templateName: templateNmae,
      templateLanguage: process.env.WP_TEMPLATE_LANGUAGE,
    }, {
      headers: {
        'x-api-key': process.env.WP_API_KEY,
        'Content-Type': 'application/json',
        'Cookie':
          `__Host-authjs.csrf-token=${process.env.CSRF_TOKEN}`,
      },
    });
    return response.data;
  } catch (error) {
    console.log(error);
  }
}


export const sendMediaTemplate = async (toPhoneNumber: string, mediaId: number, fileNmae: string, mimetype: string) => {
  const normalizedMimeType = mimetype.toLowerCase();
  let type = "";
  if (normalizedMimeType.startsWith('image/')) {
    type = 'image';
  } else if (normalizedMimeType.startsWith('video/')) {
    type = 'video';
  } else {
    type = 'document';
  }


  const response = await axios.post(
    'https://next.meteor.sitaraakka.org/api/athena/messages/media',
    {
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
    },
    {
      headers: {
        'x-api-key': process.env.WP_API_KEY,
        'Content-Type': 'application/json',
        'Cookie': `__Secure-authjs.session-token=${process.env.SESSION_TOKEN}`
      }
    }
  );

  console.log('Media template sent successfully:', response.data);

};

