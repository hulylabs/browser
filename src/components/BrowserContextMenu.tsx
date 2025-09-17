import { ContextMenu } from "@kobalte/core/context-menu";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-solid";
import styles from "./BrowserContextMenu.module.scss";
import { AppState } from "../state/state";
import { createMemo, JSX, Show } from "solid-js";

function BrowserContextMenu(props: { app: AppState, children: JSX.Element }) {
    let activeTabMemo = createMemo(() => props.app.getActiveTab());
    let openNewTab = () => {
        let url = activeTabMemo()?.hoveredUrl;
        if (url && url !== "") {
            props.app.newTab(url);
        }
    }

    return (
        <ContextMenu>
            <ContextMenu.Trigger class={styles.trigger}>
                {props.children}
            </ContextMenu.Trigger>
            <ContextMenu.Portal>
                <ContextMenu.Content class={styles.content}>
                    <ContextMenu.Arrow class={styles.arrow} />
                    <Show when={activeTabMemo() !== null && activeTabMemo()?.hoveredUrl !== ""}>
                        <ContextMenu.Item
                            class={styles.item}
                            onSelect={openNewTab}
                        >
                            <span class={styles.label}>Open in a new tab</span>
                        </ContextMenu.Item>
                    </Show>

                    <ContextMenu.Item
                        class={styles.item}
                        disabled={!activeTabMemo()?.canGoBack}
                        onSelect={activeTabMemo()?.goBack}
                    >
                        <ArrowLeft size={16} class={styles.icon} />
                        <span class={styles.label}>Back</span>
                    </ContextMenu.Item>

                    <ContextMenu.Item
                        class={styles.item}
                        disabled={!activeTabMemo()?.canGoForward}
                        onSelect={activeTabMemo()?.goForward}
                    >
                        <ArrowRight size={16} class={styles.icon} />
                        <span class={styles.label}>Forward</span>
                    </ContextMenu.Item>

                    <ContextMenu.Separator class={styles.separator} />

                    <ContextMenu.Item
                        class={styles.item}
                        onSelect={activeTabMemo()?.reload}
                    >
                        <RotateCcw size={16} class={styles.icon} />
                        <span class={styles.label}>Reload</span>
                    </ContextMenu.Item>
                </ContextMenu.Content>
            </ContextMenu.Portal>
        </ContextMenu >
    );
};

export default BrowserContextMenu;
