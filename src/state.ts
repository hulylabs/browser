import { CEFClient } from "cef-client";
import { Accessor, createSignal, createUniqueId, Setter } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";

type BrowserId = string;

export interface TabState {
    id: BrowserId;
    title: string;

    goto: (url: string) => void;
    active: () => boolean;
    activate: () => void;
}

export class AppState {
    cefClients: Map<BrowserId, CEFClient>;
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
                activate: () => {
                    this.setActiveTab(tab.id);
                    cefClient.startVideo();
                }
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

    setActiveTab(tabId: BrowserId) {
        let activeTab = this.getActiveTab();
        if (activeTab) {
            let cefClient = this.cefClients.get(activeTab.id);
            if (cefClient) {
                cefClient.stopVideo();
            }
        }

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

    goto(browserId: BrowserId, url: string) {
        let cefClient = this.cefClients.get(browserId);
        if (cefClient) {
            cefClient.goTo(url);
        }
    }
}