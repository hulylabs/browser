import { CEFClient } from "cef-client";
import { Accessor, createSignal, createUniqueId, Setter } from "solid-js";
import { Window } from "@tauri-apps/api/window";
import { createStore, SetStoreFunction } from "solid-js/store";

type BrowserId = string;

export interface TabModel {
    id: BrowserId;
    title: string;

    goto: (url: string) => void;
    active: () => boolean;
    activate: () => void;
}

export class App {
    cefClients: Map<BrowserId, CEFClient>;
    tabs: TabModel[];
    setTabs: SetStoreFunction<TabModel[]>;

    activeTabIndex: Accessor<number>;
    setActiveTabIndex: Setter<number>;

    window: Window;

    constructor(window: Window) {
        [this.tabs, this.setTabs] = createStore<TabModel[]>([]);
        [this.activeTabIndex, this.setActiveTabIndex] = createSignal<number>(-1);
        this.cefClients = new Map();
        this.window = window;
    }

    newTab() {
        let ws = new WebSocket("ws://localhost:8080/");
        // TODO: Remove this
        ws.binaryType = "arraybuffer";

        ws.onopen = () => {
            let cefClient = new CEFClient(ws);
            let tab: TabModel = {
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

    getActiveTab(): TabModel | undefined {
        return this.tabs[this.activeTabIndex()];
    }

    setActiveTab(tabId: BrowserId) {
        let index = this.tabs.findIndex((tab) => tab.id === tabId);
        if (index !== -1) {
            this.setActiveTabIndex(index);
        }
    }

    goto(browserId: BrowserId, url: string) {
        let cefClient = this.cefClients.get(browserId);
        if (cefClient) {
            cefClient.goTo(url);
        }
    }

    closeWindow() {
        this.window.close();
    }

    minimizeWindow() {
        this.window.minimize();
    }

    maximizeWindow() {
        this.window.toggleMaximize();
    }
}