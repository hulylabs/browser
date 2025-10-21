import { For, Show } from "solid-js";
import { AppState } from "../../state/state";
import styles from "./Bookmarks.module.scss";
import { XIcon } from "lucide-solid";

export default function Bookmarks(props: { app: AppState }) {
    const bookmarks = () => props.app.tabs.all().filter(t => t.pinned);

    const close = (bookmark: any, event: MouseEvent) => {
        event.stopPropagation();
        bookmark.unpin();
    };

    return (
        <div class={styles.bookmarks}>
            <For each={bookmarks()}>
                {(bookmark) => (
                    <div
                        class={styles.bookmark}
                        classList={{ [styles.active]: bookmark.active }}
                        onClick={bookmark.activate}
                        title={`${bookmark.title}`}
                    >
                        <Show when={bookmark.favicon} fallback={<div class={`${styles.favicon} ${styles.empty}`} />}>
                            <div class={styles.favicon} >
                                <img src={bookmark.favicon} />
                            </div>
                        </Show>
                        <div class={styles.close} onClick={(e) => close(bookmark, e)}>
                            <XIcon size={10} color="white" stroke-width={3} />
                        </div>
                    </div>
                )}
            </For>
        </div>
    );
}