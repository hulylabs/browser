import { Browser, connect } from "cef-client";
import { createStore, SetStoreFunction } from "solid-js/store";
import { BrowserPlugin } from "./plugins/plugin";
import { invoke } from "@tauri-apps/api/core";
import { LoadState, TabEventStream } from "cef-client/dist/event_stream";
import { Tab } from "cef-client/dist/tab";


type TabId = number;

export interface TabState {
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
    private cefPort: number = -1;
    private plugins: BrowserPlugin[];

    browser: Browser | undefined;
    tabStreams: Map<TabId, TabEventStream>;

    tabConnections: Map<TabId, Tab>;
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
        this.tabConnections = new Map();
        this.plugins = [];

        connect("ws://localhost:" + this.cefPort + "/browser").then((browser) => {
            this.browser = browser;
        });
        // Better do
        // (function loop() {
        //   setTimeout(() => {
        //     // Your logic here

        //     loop();
        //   }, delay);
        // })();

        // setInterval(async () => {
        //     let tabIds = await this.browser.getTabs();

        //     for (let id of tabIds) {
        //         if (!this.tabs.some(t => t.id === id)) {
        //             let tabEventStream = new TabEventStream("ws://localhost:" + this.cefPort + "/tab/" + id);

        //             this.tabStreams.set(id, tabEventStream);

        //             tabEventStream.onFaviconUrlChanged = (url: string) => {
        //                 this.setTabs(tab => tab.id === id, "faviconUrl", url);
        //             };

        //             tabEventStream.onLoadStateChanged = (state: LoadState) => {
        //                 this.setTabs(tab => tab.id === id, "canGoBack", state.canGoBack);
        //                 this.setTabs(tab => tab.id === id, "canGoForward", state.canGoForward);
        //             };

        //             tabEventStream.onTitleChanged = (title: string) => {
        //                 this.setTabs(tab => tab.id === id, "title", title);
        //             };

        //             let tab: TabState = {
        //                 id: id,
        //                 title: "New Tab",
        //                 faviconUrl: "",
        //                 active: false,
        //                 canGoBack: false,
        //                 canGoForward: false,

        //                 goTo: (url: string) => this.goTo(id, url),
        //                 activate: () => this.setActiveTab(tab.id),
        //                 close: () => this.closeTab(tab.id),
        //                 goBack: () => this.goBack(id),
        //                 goForward: () => this.goForward(id),
        //                 reload: () => this.reload(id),
        //             };

        //             this.setTabs((prev) => [...prev, tab]);
        //         }
        //     }

        // }, 5000);
    }

    addPlugin(plugin: BrowserPlugin) {
        plugin.setup(this);
        this.plugins.push(plugin);
    }

    async newTab(url?: string) {
        let tab = await this.browser?.openTab({ url })!;
        let id = tab.id;
        let tabEventStream = tab.events();

        this.tabConnections.set(id, tab);
        this.tabStreams.set(tab.id, tabEventStream);

        tabEventStream.on("Favicon", (url: string) => {
            this.setTabs(tab => tab.id === id, "favicon", url);
        });

        tabEventStream.on("LoadState", (state: LoadState) => {
            this.setTabs(tab => tab.id === id, "canGoBack", state.canGoBack);
            this.setTabs(tab => tab.id === id, "canGoForward", state.canGoForward);
        });

        tabEventStream.on("Title", (title: string) => {
            this.setTabs(tab => tab.id === id, "title", title);
        });

        let tabState: TabState = {
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

        if (url) {
            this.goTo(id, url);
        }

        this.setTabs((prev) => [...prev, tabState]);
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
            this.tabConnections.get(this.tabs[activeTabIndex].id)?.stopVideo();
        }

        this.setTabs(indices, "active", (active) => !active);
        this.tabConnections.get(tabId)?.startVideo();
    }

    resize(width: number, height: number) {
        this.browser?.resize(width, height);
    }

    goTo(tabId: TabId, url: string) {
        this.tabConnections.get(tabId)?.navigate(url);
    }

    goBack(tabId: TabId) {
        this.tabConnections.get(tabId)?.back();
    }

    goForward(tabId: TabId) {
        this.tabConnections.get(tabId)?.forward();
    }

    reload(tabId: TabId) {
        this.tabConnections.get(tabId)?.reload();
    }

    closeTab(tabId: TabId) {
        let index = this.tabs.findIndex((tab) => tab.id === tabId);
        let tabToClose = this.tabs[index];
        let onlyTab = this.tabs.length == 1;

        this.setTabs(tabs => tabs.filter(tab => tab.id !== tabId));
        this.tabStreams.delete(tabId);
        this.tabConnections.get(tabId)?.close();
        this.tabConnections.delete(tabId);
        if (onlyTab) {
            return;
        }

        if (tabToClose.active) {
            let newActiveTabIndex = index - 1 < 0 ? 0 : index - 1;
            this.setActiveTab(this.tabs[newActiveTabIndex].id);
        }
    }
}