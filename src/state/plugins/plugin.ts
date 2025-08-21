import { AppState } from "../state";

export interface BrowserPlugin {
    setup: (app: AppState) => void;
}