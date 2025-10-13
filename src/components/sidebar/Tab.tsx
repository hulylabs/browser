import styles from "./Tab.module.scss";

import { TabState } from "../../state/state";
import { Show } from "solid-js";
import { PinIcon, XIcon } from "lucide-solid";

export default function Tab(props: { tab: TabState }) {
    let activate = (event: MouseEvent) => {
        event.stopPropagation();
        props.tab.activate();
    }
    let close = (event: MouseEvent) => {
        event.stopPropagation();
        props.tab.close();
    }
    let pin = (event: MouseEvent) => {
        event.stopPropagation();
        props.tab.pin();
    }

    return (
        <div class={styles.tab} classList={{ [styles.active]: props.tab.active }} onClick={activate}>

            <div class={styles.info}>
                <Show when={props.tab.favicon} fallback={<div class={`${styles.favicon} ${styles.empty}`} />}>
                    <div class={styles.favicon} >
                        <img src={props.tab.favicon} />
                    </div>
                </Show>

                <p class={styles.title}>{props.tab.title}</p>
            </div>

            <div class={styles.controls}>
                <PinIcon class={styles.control} onClick={pin} />
                <XIcon class={styles.control} onClick={close} />
            </div>

        </div>
    )
}