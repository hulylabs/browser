import { BaseDirectory, writeTextFile } from "@tauri-apps/plugin-fs";
import { Browser, DownloadProgress, FileDialog, LoadState, LoadStatus, Tab, TabEventStream } from "cef-client";
import { createStore, SetStoreFunction } from "solid-js/store";
import { processSearchString } from "./utils";

type TabId = number;

export interface TabCallbacks {
    onBookmarkAdd: (title: string, url: string, favicon: string) => void;
    onBookmarkRemove: (url: string) => void;
    onDownloadUpdate: (download: {
        id: number;
        path: string;
        received: number;
        total: number;
        is_complete: boolean;
        is_aborted: boolean;
        cancel: () => void;
    }) => void;
    onUIFocusUrl: () => void;
    onExternalLink: (url: string) => Promise<void>;
    onFileDialog: (dialog: FileDialog, tab: Tab) => Promise<void>;
}

export interface TabConnection {
    page: Tab;
    events: TabEventStream;
}

export interface TabState {
    id: TabId;
    title: string;
    url: string;
    favicon: string;
    active: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
    isLoading: boolean;
    hoveredUrl: string;

    pinned: boolean;

    goTo: (url: string) => void;
    activate: () => void;
    close: () => void;
    goBack: () => void;
    goForward: () => void;
    reload: () => void;

    selectAll: () => void;
    copy: () => void;
    paste: () => void;
    cut: () => void;
    undo: () => void;
    redo: () => void;

    pin: () => void;
    unpin: () => void;
}


export class Tabs {
    private client: Browser;
    private callbacks: TabCallbacks;

    private tabs: TabState[];
    setTabs: SetStoreFunction<TabState[]>;
    connections: Map<TabId, TabConnection> = new Map();

    constructor(client: Browser, callbacks: TabCallbacks) {
        this.client = client;
        this.callbacks = callbacks;

        [this.tabs, this.setTabs] = createStore<TabState[]>([]);
    }

    async new(searchString?: string) {
        let url = "";
        if (searchString) {
            url = processSearchString(searchString);
        }
        let tab = await this.client.openTab({ url })!;
        this.add(tab);
        this.activate(tab.id);
        this.callbacks.onUIFocusUrl();
    }

    async save() {
        const current = this.tabs.filter(tab => !tab.pinned);
        await writeTextFile('tabs.json', JSON.stringify(current), { baseDir: BaseDirectory.AppData });
    }

    async fetch() {
        let tabs = await this.client.tabs();
        for (let tab of tabs) {
            if (!this.tabs.some(t => t.id === tab.id)) {
                this.add(tab);
            }
        }
    }

    all(): TabState[] {
        return this.tabs;
    }

    getActive(): TabState | undefined {
        return this.tabs.find((tab) => tab.active);
    }

    activate(id: TabId) {
        let activeTab = this.getActive();

        if (activeTab && activeTab.id === id) return;
        if (activeTab) this.setActive(activeTab.id, false);

        this.setActive(id, true);
    }

    clear() {
        this.setTabs([]);
        this.connections.forEach(c => c.events.closeConnection());
        this.connections.clear();
    }

    shift(next: boolean) {
        if (this.tabs.length === 0) return;

        let active = this.getActive();
        if (!active) return;

        let index = this.tabs.findIndex((tab) => tab.id === active.id);

        if (next) {
            index = (index + 1) % this.tabs.length;
        } else {
            index = (index - 1 + this.tabs.length) % this.tabs.length;
        }
        this.activate(this.tabs[index].id);
    }

    close(tabId: TabId) {
        let index = this.tabs.findIndex((tab) => tab.id === tabId);
        let tab = this.tabs[index];

        if (tab.pinned) {
            return;
        }

        this.setTabs(tabs => tabs.filter(tab => tab.id !== tabId));
        this.connections.get(tabId)?.page.close();
        this.connections.get(tabId)?.events.closeConnection();
        this.connections.delete(tabId);

        if (this.tabs.length === 0) {
            return;
        }

        if (tab.active) {
            let newActiveTabIndex = Math.max(index - 1, 0);
            this.activate(this.tabs[newActiveTabIndex].id);
        }
    }

