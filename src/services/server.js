import http from "http";
import {sendUpdate} from "./tg.js";
import {logger} from "../utils/logger.js";

export async function initServer() {
    const port = process.env.PORT || "3000";

    const server = http.createServer(async (req, res) => {
        res.statusCode = 200;
        res.end('Hello, world!');
        if (req.method === 'POST' && req.url === '/webhook') {
            let body = '';

            req.on('data', (chunk) => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                const data = JSON.parse(body);
                try {
                    function extractAnswers(data) {
                        const answers = data.form_response.answers;
                        const fields = data.form_response.definition.fields;
                        const fieldMap = fields.reduce((acc, field) => {
                            acc[field.ref] = field.id;
                            return acc;
                        }, {});

                        return answers.reduce((acc, answer) => {
                            const fieldId = fieldMap[answer.field.ref];

                            switch (answer.type) {
                                case "text":
                                case "phone_number":
                                case "email":
                                    acc[fieldId] = answer[answer.type];
                                    break;
                                case "boolean":
                                    acc[fieldId] = answer.boolean;
                                    break;
                                case "choice":
                                    acc[fieldId] = answer.choice.label;
                                    break;
                            }
                            return acc;
                        }, {});
                    }

                    const extractedData = extractAnswers(data);
                    const answers = {
                        groupId: data.form_response?.hidden?.group_id,
                        groupName: data.form_response?.hidden?.group_name,
                        name: extractedData["XxlaDP5ARJy4"],
                        phone: extractedData["8YqXCuxjYw0l"],
                        need: extractedData["yyfgshrHh5b9"],
                        groupInterested: extractedData["i794FBewmX3I"],
                        mail: extractedData["SytFST7cbljS"],
                        agree: extractedData["QYj1thvgkRYQ"],
                    }
                    if (answers.agree !== undefined && answers.agree === true) {
                        let isNeed = answers.need !== undefined && answers.need !== '';
                        let isGroupInterested = answers.groupInterested !== undefined && answers.groupInterested === true;
                        let message = `🛎️ <b>New Group Access Request</b>\n\n<b>Group Name:</b> ${answers.groupName}\n<b>Group ID:</b> ${answers.groupId}\n\n<b>Name:</b> ${answers.name}\n<b>Phone:</b> ${answers.phone}\n<b>WhatsApp</b>: ${"wa.me/" + answers.phone.toString()}`
                            + (isNeed ? `\n<b>Need:</b>\n<code>${answers.need}</code>` : '')
                            + (isGroupInterested ? `\n\n<b>Interested in Group:</b> True\n<b>Email</b>: ${answers.mail}` : '')
                            + `\n\n<b>Status:</b> Awaiting Approval`;
                        const opts = {
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        {
                                            text: 'Deny',
                                            callback_data: `{"groupId": "${answers.groupId}", "action": "deny"}`
                                        },
                                        {
                                            text: 'Approve',
                                            callback_data: `{"groupId": "${answers.groupId}", "action": "approve"}`
                                        }
                                    ]
                                ]
                            },
                            parse_mode: 'HTML',
                            disable_web_page_preview: true
                        };
                        await sendUpdate(message, opts);
                    }
                } catch (e) {
                    logger.error(e);
                }
                res.statusCode = 200;
                res.end('OK');
            });
        }
    })
    server.listen(port, () => {
        logger.info(`Server running on port ${port}`);
    });
}
