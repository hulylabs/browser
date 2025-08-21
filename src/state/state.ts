import { Browser, LoadState, Tab, TabEventStream } from "cef-client";
import { createStore, SetStoreFunction } from "solid-js/store";
import { BrowserPlugin } from "./plugins/plugin";
import { ProfileManager } from "./profiles";
import { LoadStatus } from "cef-client/dist/types";

type TabId = number;

interface TabConnection {
    page: Tab;
    events: TabEventStream;
}

export interface TabState {
    id: TabId;
    title: string;
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

    async newTab(url?: string) {
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

    resize(width: number, height: number) {
        this.client.resize(width, height);
    }

    goTo(tabId: TabId, url: string) {
        this.connections.get(tabId)?.page.navigate(url);
    }

    goBack(tabId: TabId) {
        this.connections.get(tabId)?.page.back();
    }

    goForward(tabId: TabId) {
        this.connections.get(tabId)?.page.forward();
    }

    reload(tabId: TabId) {
        this.connections.get(tabId)?.page.reload();
    }

    closeTab(tabId: TabId) {
        let index = this.tabs.findIndex((tab) => tab.id === tabId);
        let tabToClose = this.tabs[index];
        let onlyTab = this.tabs.length == 1;

        this.setTabs(tabs => tabs.filter(tab => tab.id !== tabId));
        this.connections.get(tabId)?.page.close();
        // this.connections.get(tabId)?.events.close();
        this.connections.delete(tabId);
        if (onlyTab) {
            return;
        }

        if (tabToClose.active) {
            let newActiveTabIndex = index - 1 < 0 ? 0 : index - 1;
            this.setActiveTab(this.tabs[newActiveTabIndex].id);
        }
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

        events.on("Favicon", (url: string) => {
            this.setTabs(t => t.id === id, "favicon", url);
        });

        events.on("LoadState", (state: LoadState) => {
            this.setTabs(t => t.id === id, "isLoading", state.status === LoadStatus.Loading);
            this.setTabs(t => t.id === id, "canGoBack", state.canGoBack);
            this.setTabs(t => t.id === id, "canGoForward", state.canGoForward);
        });

        events.on("Title", (title: string) => {
            this.setTabs(t => t.id === id, "title", title);
        });

        let state: TabState = {
            id: id,
            title: "New Tab",
            favicon: "",
            active: false,
            canGoBack: false,
            canGoForward: false,
            isLoading: true,

            goTo: (url: string) => this.goTo(id, url),
            activate: () => this.setActiveTab(tab.id),
            close: () => this.closeTab(tab.id),
            goBack: () => this.goBack(id),
            goForward: () => this.goForward(id),
            reload: () => this.reload(id),
        };

        this.setTabs((prev) => [...prev, state]);
    }
}