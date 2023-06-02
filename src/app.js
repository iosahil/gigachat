import { startWA } from './components/wa.js';
import {listenToTGButtons} from "./services/tg.js";
import {initServer} from "./services/server.js";

export async function startApp() {
    listenToTGButtons();
    await initServer();
    await startWA().catch(err => console.error(err));
}