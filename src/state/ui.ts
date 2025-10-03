import { Accessor, createSignal, Setter } from "solid-js";

export interface UICallbacks {
    focusUrl: (() => void) | null;
    showNewTabInput: (() => void) | null;
}

export class UIState {
    browserFocused: Accessor<boolean>;
    setBrowserFocused: Setter<boolean>;

    private callbacks: UICallbacks;

    constructor() {
        [this.browserFocused, this.setBrowserFocused] = createSignal(false);

        this.callbacks = {
            focusUrl: null,
            showNewTabInput: null
        };
    }

    setFocusUrlCallback(callback: () => void) {
        this.callbacks.focusUrl = callback;
    }

    setShowNewTabInputCallback(callback: () => void) {
        this.callbacks.showNewTabInput = callback;
    }

    focusUrl() {
        if (this.callbacks.focusUrl) {
            this.callbacks.focusUrl();
        }
    }

    showNewTabInput() {
        if (this.callbacks.showNewTabInput) {
            this.callbacks.showNewTabInput();
        } else {
            console.warn("showNewTabInputCallback is not set");
        }
    }

    isBrowserFocused(): boolean {
        return this.browserFocused();
    }
}