    pin(tabId: TabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab || tab.pinned) return;

        this.callbacks.onBookmarkAdd(tab.title, tab.url, tab.favicon);
        this.setTabs(t => t.id === tabId, "pinned", true);
    }

    unpin(tabId: TabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab || !tab.pinned) return;

        this.callbacks.onBookmarkRemove(tab.url);
        this.setTabs(t => t.id === tabId, "pinned", false);
    }

    navigate(tabId: TabId, searchString: string) {
        let url = processSearchString(searchString);
        this.connections.get(tabId)?.page.navigate(url);
    }

    add(tab: Tab, partial: Partial<TabState> = {}) {
        let id = tab.id;
        let events = tab.events();

        this.connections.set(id, {
            page: tab,
            events: events
        });

        this.setupTabEvents(id, events, tab);

        let state: TabState = {
            id: id,
            title: partial.title || "New Tab",
            url: partial.url || "",
            favicon: partial.favicon || "",
            active: partial.active || false,
            canGoBack: false,
            canGoForward: false,
            isLoading: false,
            hoveredUrl: "",

            pinned: partial.pinned || false,

            goTo: (url: string) => this.navigate(id, url),
            activate: () => this.activate(id),
            close: () => this.close(id),
            goBack: () => this.connections.get(id)?.page.back(),
            goForward: () => this.connections.get(id)?.page.forward(),
            reload: () => this.connections.get(id)?.page.reload(),

            selectAll: () => this.connections.get(id)?.page.selectAll(),
            copy: () => this.connections.get(id)?.page.copy(),
            paste: () => this.connections.get(id)?.page.paste(),
            cut: () => this.connections.get(id)?.page.cut(),
            undo: () => this.connections.get(id)?.page.undo(),
            redo: () => this.connections.get(id)?.page.redo(),

            pin: () => this.pin(id),
            unpin: () => this.unpin(id),
        };

        this.setTabs((prev) => [...prev, state]);
    }

    private setupTabEvents(id: TabId, events: TabEventStream, tab: Tab) {
        events.on("Title", (title: string) => this.setTabs(t => t.id === id, "title", title));
        events.on("Url", (url: string) => this.setTabs(t => t.id === id, "url", url));
        events.on("Favicon", (url: string) => this.setTabs(t => t.id === id, "favicon", url));
        events.on("NewTab", (url: string) => this.new(url));
        events.on("UrlHovered", (url: string) => this.setTabs(t => t.id === id, "hoveredUrl", url));
        events.on("LoadState", (state: LoadState) => {
            this.setTabs(t => t.id === id, "isLoading", state.status === LoadStatus.Loading);
            this.setTabs(t => t.id === id, "canGoBack", state.canGoBack);
            this.setTabs(t => t.id === id, "canGoForward", state.canGoForward);
        });
        events.on("ExternalLink", async (url: string) => await this.callbacks.onExternalLink(url));
        events.on("DownloadProgress", (progress: DownloadProgress) => {
            this.callbacks.onDownloadUpdate({
                id: progress.id,
                path: progress.path,
                received: progress.received,
                total: progress.total,
                is_complete: progress.is_complete,
                is_aborted: progress.is_aborted,
                cancel: () => tab.cancelDownloading(progress.id)
            });
        });
        events.on("FileDialog", async (dialog: FileDialog) => {
            await this.callbacks.onFileDialog(dialog, tab);
        });
    }

    private setActive(id: TabId, active: boolean) {
        let tab = this.tabs.find(t => t.id === id);
        if (!tab) {
            console.error(`[setActive] tab with id ${id} not found`);
            return;
        }

        this.setTabs(t => t.id === id, "active", active);
        let connection = this.connections.get(id)!;
        active ? connection.page.startVideo() : connection.page.stopVideo();
    }
}