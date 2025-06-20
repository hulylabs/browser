import { BrowserClient, LoadState, TabEventStream } from "cef-client";
import { createStore, SetStoreFunction } from "solid-js/store";
import { BrowserPlugin } from "./plugins/plugin";
import { invoke } from "@tauri-apps/api/core";


type TabId = number;

export interface TabState {
    id: TabId;
    title: string;
    faviconUrl: string;
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
    private cefPort: number = -1;
    private plugins: BrowserPlugin[];

    browserClient: BrowserClient;
    tabStreams: Map<TabId, TabEventStream>;

    tabs: TabState[];
    setTabs: SetStoreFunction<TabState[]>;


    constructor(port?: number) {
        if (!port) {
            invoke("launch_cef_command").then((value) => this.cefPort = value as number);
        } else {
            this.cefPort = port;
        }

        [this.tabs, this.setTabs] = createStore<TabState[]>([]);
        this.tabStreams = new Map();
        this.plugins = [];

        this.browserClient = new BrowserClient("ws://localhost:" + this.cefPort + "/browser");

        // Better do
        // (function loop() {
        //   setTimeout(() => {
        //     // Your logic here

        //     loop();
        //   }, delay);
        // })();

        setInterval(async () => {
            let tabIds = await this.browserClient.getTabs();

            for (let id of tabIds) {
                if (!this.tabs.some(t => t.id === id)) {
                    let tabEventStream = new TabEventStream("ws://localhost:" + this.cefPort + "/tab/" + id);

                    this.tabStreams.set(id, tabEventStream);

                    tabEventStream.onFaviconUrlChanged = (url: string) => {
                        this.setTabs(tab => tab.id === id, "faviconUrl", url);
                    };

                    tabEventStream.onLoadStateChanged = (state: LoadState) => {
                        this.setTabs(tab => tab.id === id, "canGoBack", state.canGoBack);
                        this.setTabs(tab => tab.id === id, "canGoForward", state.canGoForward);
                    };

                    tabEventStream.onTitleChanged = (title: string) => {
                        this.setTabs(tab => tab.id === id, "title", title);
                    };

                    let tab: TabState = {
                        id: id,
                        title: "New Tab",
                        faviconUrl: "",
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

                    this.setTabs((prev) => [...prev, tab]);
                }
            }

        }, 5000);
    }

    addPlugin(plugin: BrowserPlugin) {
        plugin.setup(this);
        this.plugins.push(plugin);
    }

    async newTab(url?: string) {
        let id = await this.browserClient.openTab(url);
        this.browserClient.startVideo(id);
        let tabEventStream = new TabEventStream("ws://localhost:" + this.cefPort + "/tab/" + id);

        this.tabStreams.set(id, tabEventStream);

        tabEventStream.onFaviconUrlChanged = (url: string) => {
            this.setTabs(tab => tab.id === id, "faviconUrl", url);
        };

        tabEventStream.onLoadStateChanged = (state: LoadState) => {
            this.setTabs(tab => tab.id === id, "canGoBack", state.canGoBack);
            this.setTabs(tab => tab.id === id, "canGoForward", state.canGoForward);
        };

        tabEventStream.onTitleChanged = (title: string) => {
            this.setTabs(tab => tab.id === id, "title", title);
        };

        let tab: TabState = {
            id: id,
            title: "New Tab",
            faviconUrl: "",
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

        if (url) {
            this.goTo(id, url);
        }

        this.setTabs((prev) => [...prev, tab]);
        this.setActiveTab(id);
    }

    getStackTrace(): string {
        const error = new Error();
        return error.stack ?? 'No stack trace available';
    }

    getActiveTab(): TabState | undefined {
        return this.tabs.find((tab) => tab.active);
    }

    setActiveTab(tabId: TabId) {
        let indices = [this.tabs.findIndex((tab) => tab.id === tabId)];
        let activeTabIndex = this.tabs.findIndex((tab) => tab.active);
        if (activeTabIndex !== -1) {
            indices.push(activeTabIndex);
            this.browserClient.stopVideo(this.tabs[activeTabIndex].id);
        }

        this.setTabs(indices, "active", (active) => !active);
        this.browserClient.startVideo(tabId);
    }

    resize(width: number, height: number) {
        this.browserClient.resize(width, height);
    }

    goTo(tabId: TabId, url: string) {
        this.browserClient.goTo(tabId, url);
    }

    goBack(tabId: TabId) {
        this.browserClient.goBack(tabId);
    }

    goForward(tabId: TabId) {
        this.browserClient.goForward(tabId);
    }

    reload(tabId: TabId) {
        this.browserClient.reload(tabId);
    }

    closeTab(tabId: TabId) {
        let index = this.tabs.findIndex((tab) => tab.id === tabId);
        let tabToClose = this.tabs[index];
        let onlyTab = this.tabs.length == 1;

        this.setTabs(tabs => tabs.filter(tab => tab.id !== tabId));
        this.tabStreams.delete(tabId);
        this.browserClient.closeTab(tabId);
        if (onlyTab) {
            return;
        }

        if (tabToClose.active) {
            let newActiveTabIndex = index - 1 < 0 ? 0 : index - 1;
            this.setActiveTab(this.tabs[newActiveTabIndex].id);
        }
    }
}