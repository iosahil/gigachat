import crypto from "crypto";
import ImageKit from "imagekit";

let imagekitInstance;
function getImageKit() {
    if (!imagekitInstance) {
        imagekitInstance = new ImageKit({
            publicKey: process.env.IMAGEKIT_PUBLICKEY,
            privateKey: process.env.IMAGEKIT_PRIVATEKEY,
            urlEndpoint: process.env.IMAGEKIT_ENDPOINT
        })
    }
    return imagekitInstance;
}

export const capitaliseFirst = str => str.charAt(0).toUpperCase() + str.slice(1);
// console.log(process.env.TEST);
// console.log(process.env.IMAGEKIT_PUBLICKEY);
export async function uploadImage(base64Img, fileName = "test.jpg") {
    const imagekit = getImageKit();
    const result = await imagekit.upload({
        file: base64Img,
        fileName: fileName,
        folder: "/whatsapp/",
        useUniqueFileName: true
    });
    return result.url;
}

export function random(min = 3, max = 8) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function wait(ms = 200) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function splitter(str, numChunks = random()) {
    if (str.length <= 100) numChunks = 2;
    if (str.length <= 150) numChunks = 3;
    const chunkSize = Math.ceil(str.length / numChunks);
    const chunks = [];

    for (let i = 0; i < str.length; i += chunkSize) {
        chunks.push(str.slice(i, i + chunkSize));
    }

    return chunks;
}

export async function editMessage(messageKey, bot, editedMessage) {
    try {
        await bot.relayMessage(messageKey.remoteJid, {
            protocolMessage: {
                key: messageKey,
                type: 14,
                editedMessage: {
                    conversation: editedMessage
                }
            }
        }, {})
    } catch (e) {
        console.log(e);
    }
}

export function encrypt(plainText) {
    const encryptionKey = Buffer.from('7d6ae4da54e28721671173df43d20afb485ca4764c51078a406f78114779b366', 'hex');
    const iv = Buffer.from('a1b7c311fb48a69e058069fdd1fdde28', 'hex');
    const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
    return Buffer.concat([cipher.update(plainText), cipher.final()]).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}