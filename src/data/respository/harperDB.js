import {BufferJSON, initAuthCreds, WAProto as proto} from "@whiskeysockets/baileys"
import {makeTableReady} from "../store/db.js";
import axios from "axios";
import path from "path";
import fs from "fs/promises";

export let configDB;
export function getConfigDB() {
    if (!configDB) {
        configDB = {
            method: "post",
            url: process.env.HARPERDB_URL,
            headers: {
                "Content-Type": "application/json",
                Authorization: process.env.HARPERDB_AUTH,
            }
        }
    }
    return configDB;
}

let authTableReady = false;
export async function useHarperDB(sessionID, saveOnlyCreds = true) {
    const localFolder = path.join(process.cwd(), 'sessions', sessionID)
    configDB = getConfigDB();
    if (!authTableReady) authTableReady = await makeTableReady('auth_keys');

    const localFile = (key) => path.join(localFolder, (fixFileName(key) + '.json'))
    if (saveOnlyCreds) await fs.mkdir(localFolder, { recursive: true });
    async function writeData(data, key) {
        const dataString = JSON.stringify(data, BufferJSON.replacer);
        if (saveOnlyCreds && key !== 'creds') {
            await fs.writeFile(localFile(key), dataString)
            return;
        }
        await upsertAuthKey(sessionID, key, dataString)
    }

    async function readData(key) {
        try {
            let rawData;
            if (saveOnlyCreds && key !== 'creds') {
                rawData = await fs.readFile(localFile(key), { encoding: 'utf-8' })
            } else {
                rawData = await getAuthKey(sessionID, key)
            }
            return JSON.parse(rawData, BufferJSON.reviver);
        } catch (error) {
            return null;
        }
    }

    async function removeData(key) {
        try {
            if (saveOnlyCreds && key !== 'creds') {
                await fs.unlink(localFile(key))
            } else {
                await deleteAuthKey(sessionID, key)
            }
        } catch (error) {
            console.error("Error while removing data:\n" + error)
        }
    }

    let creds = await readData('creds');
    if (!creds) {
        creds = await initAuthCreds();
        await writeData(creds, "creds");
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(ids.map(async (id) => {
                        let value = await readData(`${type}-${id}`);
                        if (type === 'app-state-sync-key' && value) {
                            value = proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value;
                    }));
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            tasks.push(value ? writeData(value, key) : removeData(key));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => {
            return writeData(creds, 'creds');
        }
    };
}

async function upsertAuthKey(botId, keyId, keyJson) {
    const id = `${botId}----${keyId}`
    const record = {
        id: id,
        key_json: keyJson
    };

    const data = JSON.stringify({
        operation: "upsert",
        schema: "dev",
        table: "auth_keys",
        records: [record]
    });

    try {
        configDB.data = data
        await axios(configDB);
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

const fixFileName = (file) => {
    if (!file) {
        return undefined;
    }
    return file.replace(/\//g, '__').replace(/:/g, '-');
}

// Function that fetches a record from the auth_keys table
async function getAuthKey(botId, keyId) {
    const id = `${botId}----${keyId}`
    configDB.data = JSON.stringify({
        "operation": "search_by_hash",
        "schema": "dev",
        "table": "auth_keys",
        "hash_values": [
            id
        ],
        "get_attributes": [
            "key_json"
        ]
    });
    const res = await axios(configDB)
    if (res.status === 200) {
        const rows = res.data;
        return rows.length > 0 ? rows[0].key_json : null;
    } else return null;
}

// Function that deletes a record from the auth_keys table
async function deleteAuthKey(botId, keyId) {
    const id = `${botId}----${keyId}`
    configDB.data = JSON.stringify({
        "operation": "delete",
        "table": "auth_keys",
        "schema": "dev",
        "hash_values": [
            id
        ]
    });
    const res = await axios(configDB)
    return res.status === 200
}

export async function groupDB(groupId, approval = true) {
    configDB.data = JSON.stringify({
        "operation": "upsert",
        "schema": "dev",
        "table": "groups",
        "records": [
            {
                "groupId": groupId,
                "approved": approval
            }
        ]
    });
    await axios(configDB)
}

export async function setPref(groupId, imageFeat = false) {
    configDB.data = JSON.stringify({
        "operation": "upsert",
        "schema": "dev",
        "table": "groups",
        "records": [
            {
                "groupId": groupId,
                "imageFeat": imageFeat
            }
        ]
    });
    return axios(configDB);
}
export async function getPref(groupId) {
    configDB.data = JSON.stringify({
        "operation": "search_by_hash",
        "schema": "dev",
        "table": "groups",
        "hash_values": [
            groupId
        ],
        "get_attributes": [
            "imageFeat"
        ]
    });
    const res = await axios(configDB)
    return res.data[0].imageFeat
}