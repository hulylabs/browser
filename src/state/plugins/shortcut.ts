import { AppState } from "../state";
import { BrowserPlugin } from "./plugin";


type Shortcut = string;
type ActionID = string;

export class ShortcutPlugin implements BrowserPlugin {
    shortcuts: Map<Shortcut, ActionID> = new Map();
    actions: Map<ActionID, () => void> = new Map();

    setup(app: AppState) {
        window.addEventListener("keydown", (e) => {
            let keys = [];
            if (e.ctrlKey) keys.push("ctrl");
            if (e.shiftKey) keys.push("shift");
            if (e.altKey) keys.push("alt");
            if (e.metaKey) keys.push("meta");
            keys.push(e.key.toLowerCase());

            let shortcut = keys.join("+");

            if (this.shortcuts.has(shortcut)) {
                e.preventDefault();
                let actionId = this.shortcuts.get(shortcut)!;
                this.actions.get(actionId)!();

            }
        })

        this.shortcuts.set("ctrl+t", "newTab");
        this.shortcuts.set("ctrl+w", "closeTab");
        this.shortcuts.set("ctrl+a", "selectAll");
        this.shortcuts.set("ctrl+c", "copy");
        this.shortcuts.set("ctrl+v", "paste");
        this.shortcuts.set("ctrl+x", "cut");
        this.shortcuts.set("ctrl+z", "undo");
        this.shortcuts.set("ctrl+y", "redo");

        this.actions.set("newTab", () => app.newTab());
        this.actions.set("closeTab", () => app.getActiveTab()?.close());
        this.actions.set("selectAll", () => app.getActiveTab()?.selectAll());
        this.actions.set("copy", () => app.getActiveTab()?.copy());
        this.actions.set("paste", () => app.getActiveTab()?.paste());
        this.actions.set("cut", () => app.getActiveTab()?.cut());
        this.actions.set("undo", () => app.getActiveTab()?.undo());
        this.actions.set("redo", () => app.getActiveTab()?.redo());

    }
}

