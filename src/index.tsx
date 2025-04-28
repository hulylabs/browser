/* @refresh reload */
import { render } from "solid-js/web";
import AppComponent from "./App";

if (!import.meta.env.DEV) {
    document.oncontextmenu = (event) => {
        event.preventDefault()
    }
}
render(() => <AppComponent />, document.getElementById("root") as HTMLElement);