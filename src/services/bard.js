import {Bard} from "googlebard";
import {isApproved, isNotApproved} from "../utils/approval.js";
import {editMessage, splitter, wait} from "../utils/utils.js";

let bardInstance;
async function getBard() {
    const cookies = process.env.BARD_COOKIE;
    if (!bardInstance) bardInstance = new Bard(cookies, {inMemory: false});
    return bardInstance;
}

export async function askBard(prompt = "Hey", message, bot, context = undefined) {
    const groupId = message.key.remoteJid;
    const approval = await isApproved(groupId);
    await bot.sendPresenceUpdate('composing', groupId);
    if (approval) {
        const bard = await getBard();
        let res;
        if (context) res = await bard.ask(context + "\n" + prompt)
        else res = await bard.ask(prompt);
        res = res.replace(/\*\*/g, "*");
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