import {default as Pino} from "pino";
import {config} from "../../config.js";

let loggerInstance;
function getLoggerInstance() {
    if (!loggerInstance) {
        loggerInstance = Pino({
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    colorizeObjects: true
                }
            },
            level: config.debug ? 'debug' : 'info'
        });
    }
    return loggerInstance;
}
export const logger = getLoggerInstance();