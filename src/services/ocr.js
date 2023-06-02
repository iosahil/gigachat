import {AzureKeyCredential, DocumentAnalysisClient} from "@azure/ai-form-recognizer";

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
        console.log(error);
        return undefined;
    }
}