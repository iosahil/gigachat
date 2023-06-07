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
        try {
            if (context) res = await bard.ask(context + "\n" + prompt)
            else res = await bard.ask(prompt);
            res = res.replace(/\*\*/g, "*");
        } catch (e) {
            console.log(e);
            res = "Sorry, I don't know what to say.";
        }
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
/*
// My own implementation of Bard
import axios from "axios";
import {JSDOM} from 'jsdom';
async function askBard(message) {
    // requires USA Location
    const reqID = Math.floor(Math.random() * 9000 + 1000);
    const session = axios.create({
        baseURL: 'https://bard.google.com', headers: {
            'Host': 'bard.google.com',
            'X-Same-Domain': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'Origin': 'https://bard.google.com',
            'Referer': 'https://bard.google.com/',
        },
    });

    session.defaults.headers.Cookie = "__Secure-1PSID=XQhhVcKDhGtwZYvhfNqzWDh9bwheThETfRuXNqTlteY7PMS5STZ77skelh6hCFiUV9nZkQ.";

    // const resp = await session.get('/');
    // const dom = new JSDOM(resp.data);
    // const SNlM0eu = dom.window.document.querySelector('script[nonce]').textContent
    // const SNlM0ei = SNlM0eu.match(/SNlM0e":"(.*?)"/);
    const SNlM0e = "AFuTz6vps89VH7rVZhtxK4wXnSZj:1686167007012"

    const params = {
        bl: 'boq_assistant-bard-web-server_20230315.04_p2', _reqid: reqID, rt: 'c',
    };

    const messageStruct = [[message], null, ['', '', ''],];

    const data = new URLSearchParams({
        'f.req': JSON.stringify([null, JSON.stringify(messageStruct)]), at: SNlM0e,
    });

    const response = await session.post('/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate', data, {params});

    const chatData = JSON.parse(response.data.split('\n')[3])[0][2];
    if (!chatData) {
        return `Google Bard encountered an error.`;
    }

    const jsonChatData = JSON.parse(chatData);
    return jsonChatData[0][0];
}
*/

