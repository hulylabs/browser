import styles from "./Input.module.scss";

import { createEffect, createMemo, createSignal } from "solid-js";
import { AppState } from "../../state/state";

export default function Input(props: { app: AppState }) {
    let [input, setInput] = createSignal<string>("");

    let activeTabMemo = createMemo(() => props.app.getActiveTab());

    createEffect(() => {
        const activeTab = activeTabMemo();
        if (activeTab) {
            setInput(activeTab.url);
        } else {
            setInput("");
        }
    });

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
        <div class={styles.wrapper}>
            <input
                class={styles.input}
                spellcheck="false"
                type="text"
                placeholder="Search..."
                onInput={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                value={input()} />
        </div>
    );
}