import styles from "./Input.module.scss";

import { createEffect, createMemo, createSignal, onMount } from "solid-js";
import { AppState } from "../../state/state";

export default function Input(props: { app: AppState }) {
    let ref!: HTMLInputElement;
    let [input, setInput] = createSignal<string>("");
    let activeTabMemo = createMemo(() => props.app.tabs.getActive());

    onMount(() => {
        props.app.ui.setFocusUrlCallback(() => ref.focus());
    })

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
                props.app.tabs.new(url);
        }
    }

    return (
        <div class={styles.wrapper}>
            <input
                ref={ref}
                class={styles.input}
                spellcheck="false"
                type="text"
                placeholder="Search..."
                tabindex="-1"
                onInput={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                value={input()} />
        </div>
    );
}