import classes from "./TabControls.module.css";

import { AppState } from "../../state";
import { Icon, Icons } from "../Icon";
import { createMemo } from "solid-js";

export default function TabControls(props: { app: AppState }) {
    const activeTab = createMemo(() => props.app.getActiveTab());

    return (
        <div class={classes.tabСontrols}>
            <Icon icon={Icons.Back} class={classes.button} classList={{ [classes.active]: activeTab() != undefined }} onClick={() => activeTab()?.goBack()} />
            <Icon icon={Icons.Forward} class={classes.button} classList={{ [classes.active]: activeTab() != undefined }} onClick={() => activeTab()?.goForward()} />
            <Icon icon={Icons.Reload} class={classes.button} classList={{ [classes.active]: activeTab() != undefined }} onClick={() => activeTab()?.reload()} />
        </div >
    )
}