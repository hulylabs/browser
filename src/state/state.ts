import { Browser, LoadState, LoadStatus, Tab, TabEventStream } from "cef-client";
import { createStore, SetStoreFunction } from "solid-js/store";
import { BrowserPlugin } from "./plugins/plugin";
import { ProfileManager } from "./profiles";
import { isURL, isFQDN } from "validator";

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
    private plugins: BrowserPlugin[];

    profileManager: ProfileManager | undefined;

    tabs: TabState[];
    setTabs: SetStoreFunction<TabState[]>;
    connections: Map<TabId, TabConnection> = new Map();

    constructor(client: Browser, profileManager?: ProfileManager) {
        this.client = client;
        this.plugins = [];

        this.profileManager = profileManager;
        [this.tabs, this.setTabs] = createStore<TabState[]>([]);
    }

    addPlugin(plugin: BrowserPlugin) {
        plugin.setup(this);
        this.plugins.push(plugin);
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
        let is2 = isURL(searchString, { protocols: ["http", "https"] });
        if (is1 || is2) {
            console.log("It's a domain: ", is1);
            console.log("It's a URL: ", is2);
            return searchString;
        }
        return `https://www.google.com/search?q=${searchString}`;
    }
}