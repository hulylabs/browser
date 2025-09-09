import { createSignal, onMount, Show } from "solid-js";
import { AppEvent, AppState, Arguments, initializeApp } from "./state/state";
import Browser from "./components/Browser";
import Notification from "./components/Notification";
import "./App.css";
import { invoke } from "@tauri-apps/api/core";
import Sidebar from "./components/sidebar";
import { ShortcutPlugin } from "./state/plugins/shortcut";




function App() {
  let [event, setEvent] = createSignal<AppEvent>({ message: "Initializing App", type: "info" });
  let [app, setApp] = createSignal<AppState | null>(null);

  onMount(async () => {
    const args = await invoke("get_args") as Arguments;
    let app = await initializeApp(args, setEvent);
    if (!app) return;
    app.addPlugin(new ShortcutPlugin());
    setApp(app);
  });

  return (
    <Show when={app()} fallback={<Notification message={event().message} type={event().type} />}>
      {(app) =>
        <div class="app">
          <Sidebar app={app()} />
          <div class="browser">
            <Browser app={app()} />
          </div>
        </div>
      }
    </Show >
  )
}

export default App;
