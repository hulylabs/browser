import { Browser, connect, LoadState, LoadStatus, Tab, TabEventStream } from "cef-client";
import { createStore, SetStoreFunction } from "solid-js/store";
import { ProfileManager } from "./profiles";
import { isURL, isFQDN } from "validator";
import { invoke } from "@tauri-apps/api/core";
import { Accessor, createSignal, Setter } from "solid-js";
import { Shortcuts } from "./shortcuts";

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
}


export class AppState {
    private client: Browser;

    shortcuts: Shortcuts;
    profiles: ProfileManager | undefined;

    tabs: TabState[];
    setTabs: SetStoreFunction<TabState[]>;
    connections: Map<TabId, TabConnection> = new Map();

    browserFocused: Accessor<boolean>;
    setBrowserFocused: Setter<boolean>;

    private focusUrlCallback: (() => void) | null = null;

    constructor(client: Browser, profiles?: ProfileManager) {
        this.client = client;

        this.shortcuts = new Shortcuts(this);
        this.profiles = profiles;
        [this.tabs, this.setTabs] = createStore<TabState[]>([]);

        [this.browserFocused, this.setBrowserFocused] = createSignal(false);
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

    async newTab(searchString?: string) {
        let url = "";
        if (searchString) {
            url = this.processSearchString(searchString);
        }
        let tab = await this.client.openTab({ url })!;
        this.addTab(tab);
        this.setActiveTab(tab.id);
        this.focusUrl();
    }

    setFocusUrlCallback(callback: () => void) {
        this.focusUrlCallback = callback;
    }

    focusUrl() {
        if (this.focusUrlCallback) this.focusUrlCallback();
    }

    isBrowserFocused(): boolean {
        return this.browserFocused();
    }

    getStackTrace(): string {
        const error = new Error();
        return error.stack ?? 'No stack trace available';
    }

    getActiveTab(): TabState | undefined {
        return this.tabs.find((tab) => tab.active);
    }

    setActiveTab(tabId: TabId) {
        let activeTab = this.getActiveTab();
        if (activeTab) {
            this.setActive(activeTab.id, false);
        }

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

    back(tabId: TabId) {
        this.connections.get(tabId)?.page.back();
    }

    forward(tabId: TabId) {
        this.connections.get(tabId)?.page.forward();
    }

    reload(tabId: TabId) {
        this.connections.get(tabId)?.page.reload();
    }

    selectAll(tabId: TabId) {
        this.connections.get(tabId)?.page.selectAll();
    }

    copy(tabId: TabId) {
        this.connections.get(tabId)?.page.copy();
    }

    paste(tabId: TabId) {
        this.connections.get(tabId)?.page.paste();
    }

    cut(tabId: TabId) {
        this.connections.get(tabId)?.page.cut();
    }

    undo(tabId: TabId) {
        this.connections.get(tabId)?.page.undo();
    }

    redo(tabId: TabId) {
        this.connections.get(tabId)?.page.redo();
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

    private addTab(tab: Tab) {
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
        events.on("LoadState", (state: LoadState) => {
            this.setTabs(t => t.id === id, "isLoading", state.status === LoadStatus.Loading);
            this.setTabs(t => t.id === id, "canGoBack", state.canGoBack);
            this.setTabs(t => t.id === id, "canGoForward", state.canGoForward);
        });

        let state: TabState = {
            id: id,
            title: "New Tab",
            url: "",
            favicon: "",
            active: false,
            canGoBack: false,
            canGoForward: false,
            isLoading: false,

            goTo: (url: string) => this.navigate(id, url),
            activate: () => this.setActiveTab(tab.id),
            close: () => this.closeTab(tab.id),
            goBack: () => this.back(id),
            goForward: () => this.forward(id),
            reload: () => this.reload(id),

            selectAll: () => this.selectAll(id),
            copy: () => this.copy(id),
            paste: () => this.paste(id),
            cut: () => this.cut(id),
            undo: () => this.undo(id),
            redo: () => this.redo(id),
        };

        this.setTabs((prev) => [...prev, state]);
    }

    private processSearchString(searchString: string) {
        let is1 = isFQDN(searchString);
        let is2 = isURL(searchString, { protocols: ["http", "https", "huly"], require_tld: false });

        if (is1 || is2) {
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