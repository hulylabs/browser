import { createResource, createSignal, For, Show } from "solid-js";
import { ResizablePane } from "../ResizablePane";
import TabControls from "./TabControls";
import Input from "./Input";
import { Profiles } from "./Profiles";
import Tab from "./Tab";
import { AppState } from "../../state/state";
import { getVersion } from "@tauri-apps/api/app";
import styles from "./Layout.module.scss"
import { NewTabInput } from "./NewTabInput";
import Downloads from "./Downloads";

export default function Sidebar(props: { app: AppState }) {
    const [version] = createResource(getVersion);

    const [showInput, setShowInput] = createSignal(false);
    const onNewTabClick = () => setShowInput(true);

    return (
        <>
            <ResizablePane width={300} minWidth={190} maxWidth={400} class={styles.pane}>
                <ResizablePane.Content class={styles.content}>
                    <div class={styles.header}>
                        <TabControls app={props.app} />
                        <Input app={props.app} />
                        <Show when={props.app.profiles}>
                            <Profiles app={props.app} />
                        </Show>
                        <div onClick={onNewTabClick} class={styles.newTabButton}>
                            <p> + New Tab</p>
                        </div>
                    </div>
                    <div class={styles.tabs}>
                        <For each={props.app.tabs}>{(tab) => (
                            <Tab tab={tab} />
                        )}
                        </For>
                    </div>
                    <div class={styles.footer}>
                        <Downloads app={props.app} />
                        <div class={styles.version}>
                            <Show when={version()} fallback={<span>Loading version...</span>}>
                                <span>v{version()}</span>
                            </Show>
                        </div>
                    </div>
                </ResizablePane.Content>
                <ResizablePane.Handle />
            </ResizablePane>

            <Show when={showInput()}>
                <NewTabInput app={props.app} close={() => setShowInput(false)} />
            </Show>
        </>
    )
}