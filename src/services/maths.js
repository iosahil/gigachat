import fs from "fs";
import {isApproved, isNotApproved} from "../utils/approval.js";

export async function mathsAnswer(client, message, groupId, text) {
    const approval = await isApproved(groupId);

    async function sendAnswer(link) {
        const content = {
            image: {url: link}, caption: "Here's your solution ✨"
        };
        await client.sendMessage(groupId, content, {quoted: message});
        await client.sendPresenceUpdate('paused', groupId);
        const reactionMessage = {
            react: {
                text: "👍", key: message.key
            }
        };
        await client.sendMessage(groupId, reactionMessage);
    }

    if (approval) {
        let query = text.slice(2);
        await client.sendPresenceUpdate('composing', groupId);
        const pattern = /^([1-9]|1[0-9])\.[1-9] [1-9]|[1-7][0-9]|60$/;
        const test = pattern.test(query);
        if (test) {
            const queryArray = query.split(' ');
            const chap = queryArray[0].split('.')[0];
            const ex = queryArray[0].split('.')[1];
            const ques = queryArray[1];
            const newQuery = `${chap}-${chap}.${ex}-${ques}`;
            fs.readFile('data.json', 'utf-8', async (error, jsonString) => {
                const data = JSON.parse(jsonString);
                const data2 = JSON.parse(jsonString);
                let url = data[newQuery];
                let url2 = data2[newQuery + "-b"];
                if (url !== undefined && url2 !== undefined) {
                    await Promise.all([sendAnswer(url), sendAnswer(url2)]);
                } else if (url !== undefined && url2 === undefined) {
                    await sendAnswer(url);
                } else if (url === undefined && url2 !== undefined) {
                    await sendAnswer(url2);
                } else {
                    await client.sendMessage(groupId, {text: 'Solution not found'}, {quoted: message});
                    await client.sendPresenceUpdate('paused', groupId);
                }
            });
        } else {
            await client.sendMessage(groupId, {text: "Invalid Syntax\nPlease use the format \'M <exercise> <question>\'\nExample: \'M 6.1 3\' will return Q3 of exercise 6.1"}, {quoted: message});
            await client.sendPresenceUpdate('paused', groupId);
        }
    } else await isNotApproved(approval, client, groupId, message);
}