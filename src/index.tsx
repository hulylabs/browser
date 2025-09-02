/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import { setConfig } from "cef-client";

if (!import.meta.env.DEV) {
    document.oncontextmenu = (event) => {
        event.preventDefault()
    }
}

setConfig({ logging: false, defaultUrl: "data:text/html,<html><head><title>New Tab</title></head><body></body></html>" })

render(() => <App />, document.getElementById("root") as HTMLElement);