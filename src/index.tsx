/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import { setConfig } from "cef-client";

if (!import.meta.env.DEV) {
    document.oncontextmenu = (event) => {
        event.preventDefault()
    }
}

setConfig({ logging: false, defaultUrl: "huly://newtab" })

render(() => <App />, document.getElementById("root") as HTMLElement);