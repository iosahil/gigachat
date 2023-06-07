import {isApproved} from "../utils/approval.js";
import {encrypt} from "../utils/utils.js";
import {groupDB} from "../data/respository/harperDB.js";
import {config} from "../../config.js";
import {bot} from "./wa.js";
import {logger} from "../utils/logger.js";

export async function getGroupLink(bot, groupId) {
    const groupData = await getGroupData(bot, groupId);
    const groupLength = groupData.groupLength;
    const groupName = groupData.groupName.toString();
    if (groupLength >= config.leastMembers) {
        const input = `${groupId}--${groupName}`
        const encrypted = encrypt(input);
        return `https://gigachat.kiit.study/access?id=${encrypted}`;
    } else {
        return false;
    }
}

export async function getGroupData(client, groupId) {
    const groupData = await client.groupMetadata(groupId);
    const groupLength = groupData.participants.length;
    const groupAdmins = groupData.participants.filter((participant) => participant.isAdmin);
    const groupName = groupData.subject;
    return {groupLength, groupAdmins, groupName};
}

export async function newGroupWelcome(bot, groupId) {
    const groupData = await getGroupData(bot, groupId);
    const groupLength = groupData.groupLength;
    const groupName = groupData.groupName.toString();
    const approval = await isApproved(groupId);
    if (approval === undefined) {
        if (groupLength >= config.leastMembers) {
            const input = `${groupId}--${groupName}`
            const encrypted = encrypt(input);
            const formUrl = `https://gigachat.kiit.study/access?id=${encrypted}`;
            const messageText = {
                text: "Hey everyone! 👋\n" +
                    "I'm GigaChat, a WhatsApp bot built to solve educational problems.\n" +
                    "To activate the bot, just fill out this quick form:\n" + formUrl
            }
            await bot.sendMessage(groupId, messageText);
        } else {
            await bot.sendMessage(groupId,
                {
                    text: `Sorry, GigaChat can't work in groups with less than ${config.leastMembers.toString()} members.` +
                        "Please add me to a group with more than 5 members and try again."
                });
            await bot.groupLeave(groupId);
        }
    } else if (approval === false) {
        await bot.sendMessage(groupId, {text: "Sorry, this group access has been denied.\nIf you think this was an error, please contact wa.me/919931004934"});
        await bot.groupLeave(groupId);
    }
}

export async function approveGroup(groupId) {
    await groupDB(groupId, true);
    try {
        await bot.sendMessage(groupId, {text: "Congrats, Your group has been approved! 🥳"});
        await bot.sendMessage(groupId, {
            text: "Now, anyone here can access the features of GigaChat!" +
                "\nTo get started, type ```help``` or just ```h``` in the group."
        });
    } catch (e) {
        console.error(e);
    }
}

export async function denyGroup(groupId) {
    await groupDB(groupId, false);
    try {
        await bot.sendMessage(groupId, {text: "Your group has been declined!\nPlease contact wa.me/919931004934 if you have any questions."});
        await bot.groupLeave(groupId);
    } catch (e) {
        logger.error(e);
    }
}

export async function removeGroup(groupId) {
    await groupDB(groupId, false);
    try {
        await bot.sendMessage(groupId, {text: "Your group has been removed!\nPlease contact wa.me/919931004934 if you have any questions."});
        await bot.groupLeave(groupId);
    } catch (e) {
        console.error(e);
    }
}