import { createSignal, onMount, Show } from "solid-js";
import { AppEvent, AppState, Arguments, initializeApp } from "./state/state";
import Browser from "./components/browser/Browser";
import Notification from "./components/Notification";
import "./App.css";
import { invoke } from "@tauri-apps/api/core";
import Sidebar from "./components/sidebar/Layout";
import { getCurrentWindow } from "@tauri-apps/api/window";

function App() {
  let [event, setEvent] = createSignal<AppEvent>({ message: "Initializing App", type: "info" });
  let [app, setApp] = createSignal<AppState | null>(null);

  onMount(async () => {
    const args = await invoke("get_args") as Arguments;
    let app = await initializeApp(args, setEvent);
    if (!app) return;
    setApp(app);

    getCurrentWindow().listen("tauri://close-requested", async (_) => {
      await app.save();
      await getCurrentWindow().destroy();
    });
  });

  return (
    <Show when={app()} fallback={<Notification message={event().message} type={event().type} />}>
      {(app) =>
        <div class="app">
          <div class="sidebar">
            <Sidebar app={app()} />
          </div>
          <div class="browser">
            <Browser app={app()} />
          </div>
        </div>
      }
    </Show >
  )
}

export default App;
