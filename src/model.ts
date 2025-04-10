import { CEFClient } from "cef-client";
import { createUniqueId } from "solid-js";
import { Window } from "@tauri-apps/api/window";

export class Tab {
    id: string;
    title: string;
    url: string;

    cefClient: CEFClient;

    constructor(id: string, cefClient: CEFClient) {
        this.id = id;
        this.title = "New Tab";
        this.url = "about: blank";
        this.cefClient = cefClient;

        cefClient.onTitleChanged = (title: string) => {
            this.title = title;
        }
    }

    goTo(url: string) {
        this.cefClient.goTo(url);
    }
}

export class AppState {
    cefClients: Map<string, CEFClient>;
    tabs: Tab[];
    window: Window;

    constructor(window: Window) {
        this.cefClients = new Map();
        this.tabs = [];
        this.window = window;
    }

    newTab() {
        let ws = new WebSocket("ws://localhost:8080/");

        ws.onopen = () => {
            let tabId = createUniqueId();
            let cefClient = new CEFClient(ws);
            let tab = new Tab(tabId, cefClient);

            this.cefClients.set(tabId, cefClient);
            this.tabs.push(tab);
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