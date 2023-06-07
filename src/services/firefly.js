import axios from "axios";
import {v4 as uuidv4} from 'uuid';
import {random} from "../utils/utils.js";
import { default as FormData } from "form-data"
import {logger} from "../utils/logger.js";

const session = {
    session_id: "",
    expires_at: 0,
}

async function createSession(duration = 3600) {
    const url = 'https://sensei-ue1.adobe.io/services/session/create';

    const form_data = new FormData();
    form_data.append('contentAnalyzerRequests', JSON.stringify({session_ttl: duration}));

    const config = {
        headers: {
            'Origin': 'https://firefly.adobe.com',
            'Accept': 'multipart/form-data',
            'Authorization': 'Bearer ' + process.env.FIREFLY_TOKEN,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) ',
            'x-api-key': 'clio-playground-web'
        },
    };

    try {
        const resp = await axios.post(url, form_data, config);

        const sessionId = resp.headers['x-session-id'] || '';

        if (sessionId) {
            const expiresAt = Math.floor(Date.now() / 1000) + duration;
            session.session_id = sessionId;
            session.expires_at = expiresAt;
        }
    } catch (err) {
        if (err?.response?.status === 401) {
            logger.error('Bearer auth token is invalid.');
        }
        logger.error('Bearer auth token is invalid.');
    }
}

async function getSession() {
    if (!session.session_id || session.expires_at < Math.floor(Date.now() / 1000)) {
        await createSession();
        return session;
    }
    return session;
}

export async function generateImage(prompt = "A girl playing with her toy") {
    await getSession();
    const data = {
        graph: {
            uri: "urn:graph:Text2Image_v3",
        },
        params: [
            {
                name: "gi_OUTPUT_HEIGHT",
                value: 1024,
                type: "scalar"
            },
            {
                name: "gi_OUTPUT_WIDTH",
                value: 1024,
                type: "scalar"
            },
            {
                name: "gt_SEED",
                value: [
                    {
                        name: "0",
                        value: random(0, 100000),
                        type: "scalar"
                    }
                ],
                type: "array"
            },
            {
                name: "gi_USE_FACE_FIX",
                value: true,
                type: "boolean"
            },
            {
                name: "gi_ADVANCED",
                value: "{}",
                type: "string"
            }
        ],
        inputs: {
            gt_PROMPT: {
                id: uuidv4(),
                toStore: {lifeCycle: "session"},
                type: "string",
                value: prompt,
            },
        },
        outputs: {
            gt_GEN_IMAGE: {
                type: "array",
                expectedMimeType: "image/jpeg",
                expectedArrayLength: 1,
                id: uuidv4(),
            },
            gt_GEN_STATUS: {
                type: "array",
                id: uuidv4(),
            },
        },
    };
    const formData = new FormData();

    formData.append('request', JSON.stringify(data), {
        filename: 'blob',
        contentType: 'application/json',
    });
    try {
        const response = await axios.post('https://firefly.adobe.io/spl', formData, {
            headers: {
                'Host': 'firefly.adobe.io',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
                'Authorization': 'Bearer ' + process.env.FIREFLY_TOKEN,
                'X-Api-Key': 'clio-playground-web',
                'X-Request-Id': uuidv4(),
                'X-Session-Id': session.session_id,
                'Origin': 'https://firefly.adobe.com',
                ...formData.getHeaders()
            },
            responseEncoding: 'latin1'
        })

        const boundary = "--" + response.headers['content-type'].split(';')[1].split('=')[1];
        const body = response.data.toString();

        const parts = body.split(boundary);
        for (const part of parts) {
            if (part.includes('Content-Type: image/jpeg')) {
                const image_data = part.split('"\r\n\r\n')[1];
                return Buffer.from(image_data, 'latin1');
            }
        }
    } catch (e) {
        logger.error(e);
    }
}