import axios from "axios";
import {configDB} from "../respository/harperDB.js";
import {logger} from "../../utils/logger.js";

async function isTableExisting(tableName) {
    configDB.data = JSON.stringify({
        "operation": "describe_table",
        "table": tableName,
        "schema": "dev"
    })
    const res = await axios(configDB).catch((err) => {
        logger.info(`Table ${tableName}: ${err.response.status} ${err.response.statusText}. Creating...`);
        return {status: err.response.status};
    });
    return res.status === 200;
}

async function initTable(tableName) {
    configDB.data = JSON.stringify({
        "operation": "create_table",
        "schema": "dev",
        "table": tableName,
        "hash_attribute": "id"
    })
    const res = await axios(configDB);
    return res.status === 200;
}

async function isTableCreated(tableName) {
    if (await isTableExisting(tableName)) {
        return true;
    } else {
        return await initTable(tableName)
    }
}

export async function makeTableReady(tableName) {
    return await isTableCreated(tableName)
}