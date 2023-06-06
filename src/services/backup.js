import {Configuration, OpenAIApi} from "openai";
import {logger} from "../utils/logger.js";
import axios from "axios";

export async function askBackup2(message) {
    const foxConfig = new Configuration({
        apiKey: process.env.BACKUP_FOXKEY,
        basePath: "https://api.hypere.app"
    });
    const fox = new OpenAIApi(foxConfig)

    try {
        const completion = await fox.createChatCompletion({
            model: "gpt-3.5-turbo", // Only GPT-3 free from Fox
            messages: message,
        })
        return completion.data.choices[0].message?.content ?? completion.data.choices[0].message;
    } catch (e) {
        logger.error(e)
        return undefined;
    }
}

export async function askBackup3(message, useGPT4 = false) {
    const model = useGPT4 ? "gpt-4" : "gpt-3.5-turbo"
    const catConfig = new Configuration({
        apiKey: process.env.BACKUP_CATTOKEY,
        basePath: "https://api.cattto.repl.co/v1",
    });

    const cat = new OpenAIApi(catConfig);
    try {
        const completion = await cat.createChatCompletion({
            model: model, // Only GPT-3 free from Fox
            messages: message,
        })
        return completion.data.choices[0].message?.content ?? completion.data.choices[0].message;
    } catch (e) {
        logger.error(e)
        return undefined
    }
}

export async function askBackup1(message, useGPT4 = false) {
    try {
        const model = useGPT4 ? "gpt-4" : "gpt-3.5-turbo"
        const response = await axios.post(
            'https://api.pawan.krd/v1/chat/completions', {
                'model': model,
                'max_tokens': 450,
                'messages': message
            },
            {
                headers: {
                    'Authorization': 'Bearer ' + process.env.BACKUP_PAWANKEY,
                    'Content-Type': 'application/json'
                }
            }
        );
        if (response.status !== 200) return undefined;
        return response.data.choices[0].message?.content ?? response.data.choices[0].message;
    } catch (e) {
        logger.error(e)
        return undefined
    }
}