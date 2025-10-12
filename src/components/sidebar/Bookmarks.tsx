import { For, Show } from "solid-js";
import { AppState } from "../../state/state";
import styles from "./Bookmarks.module.scss";

export default function Bookmarks(props: { app: AppState }) {
    const bookmarks = () => props.app.tabs.filter(t => t.pinned);

    return (
        <div class={styles.bookmarks}>
            <For each={bookmarks()}>
                {(bookmark) => (
                    <div class={styles.bookmark} classList={{ [styles.active]: bookmark.active }} onClick={bookmark.activate}>
                        <Show when={bookmark.favicon} fallback={<div class={`${styles.favicon} ${styles.empty}`} />}>
                            <div class={styles.favicon} >
                                <img src={bookmark.favicon} />
                            </div>
                        </Show>
                    </div>
                )}
            </For>
        </div>
    );
}