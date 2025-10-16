import { Browser, connect, LoadState, LoadStatus, Tab, TabEventStream, DownloadProgress, FileDialog } from "cef-client";
import { createStore, SetStoreFunction } from "solid-js/store";
import { ProfileManager } from "./profiles";
import { isURL, isFQDN } from "validator";
import { invoke } from "@tauri-apps/api/core";
import { Setter } from "solid-js";
import { Shortcuts } from "./shortcuts";
import { Downloads } from "./downloads";
import { UIState } from "./ui";
import { Bookmarks } from "./bookmarks";
import { confirm, open } from '@tauri-apps/plugin-dialog';
import { BaseDirectory } from "@tauri-apps/api/path";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

type TabId = number;

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
}

export class AppState {
    private client: Browser;


    downloads: Downloads;
    shortcuts: Shortcuts;
    bookmarks: Bookmarks;
    profiles: ProfileManager | undefined;
    ui: UIState;

    tabs: TabState[];
    setTabs: SetStoreFunction<TabState[]>;
    connections: Map<TabId, TabConnection> = new Map();

    constructor(client: Browser, profiles?: ProfileManager) {
        this.client = client;

        this.downloads = new Downloads();
        this.shortcuts = new Shortcuts(this);
        this.bookmarks = new Bookmarks();
        this.profiles = profiles;
        this.ui = new UIState();

        [this.tabs, this.setTabs] = createStore<TabState[]>([]);

        this.restore(client);
    }

    async setClient(client: Browser) {
        this.client.closeConnection();
        this.setTabs([]);
        for (let connection of this.connections.values()) {
            connection.events.closeConnection();
        }
        this.connections.clear();

        this.client = client;
        setInterval(async () => await this.fetchTabs(), 5000);
    }

    async save() {
        if (!await exists('', { baseDir: BaseDirectory.AppData })) {
            await mkdir('', { baseDir: BaseDirectory.AppData });
        }

        const current = this.tabs.filter(tab => !tab.pinned);
        console.log("Saving tabs:", current);
        await writeTextFile('tabs.json', JSON.stringify(current), { baseDir: BaseDirectory.AppData });
        await this.bookmarks.save();
    }

    async restore(client: Browser) {
        try {
            await this.bookmarks.load();
            let content = await readTextFile('tabs.json', { baseDir: BaseDirectory.AppData });
            const tabs = JSON.parse(content);

            for (let bookmark of this.bookmarks.all()) {
                let newTab = await client.openTab({ url: bookmark.url });
                this.addTab(newTab, { title: bookmark.title, url: bookmark.url, favicon: bookmark.favicon, pinned: true });
            }

            for (let tab of tabs) {
                let newTab = await client.openTab({ url: tab.url });
                this.addTab(newTab, tab);
            }
        } catch (err) {
            console.error("Error restoring tabs:", err);
        }
    }

    async newTab(searchString?: string) {
        let url = "";
        if (searchString) {
            url = this.processSearchString(searchString);
        }
        let tab = await this.client.openTab({ url })!;
        this.addTab(tab);
        this.setActiveTab(tab.id);
        this.ui.focusUrl();
    }

    getActiveTab(): TabState | undefined {
        return this.tabs.find((tab) => tab.active);
    }

    setActiveTab(tabId: TabId) {
        let activeTab = this.getActiveTab();

        if (activeTab && activeTab.id === tabId) return;
        if (activeTab) this.setActive(activeTab.id, false);

        this.setActive(tabId, true);
    }

    shiftTab(next: boolean) {
        if (this.tabs.length === 0) return;

        let active = this.getActiveTab();
        if (!active) return;

        let index = this.tabs.findIndex((tab) => tab.id === active.id);

        if (next) {
            index = (index + 1) % this.tabs.length;
        } else {
            index = (index - 1 + this.tabs.length) % this.tabs.length;
        }
        this.setActiveTab(this.tabs[index].id);
    }

    closeTab(tabId: TabId) {
        let index = this.tabs.findIndex((tab) => tab.id === tabId);
        let tab = this.tabs[index];

        this.setTabs(tabs => tabs.filter(tab => tab.id !== tabId));
        this.connections.get(tabId)?.page.close();
        this.connections.get(tabId)?.events.closeConnection();
        this.connections.delete(tabId);

        if (this.tabs.length === 0) {
            return;
        }

        if (tab.active) {
            let newActiveTabIndex = index - 1 < 0 ? 0 : index - 1;
            this.setActiveTab(this.tabs[newActiveTabIndex].id);
        }
    }

    resize(width: number, height: number) {
        this.client.resize(width, height);
    }

    navigate(tabId: TabId, searchString: string) {
        let url = this.processSearchString(searchString);
        this.connections.get(tabId)?.page.navigate(url);
    }

    pinTab(tabId: TabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab || tab.pinned) return;

        this.bookmarks.add(tab.title, tab.url, tab.favicon);
        this.setTabs(t => t.id === tabId, "pinned", true);
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

    private async fetchTabs() {
        let tabs = await this.client.tabs();
        for (let tab of tabs) {
            if (!this.tabs.some(t => t.id === tab.id)) {
                this.addTab(tab);
            }
        }
    }

