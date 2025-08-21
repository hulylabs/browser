import styles from "./Tab.module.scss";

import { TabState } from "../../state/state";
import { Show } from "solid-js";
import { XIcon } from "lucide-solid";

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

                <Show when={props.tab.favicon} fallback={<div class={`${styles.favicon} ${styles.empty}`} />}>
                    <div class={styles.favicon} >
                        <img src={props.tab.favicon} />
                    </div>
                </Show>

                <p class={styles.tabTitle}>{props.tab.title}</p>

            </div>

            <XIcon class={styles.close} onClick={close} />
        </div >
    )
}