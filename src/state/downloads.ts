import { createStore, SetStoreFunction } from "solid-js/store";

export interface DownloadItem {
    id: number;
    path: string;
    received: number;
    total: number;
    is_complete: boolean;
    is_aborted: boolean;

    cancel: () => void;
}

export class Downloads {
    readonly items: DownloadItem[];
    private setItems: SetStoreFunction<DownloadItem[]>;

    constructor() {
        [this.items, this.setItems] = createStore<DownloadItem[]>([]);
    }

    update(item: DownloadItem) {
        if (item.is_aborted) {
            this.setItems(items => items.filter(i => i.id !== item.id));
            return;
        }

        if (this.exists(item.id)) {
            this.setItems(items => items.id === item.id, item);
            return;
        }

        this.setItems(items => [...items, item]);
    }

    private exists(id: number): boolean {
        return this.items.some(item => item.id === id);
    }
}