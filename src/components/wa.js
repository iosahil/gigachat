// Using ES6 imports

// Baileys library to connect to WhatsApp API Unofficially
import makeWASocket, {
    DisconnectReason,
    WAMessageStubType,
    makeCacheableSignalKeyStore,
    isJidBroadcast,
    isJidStatusBroadcast, isJidGroup, isJidUser
} from '@whiskeysockets/baileys';
import {Boom} from '@hapi/boom';
import NodeCache from 'node-cache';
import {logger} from "../utils/logger.js";
import {useHarperDB} from "../data/respository/harperDB.js";
import {config} from "../../config.js";
import {sendQR, sendUpdate} from "../services/tg.js";
import {capitaliseFirst} from "../utils/utils.js";
import {adminChatHandler, chatHandler} from "./chatHandler.js";
import {newGroupWelcome} from "./groupActions.js";
import {imageHandler} from "./imageHandler.js";

// Caching messages retries and media for faster response
const msgRetryCounterCache = new NodeCache();
const mediaCache = new NodeCache();

// Global variables
let isFirstRun = true;

// Automated check to enable debug mode
function checkDebug() {
    process.env.FLY_APP_NAME !== undefined ? config.botName = 'gigachatdev' : config.botName = 'gigachatdev';
    if (process.env.BOT_NAME) config.botName = process.env.BOT_NAME;
    config.debug = config.botName === "gigachatdev";
}
checkDebug();

export let bot;
async function getBotInstance() {
    if (!bot) {
        const {state} = await useHarperDB(config.botName, false);
        // const {state} = await useMultiFileAuthState(config.botName)
        const waConfig = {
            printQRInTerminal: false,
            syncFullHistory: false,
            markOnlineOnConnect: true,
            logger: logger,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger)
            },
            mediaCache: mediaCache,
            msgRetryCounterCache
        }

        // Create a new bot instance, default for ES6
        bot = makeWASocket.default(waConfig);
    }
    return bot;
}

// Connect to WA
export async function startWA() {
    try {
        // Use HarperDB to store credentials & keys
        const {saveCreds} = await useHarperDB(config.botName, false);
        // const {saveCreds} = await useMultiFileAuthState(config.botName)

        // Get the bot instance
        bot = await getBotInstance();

        // Get the bot number
        // const _jid = bot?.user?.id.split('@')[0];
        // botNum = _jid?.includes(":") ? _jid.split(':')[0] : _jid;

        bot.ev.on('connection.update', async update => {
            // Sends QR code to Telegram Chat
            if (update.qr) await sendQR(update.qr);

            // Gets connection status
            const {lastDisconnect, connection} = update;
            if (connection) logger.info("Connection Status: ", connection)
            let reason = new Boom(lastDisconnect?.error)?.output?.statusCode
            if (connection === 'close') {
                if (reason === DisconnectReason.badSession) {
                    logger.error(`Bad Session, Please Delete auth and Scan Again`)
                    process.exit()
                } else if (reason === DisconnectReason.connectionClosed) {
                    logger.warn("Connection closed, reconnecting....");
                    await startWA()
                } else if (reason === DisconnectReason.connectionLost) {
                    logger.warn("Connection Lost from Server, reconnecting...");
                    await startWA()
                } else if (reason === DisconnectReason.connectionReplaced) {
                    logger.error("Connection Replaced, Another New Session Opened, Please Close Current Session First");
                    process.exit()
                } else if (reason === DisconnectReason.loggedOut) {
                    logger.error(`Device Logged Out, Please Delete auth and Scan Again.`)
                    process.exit()
                } else if (reason === DisconnectReason.restartRequired) {
                    logger.info("Restart Required, Restarting...");
                    await startWA()
                } else if (reason === DisconnectReason.timedOut || DisconnectReason.connectionClosed) {
                    logger.info("Connection TimedOut, Reconnecting...");
                    await startWA()
                } else {
                    logger.warn(`Unknown DisconnectReason: ${reason}: ${connection}`);
                    await startWA()
                }
            } else if (connection === 'open') {
                const botNameUpper = capitaliseFirst(config.botName)
                if (isFirstRun) {
                    logger.info('Opened connection');
                    await sendUpdate(`${botNameUpper} bot is online now!`);
                } else {
                    logger.info('Connection Restarted');
                    isFirstRun = false;
                    await sendUpdate(`${botNameUpper} bot just restarted`);
                }
            }
        });

        bot.ev.on('creds.update', saveCreds);

        bot.ev.on('messages.upsert', async m => {
            if (m.type === 'append') {
                for (const msg of m.messages) {
                    // Check if bot is added to a group
                    const isBotAddedToGroup = msg.messageStubType === WAMessageStubType.GROUP_CREATE
                    if (isBotAddedToGroup) {
                        const groupId = msg.key.remoteJid;
                        logger.info(`Bot added to group ${groupId}`);
                        await newGroupWelcome(bot, groupId);
                    }
                }
            }
            // Process new messages (after the connection is established)
            if (m.type === 'notify') {
                if (!m.messages) return;
                for (const msg of m.messages) { // loop over the messages
                    let messageType;
                    try {
                        messageType = Object.keys(msg.message)[0]
                    } catch (e) {
                        logger.error(e)
                        return;
                    }
                    const key = msg.key;
                    const jid = key.remoteJid;

                    const isBroadcastMessage = isJidBroadcast(jid) || isJidStatusBroadcast(jid);
                    let fromMe = key.fromMe;

                    const flag = !isBroadcastMessage && !fromMe && !key?.participant.includes("44770016"); // Check if a message is not from self or broadcast
                    if (flag) {
                        await bot.readMessages([key]); // Mark all as read
                        // Extract text from the message
                        let text;
                        switch (messageType) {
                            case 'conversation':
                                text = msg.message.conversation;
                                break;
                            case 'ephemeralMessage':
                                text = msg.message.ephemeralMessage?.message?.extendedTextMessage?.text;
                                break;
                            case 'extendedTextMessage':
                                text = msg.message.extendedTextMessage?.text;
                                break;
                            case 'imageMessage':
                                if (isJidGroup(jid)) await imageHandler(msg, bot, jid)
                                return;
                            default:
                                break;
                        }
                        if (text !== undefined) { // Check if the message is a text message

                            if (isJidUser(jid)) { // Check if the message is from a user (DM)
                                logger.info("Received DM from " + jid.split('@')[0]);
                                // Disabled due to WhatsApp restrictions
                                // Note: Overuse of this feature can lead to a ban from WhatsApp
                                const userId = key.remoteJid;
                                await bot.sendMessage(userId,
                                    {text: "Hello, I am a bot. I am currently in development. Please wait for the next update."},
                                    {quoted: msg});

                            } else if (isJidGroup(jid)) {
                                const groupId = jid;
                                const sender = key.participant;
                                const isSenderAdmin = sender === "919931004934@s.whatsapp.net";
                                logger.info(sender.split('@')[0] + ": " + text);
                                if (isSenderAdmin) {
                                    await adminChatHandler(text, groupId, bot, msg);
                                    await chatHandler(text, groupId, bot, msg);
                                } else {
                                    await chatHandler(text, groupId, bot, msg);
                                }
                            }
                        }
                    }
                }
            }
        })
    } catch (err) {
        console.error(err);
        const botNameUpper = capitaliseFirst(config.botName)
        await sendUpdate(`Error Occurred in ${botNameUpper}:\n${err}`);
        await startWA();
    }
}
