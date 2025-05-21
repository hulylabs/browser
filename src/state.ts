import { CEFClient, LoadState } from "cef-client";
import { createStore, SetStoreFunction } from "solid-js/store";
import { BrowserPlugin } from "./plugins/plugin";
import { createUniqueId } from "solid-js";

type TabId = string;

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
    cefPort: number = -1;

    cefClients: Map<TabId, CEFClient>;
    tabs: TabState[];
    setTabs: SetStoreFunction<TabState[]>;

    plugins: BrowserPlugin[];

    constructor() {
        [this.tabs, this.setTabs] = createStore<TabState[]>([]);
        this.cefClients = new Map();
        this.plugins = [];
    }

    addPlugin(plugin: BrowserPlugin) {
        plugin.setup(this);
        this.plugins.push(plugin);
    }

    setPort(port: number) {
        this.cefPort = port;
    }

    newTab(url?: string) {
        let id = createUniqueId();
        this.cefClients.set(id, new CEFClient("ws://localhost:" + this.cefPort + "/"));
        this.cefClients.get(id)!.onTitleChanged = (title: string) => {
            this.setTabs((tab) => id == tab.id, "title", title);
        }
        this.cefClients.get(id)!.onNewTabRequested = (url: string) => {
            this.newTab(url);
        }
        this.cefClients.get(id)!.onFaviconUrlChanged = (faviconUrl: string) => {
            this.setTabs((tab) => id == tab.id, "faviconUrl", faviconUrl);
        }
        this.cefClients.get(id)!.onLoadStateChanged = (state: LoadState) => {
            this.setTabs((tab) => id == tab.id, "canGoBack", state.canGoBack);
            this.setTabs((tab) => id == tab.id, "canGoForward", state.canGoForward);
        }

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
            this.cefClients.get(this.tabs[activeTabIndex].id)?.stopVideo();
        }

        this.setTabs(indices, "active", (active) => !active);
        this.cefClients.get(tabId)!.startVideo();
    }

    resizeActiveTab(width: number, height: number) {
        let activeTab = this.getActiveTab();
        if (activeTab) {
            this.cefClients.get(activeTab.id)!.resize(width, height);
        }
    }

    goTo(tabId: TabId, url: string) {
        this.cefClients.get(tabId)!.goTo(url);
    }

    goBack(tabId: TabId) {
        this.cefClients.get(tabId)!.goBack();
    }

    goForward(tabId: TabId) {
        this.cefClients.get(tabId)!.goForward();
    }

    reload(tabId: TabId) {
        this.cefClients.get(tabId)!.reload();
    }

    closeTab(tabId: TabId) {
        let index = this.tabs.findIndex((tab) => tab.id === tabId);
        let tabToClose = this.tabs[index];
        let onlyTab = this.tabs.length == 1;

        this.setTabs(tabs => tabs.filter(tab => tab.id !== tabId));
        this.cefClients.get(tabId)!.close();
        this.cefClients.delete(tabId);

        if (onlyTab) {
            return;
        }

        if (tabToClose.active) {
            let newActiveTabIndex = index - 1 < 0 ? 0 : index - 1;
            this.setActiveTab(this.tabs[newActiveTabIndex].id);
        }
    }
}