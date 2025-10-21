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

    private isMac = navigator.userAgent.toLowerCase().includes("mac");

    constructor(app: AppState) {
        window.addEventListener("keydown", (e) => {
            let shortcut = this.eventToShortcut(e);

            if (this.shortcuts.has(shortcut)) {
                let action = this.actions.get(this.shortcuts.get(shortcut) ?? "");
                if (!action) return;

                if (action.ctx == "global") {
                    action.execute();
                }

                if (action.ctx == "webpage" && app.ui.browserFocused()) {
                    e.preventDefault();
                    action.execute();
                }
            }
        });

        let modifier = this.isMac ? "meta" : "ctrl";

        this.shortcuts.set(`${modifier}+t`, "showInput");
        this.shortcuts.set(`${modifier}+w`, "closeTab");
        this.shortcuts.set(`${modifier}+r`, "reload");
        this.shortcuts.set(`${modifier}+a`, "selectAll");
        this.shortcuts.set(`${modifier}+c`, "copy");
        this.shortcuts.set(`${modifier}+v`, "paste");
        this.shortcuts.set(`${modifier}+x`, "cut");
        this.shortcuts.set(`${modifier}+z`, "undo");
        this.shortcuts.set(`${modifier}+y`, "redo");
        this.shortcuts.set("alt+g", "focusOnAddressBar");
        this.shortcuts.set("ctrl+tab", "nextTab");
        this.shortcuts.set("ctrl+shift+tab", "previousTab");

        this.actions.set("showInput", { ctx: "global", execute: () => app.ui.showNewTabInput() });
        this.actions.set("closeTab", { ctx: "global", execute: () => app.tabs.getActive()?.close() });
        this.actions.set("reload", { ctx: "webpage", execute: () => app.tabs.getActive()?.reload() });
        this.actions.set("selectAll", { ctx: "webpage", execute: () => app.tabs.getActive()?.selectAll() });
        this.actions.set("copy", { ctx: "webpage", execute: () => app.tabs.getActive()?.copy() });
        this.actions.set("paste", { ctx: "webpage", execute: () => app.tabs.getActive()?.paste() });
        this.actions.set("cut", { ctx: "webpage", execute: () => app.tabs.getActive()?.cut() });
        this.actions.set("undo", { ctx: "webpage", execute: () => app.tabs.getActive()?.undo() });
        this.actions.set("redo", { ctx: "webpage", execute: () => app.tabs.getActive()?.redo() });
        this.actions.set("focusOnAddressBar", { ctx: "global", execute: () => app.ui.focusUrl() });
        this.actions.set("nextTab", { ctx: "global", execute: () => app.tabs.shift(true) });
        this.actions.set("previousTab", { ctx: "global", execute: () => app.tabs.shift(false) });
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

        let keyCode = e.code.toLowerCase();
        let modifierKeys = ["controlleft", "controlright", "shiftleft", "shiftright", "altleft", "altright", "meta"];
        if (!modifierKeys.includes(keyCode)) {
            if (keyCode.startsWith("key")) {
                keyCode = keyCode.substring(3);
            }
            else if (keyCode.startsWith("digit")) {
                keyCode = keyCode.substring(5);
            }
            keys.push(keyCode);
        }

        let shortcut = keys.join("+");
        return shortcut;
    }
}

