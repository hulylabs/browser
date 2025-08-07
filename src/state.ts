import { Browser, connect, LoadState, Tab, TabEventStream } from "cef-client";
import { createStore, SetStoreFunction } from "solid-js/store";
import { BrowserPlugin } from "./plugins/plugin";
import { Accessor, createSignal } from "solid-js";
import { LoadStatus } from "cef-client/dist/types";

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
    isLoading: boolean;

    goTo: (url: string) => void;
    activate: () => void;
    close: () => void;
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
}

export class AppState {
    private plugins: BrowserPlugin[];

    useServerSize: boolean = false;

    browser: Browser | undefined;
    connections: Map<TabId, TabConnection> = new Map();

    serverSize: Accessor<{ width: number; height: number } | undefined>;
    setServerSize: (size: { width: number; height: number }) => void;

    tabs: TabState[];
    setTabs: SetStoreFunction<TabState[]>;

    constructor(useServerSize: boolean = false) {
        [this.tabs, this.setTabs] = createStore<TabState[]>([]);
        this.plugins = [];
        this.useServerSize = useServerSize;

        [this.serverSize, this.setServerSize] = createSignal<{ width: number; height: number }>();
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

        if (this.useServerSize) {
            this.setServerSize(await this.browser.size());
        }

        this.setTabs([]);
        await this.fetchTabs();

        setInterval(async () => {
            if (!this.browser) {
                console.error("Browser is not connected");
                return;
            }

            let tabs = await this.browser?.tabs();
            for (let tab of tabs) {
                if (!this.tabs.some(t => t.id === tab.id)) {
                    this.addTab(tab);
                }
            }
        }, 5000);

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