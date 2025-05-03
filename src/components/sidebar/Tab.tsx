import styles from "./Tab.module.scss";

import { TabState } from "../../state";
import { Icon, Icons } from "../Icon";
import { Show } from "solid-js";

export default function Tab(props: { tab: TabState }) {
    let activate = (event: MouseEvent) => {
        event.stopPropagation();
        props.tab.activate();
    }
    let close = (event: MouseEvent) => {
        event.stopPropagation();
        props.tab.close();
    }
    return (
        <div class={styles.tab} classList={{ [styles.active]: props.tab.active }} onClick={activate}>
            <div class={styles.tabInfo}>

                <Show when={props.tab.faviconUrl} fallback={<div class={`${styles.favicon} ${styles.empty}`} />}>
                    <div class={styles.favicon} >
                        <img src={props.tab.faviconUrl} />
                    </div>
                </Show>

                <p class={styles.tabTitle}>{props.tab.title}</p>

            </div>

            <Icon icon={Icons.X} class={styles.close} onClick={close} />
        </div >
    )
}