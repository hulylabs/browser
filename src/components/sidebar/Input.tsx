import { createSignal } from "solid-js";
import { AppState } from "../../state";
import "./Input.css";

export default function Input(props: { app: AppState }) {
    let [input, setInput] = createSignal<string>("");

    let onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            let url = input();
            props.app.getActiveTab()?.goTo(url);
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