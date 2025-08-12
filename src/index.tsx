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

function renderError(message: string) {
    const rootElement = document.getElementById("root") as HTMLElement;
    rootElement.innerHTML = `
        <div style="
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            font-family: Arial, sans-serif;
            background-color: #f8f9fa;
        ">
            <div style="
                background: white; 
                padding: 2rem; 
                border-radius: 8px; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 500px;
                text-align: center;
            ">
                <h2 style="color: #dc3545; margin-bottom: 1rem;">Error</h2>
                <p style="color: #6c757d; margin: 0;">${message}</p>
            </div>
        </div>
    `;
}

async function initApp() {
    const matches = await getMatches();
    console.log(matches);
    let managerAddress = matches.args["cef-manager"].value;
    if (!managerAddress || typeof managerAddress !== "string") {
        renderError("CEF manager address is not provided in the arguments. Please use --cef-manager http://host:port");
        return;
    }

    let state = new AppState(managerAddress, true);
    render(() => <App app={state} />, document.getElementById("root") as HTMLElement);
}

initApp();