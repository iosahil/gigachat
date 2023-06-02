import "dotenv/config";
import {AI_PROMPT, Client, HUMAN_PROMPT} from "@anthropic-ai/sdk";
import {logger} from "../utils/logger.js";
import {isApproved, isNotApproved} from "../utils/approval.js";
import {editMessage, splitter, wait} from "../utils/utils.js";

let anthropicInstance;

function getAnthropicInstance() {
    if (!anthropicInstance) {
        anthropicInstance = new Client(process.env.ANTHROPIC_API_KEY);
    }
    return anthropicInstance;
}
async function claude(question, context = undefined) {
    const client = getAnthropicInstance();
    let myPrompt = `${HUMAN_PROMPT} ${question}${AI_PROMPT}`;
    if (context) myPrompt = `${HUMAN_PROMPT} ? ${AI_PROMPT} ${context}${HUMAN_PROMPT} ${question}${AI_PROMPT}`;
    return client
        .complete({
            prompt: myPrompt,
            stop_sequences: [HUMAN_PROMPT],
            max_tokens_to_sample: 300,
            model: "claude-instant-v1.1",
        })
        .then((completion) => {
            return completion.completion.trim();
        })
        .catch((error) => {
            logger.error(error);
            return false;
        });
}

export async function askClaude(question, message, bot, context = undefined) {
    const groupId = message.key.remoteJid;
    const approval = await isApproved(groupId);
    await bot.sendPresenceUpdate('composing', groupId);
    if (approval) {
        let res = await claude(question, context)
        let ans = await bot.sendMessage(groupId,
            {text: "Answered.\n(If you can't see the edited message, please update WhatsApp or switch to another device.)"},
            {quoted: message});
        let resList = splitter(res);
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
        return res;
    } else await isNotApproved(approval, bot, groupId, message);
}