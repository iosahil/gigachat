import {askOpenAI} from "../services/openai.js";
import {askBard} from "../services/bard.js";
import {mathsAnswer} from "../services/maths.js";
import {isApproved, isNotApproved} from "../utils/approval.js";
import {config} from "../../config.js";
import {askClaude} from "../services/claude.js";
import {setPref} from "../data/respository/harperDB.js";
import {generateImage} from "../services/firefly.js";

export async function chatHandler(text, groupId, bot, message) {
    const lowerText = text.toLowerCase();
    const quoteText = message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;

    if (lowerText.startsWith("c ") || lowerText === "c") {
        if (lowerText.startsWith("c ")) {
            if (quoteText) await askOpenAI(text.slice(2), message, bot, quoteText);
            else await askOpenAI(text.slice(2), message, bot);
        } else {
            if (quoteText) await askOpenAI(quoteText, message, bot);
            else await bot.sendMessage(groupId, {text: "You need to either specify a message or reply to a message to chat with GigaChat."}, {quoted: message});
        }
    } else if (lowerText.startsWith("b ") || lowerText === "b") {
        if (lowerText.startsWith("b ")) {
            if (quoteText) await askBard(quoteText + "\n" + text.slice(2), message, bot);
            else await askBard(text.slice(2), message, bot);
        } else {
            if (quoteText) await askBard(quoteText, message, bot);
            else await bot.sendMessage(groupId, {text: "You need to either specify a message or reply to a message to chat with Google Bard."}, {quoted: message});
        }
    } else if (lowerText.startsWith("a ") || (lowerText === "a")) {
        if (lowerText.startsWith("a ")) {
            if (quoteText) await askClaude(text.slice(2), message, bot, quoteText);
            else await askClaude(text.slice(2), message, bot);
        } else {
            if (quoteText) await askClaude(quoteText, message, bot);
            else await bot.sendMessage(groupId, {text: "You need to either specify a message or reply to a message to chat with Claude."}, {quoted: message});
        }
    } else if (lowerText.startsWith("m ")) {
        await mathsAnswer(bot, message, groupId, text);
    } else if (lowerText === 'h' || lowerText === 'help') {
        const approval = await isApproved(groupId);
        if (approval) {
            await bot.sendMessage(groupId, {
                text:
                    "*GigaChat Help*\n\n" +
                    "*Commands*:\n" +
                    "• ```c <prompt>``` — Chat with GigaChat\n" +
                    "• ```b <prompt>``` — Chat with Google Bard\n" +
                    "• ```a <prompt>``` — Chat with Anthropic Claude\n" +
                    "• ```m <exercise> <question>``` — Get textbook solution\n" +
                    "• ```img on/off``` - Turn on/off Image Features (Default: off)\n" +
                    "• ```ping``` — Check if bot is online\n" +
                    "• ```help``` or ```h``` — Show this message\n\n" +
                    "*Examples*:\n" +
                    "• ```c Hello, how are you?```\n" +
                    "• ```b Current Temperature in Bhubaneshwar?```\n" +
                    "• ```m 11.3 5``` (To get answer to exercise 11.3 question 5)\n" +
                    "*Tip*: You can also reply to a message to chat with GigaChat\n\n" +
                    "*Image Features*:\n" +
                    "• ```i <prompt>``` — Generate image from text\n" +
                    "• ```<image>``` — Extract text from image\n" +
                    "• ```<image> <caption>``` — Chat with visual image\n" +
                    "• ```<image> <caption-with-prompt>``` — Prompt AI image's text\n\n" +
                    "*Examples*:\n" +
                    "• ```<image> Describe this image briefly```\n" +
                    "• ```<image> c``` (Prompt image's text to GigaChat)\n" +
                    "• ```<image> b How is C correct here?``` (Prompt image's text to Google Bard)\n"
            }, {quoted: message});
        } else {
            await isNotApproved(approval, bot, groupId, message);
        }
    } else if (lowerText === 'ping') {
        await bot.sendMessage(groupId, {text: "Pong!"}, {quoted: message});
    } else if (lowerText.startsWith("i ")) {
        const prompt = text.slice(2);
        if (prompt) {
            await bot.sendPresenceUpdate('composing', groupId);
            const buffer = await generateImage(prompt)
            const content = {
                image: buffer
            }
            await bot.sendMessage(groupId, content, {quoted: message});
        }
    } else if (lowerText.startsWith("img ")) {
        const toTurnOn = text.slice(4);
        if (toTurnOn.startsWith("on")) {
            await setPref(groupId, true)
            await bot.sendMessage(groupId, {text: `Image Features have been successfully turned on.`}, {quoted: message});
        } else if (toTurnOn.startsWith("off")) {
            await setPref(groupId, false);
            await bot.sendMessage(groupId, {text: `Image Features have been successfully turned off.`}, {quoted: message});
        } else {
            await bot.sendMessage(groupId, {text: "Invalid command.\nPlease use either of these:\n```img on``` - Turn on image features\n```img off``` - Turn off image features"}, {quoted: message});
        }
    }
}

export async function adminChatHandler(text, groupId, bot, message) {
    text = text.toLowerCase();
    switch (true) {
        case text.startsWith("switch "): {
            const modelSelected = parseInt(text.slice(7)[0]);
            if (isNaN(modelSelected) || modelSelected > 3 || modelSelected < 1) {
                await bot.sendMessage(groupId, {text: `Invalid model selected.\nPlease select a model between 1, 2, 3`}, {quoted: message});
            } else {
                config.modelNum = modelSelected;
                await bot.sendMessage(groupId, {text: `Model have been successfully set to ${modelSelected}.`}, {quoted: message});
            }
            break;
        }
        case text.startsWith("gpt4 "): {
            const toTurnOn = text.slice(5);
            if (toTurnOn.startsWith("on")) {
                config.gpt4 = true;
                await bot.sendMessage(groupId, {text: `GPT-4 have been successfully turned on.`}, {quoted: message});
            } else if (toTurnOn.startsWith("off")) {
                config.gpt4 = false;
                await bot.sendMessage(groupId, {text: `GPT-4 have been successfully turned off.`}, {quoted: message});
            }
            break;
        }
        default:
            break;
    }
}