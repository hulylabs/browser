import { Progress } from "@kobalte/core/progress";
import { AppState } from "../../state/state";
import styles from "./Downloads.module.scss";
import { DownloadItem } from "../../state/downloads";
import { Popover } from "@kobalte/core/popover";
import { DownloadIcon, XIcon } from "lucide-solid";
import { For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

export default function Downloads(props: { app: AppState }) {
    const inProgressCount = () => props.app.downloads.items.filter(item => !item.is_complete && !item.is_aborted).length;

    return (
        <Popover>
            <Popover.Trigger class={styles.popoverTrigger}>
                <DownloadIcon size={20} />
                <Show when={inProgressCount() > 0}>
                    <span class={styles.badge}>{inProgressCount()}</span>
                </Show>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content class={styles.popoverContent}>

                    <Popover.Arrow class={styles.arrow} />

                    <div class={styles.popoverHeader}>
                        <Popover.Title class={styles.popoverTitle}>Downloads</Popover.Title>
                        <Popover.CloseButton class={styles.popoverCloseButton}>
                            <XIcon size={24} />
                        </Popover.CloseButton>
                    </div>

                    <Popover.Description class={styles.popoverDescription}>
                        <For each={props.app.downloads.items}>{(item) => (
                            <Download item={item} />
                        )}</For>
                    </Popover.Description>

                </Popover.Content>
            </Popover.Portal>
        </Popover >
    )
}

function Download(props: { item: DownloadItem }) {
    const handleShowInFolder = async () => {
        try {
            await invoke("show_in_folder", { path: props.item.path });
        } catch (error) {
            console.error("Failed to show file in folder:", error);
        }
    };

    return (
        <div class={styles.downloadItem} onClick={handleShowInFolder}>
            <Progress value={(props.item.received / props.item.total) * 100} minValue={0} maxValue={100} class={styles.progress}>
                <div class={styles.info}>
                    <Progress.Label class={styles.label}> {props.item.path.split(/[/\\]/).pop()}</Progress.Label>
                    <Show when={!props.item.is_complete} fallback={<span class={styles.label}>Done</span>}>
                        <Progress.ValueLabel class={styles.label} />
                    </Show>
                </div>
                <Progress.Track class={styles.track}>
                    <Progress.Fill class={styles.fill} />
                </Progress.Track>
            </Progress>
            <Show when={!props.item.is_complete}>
                <XIcon size={24} onClick={(e) => { e.stopPropagation(); props.item.cancel(); }} />
            </Show>
        </div>
    )
}