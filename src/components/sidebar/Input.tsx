import { createSignal } from "solid-js";
import { App } from "../../app";
import "./Input.css";

export default function Input(props: { app: App }) {
    let [input, setInput] = createSignal<string>("");

    let onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            let url = input();
            props.app.getActiveTab().goto(url);
        }
    }

    return (
        <div class="input-wrapper">
            <input
                class="input"
                type="text"
                placeholder="Search..."
                onInput={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                value={input()} />
        </div>
    );
}