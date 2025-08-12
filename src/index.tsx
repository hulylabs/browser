/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import { getMatches } from "@tauri-apps/plugin-cli";
import { AppState } from "./state";

if (!import.meta.env.DEV) {
    document.oncontextmenu = (event) => {
        event.preventDefault()
    }
}
async function initApp() {
    const matches = await getMatches();
    console.log(matches);
    let managerAddress = matches.args["cef-manager"].value;
    if (!managerAddress || typeof managerAddress !== "string") {
        console.warn("Huly CEF Manager address is not set. Using default: http://localhost:3000");
        managerAddress = "http://localhost:3000";
    }

    let state = new AppState(managerAddress);
    render(() => <App app={state} />, document.getElementById("root") as HTMLElement);
}

initApp();