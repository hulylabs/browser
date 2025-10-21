import styles from "./TabControls.module.scss";

import { AppState } from "../../state/state";
import { createMemo, Show } from "solid-js";
import { ArrowLeftIcon, ArrowRightIcon, RefreshCcw } from "lucide-solid";

export default function TabControls(props: { app: AppState }) {
    const activeTab = createMemo(() => props.app.tabs.getActive());

    return (
        <div class={styles.tabControls}>
            <Show when={activeTab()?.isLoading}>
                <p>Loading...</p>
            </Show>
            <ArrowLeftIcon class={styles.button} classList={{ [styles.active]: activeTab() != undefined && activeTab()?.canGoBack }} onClick={() => activeTab()?.goBack()} />
            <ArrowRightIcon class={styles.button} classList={{ [styles.active]: activeTab() != undefined && activeTab()?.canGoForward }} onClick={() => activeTab()?.goForward()} />
            <RefreshCcw class={styles.button} classList={{ [styles.active]: activeTab() != undefined }} onClick={() => activeTab()?.reload()} />
        </div >
    )
}