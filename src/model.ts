import { CEFClient } from "cef-client";
import { Accessor, createSignal, createUniqueId, Setter } from "solid-js";
import { Window } from "@tauri-apps/api/window";
import { createStore, SetStoreFunction } from "solid-js/store";

type BrowserId = string;

export class TabModel {
    id: BrowserId;
    title: string;
    // TODO: maybe wrap with weak ref?
    state: App;

    constructor(state: App, id: BrowserId, title: string) {
        this.id = id;
        this.title = title;
        this.state = state;
    }

    goto(url: string) {
        this.state.goto(this.id, url);
    }

    active(): boolean {
        return this.state.getActiveTab().id == this.id;
    }

    activate() {
        this.state.setActiveTab(this.id);
    }
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
        [this.activeTabIndex, this.setActiveTabIndex] = createSignal<number>(0);
        this.cefClients = new Map();
        this.window = window;
    }

    newTab() {
        let ws = new WebSocket("ws://localhost:8080/");

        ws.onopen = () => {
            let cefClient = new CEFClient(ws);
            let tab = new TabModel(this, createUniqueId(), "New Tab");

            cefClient.onTitleChanged = (title: string) => {
                console.log(`Title changed to ${title}`);
                let index = this.tabs.findIndex((t => t.id === tab.id));
                console.log(`Tab index: ${index}`);

                if (index != -1) {
                    this.setTabs(index, "title", title);
                }

                for (let tab of this.tabs) {
                    console.log(tab);
                }
            }

            this.cefClients.set(tab.id, cefClient);
            this.setTabs((prev) => [...prev, tab]);
            this.setActiveTabIndex(this.tabs.length - 1);
        }
    }

    getActiveTab(): TabModel {
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