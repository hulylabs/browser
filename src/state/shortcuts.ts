import { AppState } from "./state";

type Shortcut = string;
type ActionID = string;
type Context = "webpage" | "global";

interface Action {
    ctx: Context;
    execute: () => void;
}

export class Shortcuts {
    shortcuts: Map<Shortcut, ActionID> = new Map();
    actions: Map<ActionID, Action> = new Map();

    constructor(app: AppState) {
        window.addEventListener("keydown", (e) => {
            let shortcut = this.eventToShortcut(e);

            if (this.shortcuts.has(shortcut)) {
                let action = this.actions.get(this.shortcuts.get(shortcut) ?? "");
                if (!action) return;

                if (action.ctx == "global") {
                    action.execute();
                }

                if (action.ctx == "webpage" && app.browserFocused()) {
                    e.preventDefault();
                    action.execute();
                }
            }
        });

        this.shortcuts.set("ctrl+t", "newTab");
        this.shortcuts.set("ctrl+w", "closeTab");
        this.shortcuts.set("ctrl+a", "selectAll");
        this.shortcuts.set("ctrl+c", "copy");
        this.shortcuts.set("ctrl+v", "paste");
        this.shortcuts.set("ctrl+x", "cut");
        this.shortcuts.set("ctrl+z", "undo");
        this.shortcuts.set("ctrl+y", "redo");
        this.shortcuts.set("alt+g", "focusOnAddressBar");
        this.shortcuts.set("ctrl+tab", "nextTab");
        this.shortcuts.set("ctrl+shift+tab", "previousTab");

        this.actions.set("newTab", { ctx: "global", execute: () => app.newTab() });
        this.actions.set("closeTab", { ctx: "global", execute: () => app.getActiveTab()?.close() });
        this.actions.set("selectAll", { ctx: "webpage", execute: () => app.getActiveTab()?.selectAll() });
        this.actions.set("copy", { ctx: "webpage", execute: () => app.getActiveTab()?.copy() });
        this.actions.set("paste", { ctx: "webpage", execute: () => app.getActiveTab()?.paste() });
        this.actions.set("cut", { ctx: "webpage", execute: () => app.getActiveTab()?.cut() });
        this.actions.set("undo", { ctx: "webpage", execute: () => app.getActiveTab()?.undo() });
        this.actions.set("redo", { ctx: "webpage", execute: () => app.getActiveTab()?.redo() });
        this.actions.set("focusOnAddressBar", { ctx: "global", execute: () => app.focusUrl() });
        this.actions.set("nextTab", { ctx: "global", execute: () => app.shiftTab(true) });
        this.actions.set("previousTab", { ctx: "global", execute: () => app.shiftTab(false) });
    }

    checkShortcutConflict(e: KeyboardEvent): boolean {
        let shortcut = this.eventToShortcut(e);
        return this.shortcuts.has(shortcut);
    }

    private eventToShortcut(e: KeyboardEvent): string {
        let keys = [];
        if (e.ctrlKey) keys.push("ctrl");
        if (e.shiftKey) keys.push("shift");
        if (e.altKey) keys.push("alt");
        if (e.metaKey) keys.push("meta");

        let modifierKeys = ["controlleft", "controlright", "shiftleft", "shiftright", "altleft", "altright", "meta"];
        if (!modifierKeys.includes(e.code.toLowerCase())) {
            keys.push(e.code.toLowerCase());
        }

        let shortcut = keys.join("+");
        return shortcut;
    }
}

