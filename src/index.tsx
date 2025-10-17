/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import { warn, debug, info, error } from '@tauri-apps/plugin-log';


if (!import.meta.env.DEV) {
    document.oncontextmenu = (event) => {
        event.preventDefault()
    }
}

function forwardConsole(
    fnName: 'log' | 'debug' | 'info' | 'warn' | 'error',
    logger: (message: string) => Promise<void>
) {
    const original = console[fnName];
    console[fnName] = (message) => {
        original(message);
        logger(message);
    };
}

forwardConsole('log', info);
forwardConsole('debug', debug);
forwardConsole('info', info);
forwardConsole('warn', warn);
forwardConsole('error', error);

render(() => <App />, document.getElementById("root") as HTMLElement);