import QRCode from "qrcode";
import {approveGroup, denyGroup, removeGroup} from "../components/groupActions.js";
import {logger} from "../utils/logger.js";
import {config} from "../../config.js";
import TelegramBot from "node-telegram-bot-api";

let tgInstance, chatID;
function getTgInstance() {
    chatID = process.env.TELEGRAM_CHAT_ID;
    if (!tgInstance) {
        tgInstance = new TelegramBot(
            process.env.TELEGRAM_BOT_TOKEN,
            {polling: !config.debug} // Disabled polling in debug mode
        );
    }
    return tgInstance;
}


export async function sendQR(base64Text) {
    await QRCode.toBuffer(base64Text, {type: 'png'}, function (err, buffer) {
        if (err) throw err;
        const tgBot = getTgInstance();
        process.env.NTBA_FIX_350 = "1"
        tgBot.sendPhoto(chatID, buffer, {caption: `QR Code for ${config.botName}`});
    });
}

export async function sendUpdate(text, opts = undefined) {
    const tgBot = getTgInstance();
    opts ? await tgBot.sendMessage(chatID, text) : await tgBot.sendMessage(chatID, text, opts);
}

// Listen to buttons calls
export function listenToTGButtons() {
    const tgBot = getTgInstance();
    tgBot.on('callback_query', async query => {
        const data = JSON.parse(query.data);
        switch (data.action) {
            case 'approve':
                await approveGroup(data.groupId);
                await tgBot.editMessageText(
                    query.message.text
                        .replace("New Group Access Request", "<b>New Group Access Request</b>")
                        .replace("Group Name:", "<b>Group Name:</b>")
                        .replace("Group ID:", "<b>Group ID:</b>")
                        .replace("Name:", "<b>Name:</b>")
                        .replace("Phone:", "<b>Phone:</b>")
                        .replace("WhatsApp:", "<b>WhatsApp:</b>")
                        .replace("Status:", "<b>Status:</b>")
                        .replace("Need:", "<b>Need:</b>")
                        .replace("Email:", "<b>Email:</b>")
                        .replace("Interested in Group:", "<b>Interested in Group:</b>")
                        .replace("Awaiting Approval", "Approved ✅"),
                    {
                        chat_id: query.message.chat.id,
                        message_id: query.message.message_id,
                        parse_mode: 'HTML',
                        disable_web_page_preview: true,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: 'Remove',
                                        callback_data: `{"groupId": "${data.groupId}", "action": "remove"}`
                                    }
                                ]
                            ]
                        }
                    }
                )
                await tgBot.answerCallbackQuery(query.id, {text: `${data.groupId.replace("@g.us", "")} Approved ✅`});
                break;
            case 'deny':
                await denyGroup(data.groupId);
                await tgBot.editMessageText(
                    query.message.text
                        .replace("New Group Access Request", "<b>New Group Access Request</b>")
                        .replace("Group Name:", "<b>Group Name:</b>")
                        .replace("Group ID:", "<b>Group ID:</b>")
                        .replace("Name:", "<b>Name:</b>")
                        .replace("Phone:", "<b>Phone:</b>")
                        .replace("WhatsApp:", "<b>WhatsApp:</b>")
                        .replace("Status:", "<b>Status:</b>")
                        .replace("Need:", "<b>Need:</b>")
                        .replace("Email:", "<b>Email:</b>")
                        .replace("Interested in Group:", "<b>Interested in Group:</b>")
                        .replace("In Progress", "Denied ❌"),
                    {
                        chat_id: query.message.chat.id,
                        message_id: query.message.message_id,
                        parse_mode: 'HTML',
                        disable_web_page_preview: true,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: 'Approve',
                                        callback_data: `{"groupId": "${data.groupId}", "action": "approve"}`
                                    }
                                ]
                            ]
                        }
                    }
                )
                await tgBot.answerCallbackQuery(query.id, {text: `${data.groupId.replace("@g.us", "")} Denied ❌`});
                break;
            case 'remove':
                await removeGroup(data.groupId);
                await tgBot.editMessageText(
                    query.message.text
                        .replace("New Group Access Request", "<b>New Group Access Request</b>")
                        .replace("Group Name:", "<b>Group Name:</b>")
                        .replace("Group ID:", "<b>Group ID:</b>")
                        .replace("Name:", "<b>Name:</b>")
                        .replace("Phone:", "<b>Phone:</b>")
                        .replace("WhatsApp:", "<b>WhatsApp:</b>")
                        .replace("Status:", "<b>Status:</b>")
                        .replace("Need:", "<b>Need:</b>")
                        .replace("Email:", "<b>Email:</b>")
                        .replace("Interested in Group:", "<b>Interested in Group:</b>")
                        .replace("Approved ✅", "Removed 🗑️"),
                    {
                        chat_id: query.message.chat.id,
                        message_id: query.message.message_id,
                        parse_mode: 'HTML',
                        disable_web_page_preview: true,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: 'Approve',
                                        callback_data: `{"groupId": "${data.groupId}", "action": "approve"}`
                                    }
                                ]
                            ]
                        }
                    }
                )
                await tgBot.answerCallbackQuery(query.id, {text: `${data.groupId.replace("@g.us", "")} Removed 🗑️`});
                break;
            default:
                logger.error(`Unknown action: ${data.action}`);
        }
    });
}