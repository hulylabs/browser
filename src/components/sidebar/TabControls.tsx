import styles from "./TabControls.module.scss";

import { AppState } from "../../state";
import { Icon, Icons } from "../Icon";
import { createMemo, Show } from "solid-js";

export default function TabControls(props: { app: AppState }) {
    const activeTab = createMemo(() => props.app.getActiveTab());

    return (
        <div class={styles.tabСontrols}>
            <Show when={activeTab()?.isLoading}>
                <p>Loading...</p>
            </Show>
            <Icon icon={Icons.Back} class={styles.button} classList={{ [styles.active]: activeTab() != undefined && activeTab()?.canGoBack }} onClick={() => activeTab()?.goBack()} />
            <Icon icon={Icons.Forward} class={styles.button} classList={{ [styles.active]: activeTab() != undefined && activeTab()?.canGoForward }} onClick={() => activeTab()?.goForward()} />
            <Icon icon={Icons.Reload} class={styles.button} classList={{ [styles.active]: activeTab() != undefined }} onClick={() => activeTab()?.reload()} />
        </div >
    )
}