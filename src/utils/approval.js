import axios from "axios";

import {getConfigDB} from "../data/respository/harperDB.js";
import {getGroupLink} from "../components/groupActions.js";
import {config} from "../../config.js";
import {logger} from "./logger.js";

export async function isApproved(groupId) {
    const configDB = await getConfigDB();
    configDB.data = JSON.stringify({
        "operation": "search_by_hash",
        "schema": "dev",
        "table": "groups",
        "hash_values": [
            groupId
        ],
        "get_attributes": [
            "approved"
        ]
    });
    let isApproved = undefined;
    await axios(configDB).then(function (response) {
        isApproved = response.data[0]?.approved;
    }).catch((err) => logger.error(err))
    return isApproved;
}

export async function isNotApproved(approval, client, groupId, message) {
    if (approval === undefined) {
        const formUrl = await getGroupLink(client, groupId);
        if (formUrl !== false) {
            await client.sendMessage(groupId, {text: "This group hasn't yet been approved.\nPlease ask the admin to fill the quick form if not yet.\n" + formUrl}, {quoted: message})
        } else {
            await client.sendMessage(groupId, {
                text: `Sorry, but this group is ineligible to use GigaChat.
GigaChat requires group to be with more than ${config.leastMembers.toString()} members to continue.`
            }, {quoted: message})
        }
    } else if (!approval) {
        await client.sendMessage(groupId, {text: "Sorry, but this group is declined to use GigaChat.\nIf you think that's an error, please contact wa.me/919931004934"}, {quoted: message})
    }
}