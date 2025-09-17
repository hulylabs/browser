import { Portal } from "solid-js/web";
import { AppState } from "../../state/state";
import { createSignal, onMount } from "solid-js";
import styles from "./NewTabInput.module.scss"

export function NewTabInput(props: { app: AppState, close: () => void }) {
    const [input, setInput] = createSignal("");
    let inputRef!: HTMLInputElement;

    onMount(() => inputRef?.focus());

    let onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            let url = input();
            props.app.newTab(url);
            setInput("");
            props.close();
        }
    }

    return <Portal>
        <div class={styles.overlay} onClick={() => props.close()}>
            <input
                ref={inputRef}
                type="text"
                value={input()}
                placeholder="Search..."
                onKeyDown={onKeyDown}
                onClick={e => e.stopPropagation()}
                onInput={e => setInput(e.currentTarget.value)}
                autofocus
                class={styles.input}
            />
        </div>
    </Portal>
}