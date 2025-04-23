import { CEFClient } from "cef-client";
import { Accessor, createSignal, createUniqueId, Setter } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";

type TabId = string;

export interface TabState {
    id: TabId;
    title: string;
    canGoBack: boolean;
    canGoForward: boolean;

    goto: (url: string) => void;
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
            let cefClient = new CEFClient(ws);
            let tab: TabState = {
                id: createUniqueId(),
                title: "New Tab",

                goto: (url: string) => cefClient.goTo(url),
                active: () => this.getActiveTab() ? tab.id === this.getActiveTab()!.id : false,
                activate: () => (this.setActiveTab(tab.id), cefClient.startVideo()),
                close: () => this.closeTab(tab.id),
                goBack: () => cefClient.goBack(),
                goForward: () => cefClient.goForward(),
                reload: () => cefClient.reload(),
            };

            cefClient.onTitleChanged = (title: string) => {
                this.setTabs((tabs) => tabs.id == tab.id, "title", title);
            }

            this.cefClients.set(tab.id, cefClient);
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


        // TODO: add cefClient.startVideo()
        let index = this.tabs.findIndex((tab) => tab.id === tabId);
        if (index !== -1) {
            this.setActiveTabIndex(index);
        }
    }

    resizeActiveTab(width: number, height: number) {
        let activeTab = this.getActiveTab();
        if (activeTab) {
            let cefClient = this.cefClients.get(activeTab.id);
            if (cefClient) {
                cefClient.onResize(width, height);
            }
        }
    }

    goto(TabId: TabId, url: string) {
        let cefClient = this.cefClients.get(TabId);
        if (cefClient) {
            cefClient.goTo(url);
        }
    }

    closeTab(TabId: TabId) {
        let index = this.tabs.findIndex((tab) => tab.id === TabId);

        console.log(`Closing tab ${TabId} at index ${index}`);

        this.setTabs(tabs => tabs.filter(tab => tab.id !== TabId));
        this.cefClients.get(TabId)?.close();
        this.cefClients.delete(TabId);

        if (index == this.activeTabIndex()) {
            this.setActiveTabIndex(index - 1 < 0 ? 0 : index - 1);
        } else if (index < this.activeTabIndex()) {
            this.setActiveTabIndex(this.activeTabIndex() - 1);
        }
    }
}