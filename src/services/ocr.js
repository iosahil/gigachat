import {AzureKeyCredential, DocumentAnalysisClient} from "@azure/ai-form-recognizer";
import {logger} from "../utils/logger.js";

let azureClientInstance;
function getAzureClient() {
    if (!azureClientInstance) {
        azureClientInstance = new DocumentAnalysisClient(
            process.env.AZURE_ENDPOINT,
            new AzureKeyCredential(process.env.AZURE_KEY)
        );
    }
    return azureClientInstance;
}
export async function ocr(buffer) {
    try {
        const azureClient = getAzureClient();
        const poller = await azureClient.beginAnalyzeDocument("prebuilt-read", buffer);
        const {content} = await poller.pollUntilDone();
        return content;
    } catch (error) {
        logger.error(error);
        return undefined;
    }
}