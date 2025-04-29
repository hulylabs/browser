/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";

if (!import.meta.env.DEV) {
    document.oncontextmenu = (event) => {
        event.preventDefault()
    }
}
render(() => <App />, document.getElementById("root") as HTMLElement);