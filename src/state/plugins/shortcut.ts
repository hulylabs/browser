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

        this.actions.set("newTab", () => {
            app.newTab();
        });

        this.actions.set("closeTab", () => {
            let activeTab = app.getActiveTab();
            if (activeTab) {
                activeTab.close();
            }
        });

        this.actions.set("selectAll", () => {
            let activeTab = app.getActiveTab();
            if (activeTab) {
                console.log("Selecting all");
                activeTab.selectAll();
            }
        });

    }
}

