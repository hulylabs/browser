import { Browser, connect } from "cef-client";
import { ProfileManager } from "./profiles";
import { invoke } from "@tauri-apps/api/core";
import { Setter } from "solid-js";
import { Shortcuts } from "./shortcuts";
import { Downloads } from "./downloads";
import { UIState } from "./ui";
import { Bookmarks } from "./bookmarks";
import { BaseDirectory } from "@tauri-apps/api/path";
import { exists, mkdir, readTextFile } from "@tauri-apps/plugin-fs";
import { AppConfig, browserConfig, observerConfig } from "./config";
import { Tabs } from "./tabs";

export class AppState {
    private config: AppConfig;
    private client: Browser;

    tabs: Tabs;
    downloads: Downloads;
    shortcuts: Shortcuts;
    bookmarks: Bookmarks;
    profiles: ProfileManager | undefined;
    ui: UIState;

    constructor(config: AppConfig, client: Browser, profiles?: ProfileManager) {
        this.config = config;
        this.client = client;

        this.tabs = new Tabs(config, client);
        this.downloads = new Downloads();
        this.shortcuts = new Shortcuts(this);
        this.bookmarks = new Bookmarks();
        this.profiles = profiles;
        this.ui = new UIState();

        if (this.config.shouldRestore) {
            this.restore(client);
        }

        if (this.config.shouldFetch) {
            setInterval(async () => await this.tabs.fetch(), 5000);
        }
    }

    async setClient(client: Browser) {
        this.client.closeConnection();
        this.tabs.clear();

        this.client = client;
        setInterval(async () => await this.tabs.fetch(), 5000);
    }

    async save() {
        if (!this.config.shouldSave) {
            console.error("Save operation is disabled in the current config.");
            return;
        }

        if (!await exists('', { baseDir: BaseDirectory.AppData })) {
            await mkdir('', { baseDir: BaseDirectory.AppData });
        }

        await this.tabs.save();
        await this.bookmarks.save();
    }

    async restore(client: Browser) {
        try {
            await this.bookmarks.load();
            let content = await readTextFile('tabs.json', { baseDir: BaseDirectory.AppData });
            const tabs = JSON.parse(content);

            for (let bookmark of this.bookmarks.all()) {
                let newTab = await client.openTab({ url: bookmark.url });
                this.tabs.add(newTab, { title: bookmark.title, url: bookmark.url, favicon: bookmark.favicon, pinned: true });
            }

            for (let tab of tabs) {
                let newTab = await client.openTab({ url: tab.url });
                this.tabs.add(newTab, tab);
            }
        } catch (err) {
            console.error("Error restoring tabs:", err);
        }
    }

    resize(width: number, height: number) {
        this.client.resize(width, height);
    }
}

export interface Arguments {
    profiles_enabled: boolean;
    cef_manager: string;
    cef: string;
}

export interface AppEvent {
    message: string;
    type: 'info' | 'error';
}

async function launchCEF(setEvent: Setter<AppEvent>): Promise<AppState | null> {
    try {
        setEvent({ message: 'Checking CEF presence...', type: 'info' });
        let present = await invoke('is_cef_present');
        if (!present) {
            setEvent({ message: 'CEF not found, downloading...', type: 'info' });
            await invoke('download_cef');
        }

        setEvent({ message: 'Launching CEF...', type: 'info' });
        let addr = await invoke('launch_cef');
        let browser = await connect(addr as string);
        return new AppState(browserConfig, browser);
    } catch (e) {
        const errorMessage = "Failed to launch CEF: " + (e instanceof Error ? e.message : String(e));
        setEvent({ message: errorMessage, type: 'error' });
        return null;
    }
}

async function connectToCefInstance(cefAddress: string, setEvent: Setter<AppEvent>): Promise<AppState | null> {
    try {
        setEvent({ message: 'Connecting to CEF instance...', type: 'info' });
        let browser = await connect(cefAddress);
        return new AppState(browserConfig, browser);
    } catch (e) {
        const errorMessage = "Failed to connect to CEF instance: " + (e instanceof Error ? e.message : String(e));
        setEvent({ message: errorMessage, type: 'error' });
        return null;
    }
}

async function connectToManager(managerAddress: string, setEvent: Setter<AppEvent>): Promise<AppState | null> {
    try {
        setEvent({ message: 'Connecting...', type: 'info' });
        const profileManager = new ProfileManager(managerAddress);
        const profiles = await profileManager.getProfiles();
        if (profiles.length === 0) {
            setEvent({ message: 'No profiles found', type: 'error' });
            return null;
        }

        profileManager.setSelected(profiles[0]);
        const client = await profileManager.connect(profiles[0]);
        return new AppState(observerConfig, client, profileManager);
    } catch (e) {
        const errorMessage = "Failed to connect to manager: " + (e instanceof Error ? e.message : String(e));
        setEvent({ message: errorMessage, type: 'error' });
        return null;
    }
}

export async function initializeApp(args: Arguments, setEvent: Setter<AppEvent>): Promise<AppState | null> {
    if (args.profiles_enabled) {
        return await connectToManager(args.cef_manager, setEvent);
    } else if (args.cef !== "") {
        return await connectToCefInstance(args.cef, setEvent);
    } else {
        return await launchCEF(setEvent);
    }
}