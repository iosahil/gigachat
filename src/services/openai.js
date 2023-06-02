import {Configuration, OpenAIApi} from "openai";
import {logger} from "../utils/logger.js";
import {isApproved, isNotApproved} from "../utils/approval.js";
import {editMessage, splitter, wait} from "../utils/utils.js";
import {config} from "../../config.js";

let openaiInstance;
async function getOpenAI() {
    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    });
    if (!openaiInstance) openaiInstance = new OpenAIApi(configuration);
    return openaiInstance;
}
const modelName = config.gpt4 ? "gpt-4" : "gpt-3.5-turbo";

export async function askGPT(prompt, context = undefined) {
    let response;
    const openai = await getOpenAI();
    try {
        const assistant = "You are GigaChat, an AI chat-bot deployed to help students of KIIT University. Anyone can access your features by adding you to a group. You are developed by a first-year KIIT university student, Sahil Choudhary. Use C Language as default language for programming queries."
        let message;
        if (context !== undefined) {
            message = [
                {"role": "system", "content": assistant},
                {"role": "assistant", "content": context},
                {"role": "user", "content": prompt}
            ]
        } else {
            message = [
                {"role": "system", "content": assistant},
                {"role": "user", "content": prompt}
            ]
        }
        const completion = await openai.createChatCompletion({
            model: modelName,
            messages: message
        });
        response = completion.data.choices[0].message?.content;
        if (typeof completion.data.choices[0].message === "string") response = completion.data.choices[0].message;
    } catch (error) {
        if (error.response) {
            logger.error(error.response.status);
            logger.error(error.response.data);
        } else {
            logger.error(error.message);
        }
    }
    return response;
}

export async function askOpenAI(prompt = "Hey", message, bot, context = undefined) {
    const groupId = message.key.remoteJid;
    const approval = await isApproved(groupId);
    await bot.sendPresenceUpdate('composing', groupId);
    if (approval) {
        let res = await askGPT(prompt, context);
        if (res.content === undefined) res = {content: "Sorry, but the server is having hard time currently.😅\nPlease try again later."};
        let ans = await bot.sendMessage(groupId,
            {text: "Answered.\n(If you can't see the edited message, please update WhatsApp or switch to another device.)"},
            {quoted: message});
        let resList = splitter(res.content);
        let tokens = "";
        for (let i = 0; i < resList.length; i++) {
            tokens += resList[i];
            const editedMessage = tokens;
            await editMessage(ans.key, bot, editedMessage)
            await wait()
        }
        const reactionMessage = {
            react: {
                text: "👍", key: message.key
            }
        };
        await bot.sendMessage(groupId, reactionMessage);
        return res.content;
    } else await isNotApproved(approval, bot, groupId, message);
}