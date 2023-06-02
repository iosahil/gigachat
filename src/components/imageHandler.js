import {downloadMediaMessage} from "@whiskeysockets/baileys";
import {isApproved, isNotApproved} from "../utils/approval.js";
import {ocr} from "../services/ocr.js";
import {uploadImage} from "../utils/utils.js";
import {getImageDesc} from "../services/imageDesc.js";
import {logger} from "../utils/logger.js";
import {askOpenAI} from "../services/openai.js";
import {getPref} from "../data/respository/harperDB.js";
import {askBard} from "../services/bard.js";
import {askClaude} from "../services/claude.js";

export async function imageHandler(msg, bot, groupId) {
    const approval = await isApproved(groupId);
    if (!approval) {
        await isNotApproved(approval, bot, groupId, msg);
        return false;
    }
    try {
        const isImagePref = await getPref(groupId);
        if (isImagePref === false || isImagePref === null) return false;
        const isAcceptableType = msg.message.imageMessage?.mimetype === 'image/jpeg' || 'image/png'
        if (!isAcceptableType) return false;
        await bot.sendPresenceUpdate('composing', groupId);
        const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            {
                logger,
                // pass this so that baileys can request a reupload of media
                // that has been deleted
                reuploadRequest: bot.updateMediaMessage
            }
        )
        if (!buffer) return false;
        const caption = msg.message.imageMessage?.caption;
        const toOcr = caption === "" || caption === undefined;
        const lowerCaption = caption.toLowerCase();
        const toAsk = /^([a-c]\b|[a-c] )/.test(lowerCaption);
        let textData;
        if (toOcr) {
            textData = await ocr(buffer);
        } else if (toAsk) {
            let ocrData = await ocr(buffer);
            if (ocrData === undefined) ocrData = "Sorry, I couldn't read the image."
            if (lowerCaption === "c") textData = await askOpenAI(ocrData, msg, bot);
            else if (lowerCaption.startsWith("c ")) textData = await askOpenAI(caption.slice(2), msg, bot, ocrData);
            else if (lowerCaption === "b") textData = await askBard(ocrData, msg, bot);
            else if (lowerCaption.startsWith("b ")) textData = await askBard(caption.slice(2), msg, bot, ocrData);
            else if (lowerCaption === "a") textData = await askClaude(ocrData, msg, bot);
            else if (lowerCaption.startsWith("a ")) textData = await askClaude(caption.slice(2), msg, bot, ocrData);
        } else {
            const imageData = buffer.toString('base64')
            const imageUrl = await uploadImage(imageData)
            textData = await getImageDesc(imageUrl, caption);
        }
        if (textData === undefined) textData = "Sorry, I couldn't read the image."
        if (!toAsk) await bot.sendMessage(groupId, {text: textData}, {quoted: msg})
        return true;
    } catch (e) {
        console.log(e)
        return false;
    }
}