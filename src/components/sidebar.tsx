import { For, Show } from "solid-js";
import { ResizablePane } from "./ResizablePane";
import TabControls from "./sidebar/TabControls";
import Input from "./sidebar/Input";
import { Profiles } from "./sidebar/Profiles";
import Tab from "./sidebar/Tab";
import { AppState } from "../state/state";

export default function Sidebar(props: { app: AppState }) {
    return (
        <ResizablePane width={300} minWidth={190} maxWidth={400} class="sidebar">
            <ResizablePane.Content class="sidebar-content">
                <TabControls app={props.app} />
                <Input app={props.app} />
                <Show when={props.app.profiles}>
                    <Profiles app={props.app} />
                </Show>
                <div onClick={() => props.app.newTab()} class="new-tab-button">
                    <p> + New Tab</p>
                </div>
                <div class="tabs">
                    <For each={props.app.tabs}>{(tab) => (
                        <Tab tab={tab} />
                    )}
                    </For>
                </div>
            </ResizablePane.Content>
            <ResizablePane.Handle />
        </ResizablePane>
    )
}