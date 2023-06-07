import Replicate from "replicate";
import {config} from "../../config.js";
import {logger} from "../utils/logger.js";

let replicateInstance;
function getReplicateInstance() {
    if (!replicateInstance) {
        replicateInstance = new Replicate({
            auth: process.env.REPLICATE_TOKEN
        });
    }
    return replicateInstance;
}

export async function getImageDesc(imageUrl = "https://picsum.photos/id/27/367/267", prompt = undefined, myModel = config.modelNum - 1) {
    const replicate = getReplicateInstance();
    if (prompt === "" || undefined) prompt = "Describe the image briefly in a very detailed manner."
    const models = {
        "owl": "joehoover/mplug-owl:51a43c9d00dfd92276b2511b509fcb3ad82e221f6a9e5806c54e69803e291d6b",
        "minigpt": "daanelson/minigpt-4:b96a2f33cc8e4b0aa23eacfce731b9c41a7d9466d9ed4e167375587b54db9423",
        "blip": "joehoover/instructblip-vicuna13b:c4c54e3c8c97cd50c2d2fec9be3b6065563ccf7d43787fb99f84151b867178fe"
    }
    const model = Object.values(models)[myModel];
    // const modelName = Object.keys(models)[myModel];
    let input = {prompt: prompt, img: imageUrl}
    if (myModel === 1) input = {prompt: prompt, image: imageUrl, num_beams: 6, temperature: 1.01}
    try {
        const output = await replicate.run(
            model,
            {
                input: input
            }
        );
        if (output.length <= 2 || output.join("") === "") {
            if (myModel === 2) await getImageDesc(imageUrl, prompt, myModel);
            else return "Sorry, I couldn't understand the image. Please try again."
        }
        if (typeof output === "string") return output;
        return output.join("");
    } catch (e) {
        logger.error(e);
        return undefined;
    }
}
