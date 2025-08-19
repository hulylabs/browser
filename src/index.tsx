/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import { AppState } from "./state";
import { invoke } from "@tauri-apps/api/core";

if (!import.meta.env.DEV) {
    document.oncontextmenu = (event) => {
        event.preventDefault()
    }
}

interface Arguments {
    cef_manager: string;
    cef: string;
}

async function initApp() {
    const args: Arguments = await invoke('get_args');
    let state = new AppState(args.cef_manager);
    
    if (args.cef !== "") {
        state.setCefAddress(args.cef);
    }

    render(() => <App app={state} />, document.getElementById("root") as HTMLElement);
}

initApp();