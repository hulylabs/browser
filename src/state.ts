import { CEFClient } from "cef-client";
import { Accessor, createSignal, createUniqueId, Setter } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";

type TabId = string;

export interface TabState {
    id: TabId;
    title: string;
    canGoBack: boolean;
    canGoForward: boolean;

    goTo: (url: string) => void;
    active: () => boolean;
    activate: () => void;
    close: () => void;
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
}

export class AppState {
    cefClients: Map<TabId, CEFClient>;
    tabs: TabState[];
    setTabs: SetStoreFunction<TabState[]>;

    activeTabIndex: Accessor<number>;
    setActiveTabIndex: Setter<number>;

    constructor() {
        [this.tabs, this.setTabs] = createStore<TabState[]>([]);
        [this.activeTabIndex, this.setActiveTabIndex] = createSignal<number>(-1);
        this.cefClients = new Map();
    }

    newTab() {
        let ws = new WebSocket("ws://localhost:8080/");

        ws.onopen = () => {
            let id = createUniqueId();
            this.cefClients.set(id, new CEFClient(ws));

            this.cefClients.get(id)!.onTitleChanged = (title: string) => {
                this.setTabs((tabs) => tabs.id == tab.id, "title", title);
            }

            let tab: TabState = {
                id: id,
                title: "New Tab",
                canGoBack: true,
                canGoForward: true,

                goTo: (url: string) => this.goTo(id, url),
                active: () => this.getActiveTab() ? tab.id === this.getActiveTab()!.id : false,
                activate: () => this.setActiveTab(tab.id),
                close: () => this.closeTab(tab.id),
                goBack: () => this.goBack(id),
                goForward: () => this.goForward(id),
                reload: () => this.reload(id),
            };


            this.setTabs((prev) => [...prev, tab]);
            this.setActiveTabIndex(this.tabs.length - 1);
        }
    }

    getActiveTab(): TabState | undefined {
        return this.tabs[this.activeTabIndex()];
    }

    setActiveTab(tabId: TabId) {
        let activeTab = this.getActiveTab();
        if (activeTab) {
            let cefClient = this.cefClients.get(activeTab.id);
            if (cefClient) {
                cefClient.stopVideo();
            }
        }

        let index = this.tabs.findIndex((tab) => tab.id === tabId);
        if (index !== -1) {
            this.cefClients.get(tabId)!.startVideo();
            this.setActiveTabIndex(index);
        }
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

        this.setTabs(tabs => tabs.filter(tab => tab.id !== tabId));
        this.cefClients.get(tabId)!.close();
        this.cefClients.delete(tabId);

        if (index == this.activeTabIndex()) {
            this.setActiveTabIndex(index - 1 < 0 ? 0 : index - 1);
        } else if (index < this.activeTabIndex()) {
            this.setActiveTabIndex(this.activeTabIndex() - 1);
        }
    }
}