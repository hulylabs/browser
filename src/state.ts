import { Browser, connect, TabEventStream, LoadState, Tab } from "cef-client";
import { createStore, SetStoreFunction } from "solid-js/store";
import { BrowserPlugin } from "./plugins/plugin";

type TabId = number;

interface TabConnection {
    page: Tab;
    events: TabEventStream;
}

interface TabState {
    id: TabId;
    title: string;
    favicon: string;
    active: boolean;
    canGoBack: boolean;
    canGoForward: boolean;

    goTo: (url: string) => void;
    activate: () => void;
    close: () => void;
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
}

export class AppState {
    private plugins: BrowserPlugin[];

    browser: Browser | undefined;
    connections: Map<TabId, TabConnection> = new Map();

    tabs: TabState[];
    setTabs: SetStoreFunction<TabState[]>;

    constructor() {
        [this.tabs, this.setTabs] = createStore<TabState[]>([]);
        this.plugins = [];
    }

    addPlugin(plugin: BrowserPlugin) {
        plugin.setup(this);
        this.plugins.push(plugin);
    }

    async setProfile(profile: string) {
        let response = await fetch(`/api/profiles/${profile}/cef`);
        let json = await response.json();
        let address = json.data.address;

        this.browser = await connect(address);

        this.setTabs([]);
        await this.fetchTabs();
    }

    async fetchTabs() {
        if (!this.browser) {
            console.error("Browser is not connected");
            return;
        }

        let tabs = await this.browser?.tabs();
        for (let tab of tabs) {
            this.addTab(tab);
        }

    }

    async newTab(url?: string) {
        let tab = await this.browser?.openTab({ url })!;
        this.addTab(tab);
    }

    getStackTrace(): string {
        const error = new Error();
        return error.stack ?? 'No stack trace available';
    }

    getActiveTab(): TabState | undefined {
        return this.tabs.find((tab) => tab.active);
    }

    setActiveTab(tabId: TabId) {
        let tab = this.tabs.find((tab) => tab.id === tabId);
        if (!tab) {
            console.error(`Tab with id ${tabId} not found`);
            return;
        }

        let indices = [this.tabs.findIndex((tab) => tab.id === tabId)];
        let activeTabIndex = this.tabs.findIndex((tab) => tab.active);
        if (activeTabIndex !== -1) {
            indices.push(activeTabIndex);
            this.connections.get(tabId)?.page.stopVideo();
        }

        this.setTabs(indices, "active", (active) => !active);
        this.connections.get(tabId)?.page.startVideo();
    }

    resize(width: number, height: number) {
        this.browser?.resize(width, height);
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

            goTo: (url: string) => this.goTo(id, url),
            activate: () => this.setActiveTab(tab.id),
            close: () => this.closeTab(tab.id),
            goBack: () => this.goBack(id),
            goForward: () => this.goForward(id),
            reload: () => this.reload(id),
        };

        this.setTabs((prev) => [...prev, state]);
        this.setActiveTab(id);
    }
}