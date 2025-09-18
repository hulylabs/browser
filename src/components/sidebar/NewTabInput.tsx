import { Portal } from "solid-js/web";
import { AppState } from "../../state/state";
import { createSignal, onMount, For } from "solid-js";
import styles from "./NewTabInput.module.scss"
import { HistoryIcon, SearchIcon } from "lucide-solid";
import { Separator } from "@kobalte/core/separator";

export function NewTabInput(props: { app: AppState, close: () => void }) {
    const [input, setInput] = createSignal("");
    let inputRef!: HTMLInputElement;

    const searchHistory = [
        "github.com",
        "stackoverflow.com",
        "developer.mozilla.org",
        "typescript handbook",
        "solid-js documentation",
        "css grid tutorial",
    ];

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

    const handleHistoryClick = (historyItem: string) => {
        props.app.newTab(historyItem);
        props.close();
    }

    return <Portal>
        <div class={styles.overlay} onClick={() => props.close()}>
            <div class={styles.searchContainer} onClick={e => e.stopPropagation()}>
                <div class={styles.inputContainer}>
                    <SearchIcon size={24} class={styles.icon} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={input()}
                        placeholder="Search..."
                        onKeyDown={onKeyDown}
                        onInput={e => setInput(e.currentTarget.value)}
                        autofocus
                        class={styles.input}
                    />
                </div>
                <Separator class={styles.separator} />
                <div class={styles.historyContainer}>
                    <For each={searchHistory}>
                        {(item) => (
                            <div class={styles.historyItem} onClick={() => handleHistoryClick(item)}>
                                <HistoryIcon size={20} class={styles.icon} />
                                <span class={styles.historyText}>{item}</span>
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </div>
    </Portal>
}