    private addTab(tab: Tab, partial: Partial<TabState> = {}) {
        let id = tab.id;
        let events = tab.events();

        this.connections.set(id, {
            page: tab,
            events: events
        });

        events.on("Title", (title: string) => this.setTabs(t => t.id === id, "title", title));
        events.on("Url", (url: string) => this.setTabs(t => t.id === id, "url", url));
        events.on("Favicon", (url: string) => this.setTabs(t => t.id === id, "favicon", url));
        events.on("NewTab", (url: string) => this.newTab(url));
        events.on("UrlHovered", (url: string) => this.setTabs(t => t.id === id, "hoveredUrl", url));
        events.on("LoadState", (state: LoadState) => {
            this.setTabs(t => t.id === id, "isLoading", state.status === LoadStatus.Loading);
            this.setTabs(t => t.id === id, "canGoBack", state.canGoBack);
            this.setTabs(t => t.id === id, "canGoForward", state.canGoForward);
        });
        events.on("ExternalLink", async (url: string) => {
            if (url !== "") {
                let confirmed = await confirm("Open external link? (" + url + ")");
                if (confirmed) {
                    invoke("open_link", { url: url }).catch((e) => {
                        console.error("Failed to open external link:", e);
                    });
                }
            }
        });
        events.on("DownloadProgress", (progress: DownloadProgress) => {
            this.downloads.update({
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
            const file = await open({
                title: dialog.title,
                defaultPath: dialog.default_file_path,
            });
            if (file === null) {
                tab.cancelFileDialog();
            } else if (Array.isArray(file)) {
                tab.continueFileDialog(file);
            } else {
                tab.continueFileDialog([file]);
            }
        });

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
            activate: () => this.setActiveTab(tab.id),
            close: () => this.closeTab(tab.id),
            goBack: () => this.connections.get(id)?.page.back(),
            goForward: () => this.connections.get(id)?.page.forward(),
            reload: () => this.connections.get(id)?.page.reload(),

            selectAll: () => this.connections.get(id)?.page.selectAll(),
            copy: () => this.connections.get(id)?.page.copy(),
            paste: () => this.connections.get(id)?.page.paste(),
            cut: () => this.connections.get(id)?.page.cut(),
            undo: () => this.connections.get(id)?.page.undo(),
            redo: () => this.connections.get(id)?.page.redo(),

            pin: () => this.pinTab(id),
        };

        this.setTabs((prev) => [...prev, state]);
    }

    private processSearchString(searchString: string) {
        let fqdn = isFQDN(searchString);
        let url = isURL(searchString, { require_tld: false, require_protocol: true, require_valid_protocol: false });

        if (fqdn || url) {
            return searchString;
        }
        return `https://www.google.com/search?q=${searchString}`;
    }
}

export interface Arguments {
    profiles_enabled: boolean;
    cef_manager: string;
    cef: string;
}

export interface AppEvent {
    message: string;
    type: 'info' | 'error';
}

async function launchCEF(setEvent: Setter<AppEvent>): Promise<AppState | null> {
    try {
        setEvent({ message: 'Checking CEF presence...', type: 'info' });
        let present = await invoke('is_cef_present');
        if (!present) {
            setEvent({ message: 'CEF not found, downloading...', type: 'info' });
            await invoke('download_cef');
        }

        setEvent({ message: 'Launching CEF...', type: 'info' });
        let addr = await invoke('launch_cef');
        let browser = await connect(addr as string);
        return new AppState(browser);
    } catch (e) {
        const errorMessage = "Failed to launch CEF: " + (e instanceof Error ? e.message : String(e));
        setEvent({ message: errorMessage, type: 'error' });
        return null;
    }
}

async function connectToCefInstance(cefAddress: string, setEvent: Setter<AppEvent>): Promise<AppState | null> {
    try {
        setEvent({ message: 'Connecting to CEF instance...', type: 'info' });
        let browser = await connect(cefAddress);
        return new AppState(browser);
    } catch (e) {
        const errorMessage = "Failed to connect to CEF instance: " + (e instanceof Error ? e.message : String(e));
        setEvent({ message: errorMessage, type: 'error' });
        return null;
    }
}

async function connectToManager(managerAddress: string, setEvent: Setter<AppEvent>): Promise<AppState | null> {
    try {
        setEvent({ message: 'Connecting...', type: 'info' });
        const profileManager = new ProfileManager(managerAddress);
        const profiles = await profileManager.getProfiles();
        if (profiles.length === 0) {
            setEvent({ message: 'No profiles found', type: 'error' });
            return null;
        }

        profileManager.setSelected(profiles[0]);
        const client = await profileManager.connect(profiles[0]);
        return new AppState(client, profileManager);
    } catch (e) {
        const errorMessage = "Failed to connect to manager: " + (e instanceof Error ? e.message : String(e));
        setEvent({ message: errorMessage, type: 'error' });
        return null;
    }
}

export async function initializeApp(args: Arguments, setEvent: Setter<AppEvent>): Promise<AppState | null> {
    if (args.profiles_enabled) {
        return await connectToManager(args.cef_manager, setEvent);
    } else if (args.cef !== "") {
        return await connectToCefInstance(args.cef, setEvent);
    } else {
        return await launchCEF(setEvent);
    }
}