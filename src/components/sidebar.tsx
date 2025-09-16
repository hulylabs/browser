import { createResource, For, Show } from "solid-js";
import { ResizablePane } from "./ResizablePane";
import TabControls from "./sidebar/TabControls";
import Input from "./sidebar/Input";
import { Profiles } from "./sidebar/Profiles";
import Tab from "./sidebar/Tab";
import { AppState } from "../state/state";
import { getVersion } from "@tauri-apps/api/app";
import styles from "./Sidebar.module.scss";

export default function Sidebar(props: { app: AppState }) {
    const [version] = createResource(getVersion);

    return (
        <ResizablePane width={300} minWidth={190} maxWidth={400} class={styles.pane}>
            <ResizablePane.Content class={styles.content}>
                <TabControls app={props.app} />
                <Input app={props.app} />
                <Show when={props.app.profiles}>
                    <Profiles app={props.app} />
                </Show>
                <div onClick={() => props.app.newTab()} class={styles.newTabButton}>
                    <p> + New Tab</p>
                </div>
                <div class={styles.tabs}>
                    <For each={props.app.tabs}>{(tab) => (
                        <Tab tab={tab} />
                    )}
                    </For>
                </div>
                <div class={styles.version}>
                    <Show when={version()} fallback={<span>Loading version...</span>}>
                        <span>v{version()}</span>
                    </Show>
                </div>
            </ResizablePane.Content>
            <ResizablePane.Handle />
        </ResizablePane >
    )
}