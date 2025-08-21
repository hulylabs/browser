import { createMemo, createSignal } from "solid-js";
import { AppState } from "../../state/state";
import "./Input.css";

export default function Input(props: { app: AppState }) {
    let [input, setInput] = createSignal<string>("");

    let activeTabMemo = createMemo(() => props.app.getActiveTab());

    let onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            let url = input();

            let activeTab = activeTabMemo();
            if (activeTab)
                activeTab.goTo(url);
            else
                props.app.newTab(url);
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