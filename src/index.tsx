/* @refresh reload */
import { render } from "solid-js/web";
import { getCurrentWindow } from '@tauri-apps/api/window';
import App from "./App";


render(() => <App />, document.getElementById("root") as HTMLElement);

const appWindow = getCurrentWindow();

document
    .getElementById('titlebar-minimize')
    ?.addEventListener('click', () => appWindow.minimize());
document
    .getElementById('titlebar-maximize')
    ?.addEventListener('click', () => appWindow.toggleMaximize());
document
    .getElementById('titlebar-close')
    ?.addEventListener('click', () => appWindow.close());
