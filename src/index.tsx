/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import { AppState } from "./state/state";
import { invoke } from "@tauri-apps/api/core";
import { connect } from "cef-client";
import { ProfileManager } from "./state/profiles";

if (!import.meta.env.DEV) {
    document.oncontextmenu = (event) => {
        event.preventDefault()
    }
}

function ErrorScreen({ error }: { error: string }) {
    return (
        <div style={{
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'justify-content': 'center',
            height: '100vh',
            padding: '20px',
            'text-align': 'center',
            'background-color': '#f5f5f5'
        }}>
            <h2 style={{ color: '#d32f2f', 'margin-bottom': '16px' }}>
                Application Error
            </h2>
            <p style={{ 'max-width': '600px', 'line-height': '1.5' }}>
                {error}
            </p>
        </div>
    )
};

function renderError(message: string) {
    render(
        () => <ErrorScreen error={message} />,
        document.getElementById("root") as HTMLElement
    );
}

interface Arguments {
    profiles_enabled: boolean;
    cef_manager: string;
    cef: string;
}

async function initApp() {
    const args: Arguments = await invoke('get_args');

    if (!args.profiles_enabled) {
        await connect(args.cef).then((browser) => {
            let state = new AppState(browser);
            render(() => <App app={state} />, document.getElementById("root") as HTMLElement);
        }).catch(() => {
            renderError(`Failed to connect to Huly CEF. Address: ${args.cef}`);
        });
    } else {
        let profileManager = new ProfileManager(args.cef_manager);
        await profileManager.getProfiles().then(async (profiles) => {
            if (profiles.length == 0) {
                renderError('No profiles found');
                return;
            }

            profileManager.setSelected(profiles[0]);
            let client = await profileManager.connect(profiles[0]);
            let state = new AppState(client, profileManager);
            render(() => <App app={state} />, document.getElementById("root") as HTMLElement);
        }).catch(() => renderError(`Failed to load profiles. Huly CEF Manager address: ${args.cef_manager}`));
    };
}

await initApp();