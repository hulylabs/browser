import { createSignal, For, onMount, Show } from "solid-js";
import { AppState } from "./state/state";
import Browser from "./components/Browser";
import Input from "./components/sidebar/Input";
import Tab from "./components/sidebar/Tab";
import Notification from "./components/Notification";
import "./App.css";
import TabControls from "./components/sidebar/TabControls";
import { Profiles } from "./components/sidebar/Profiles";
import { connect } from "cef-client";
import { Channel, invoke } from "@tauri-apps/api/core";
import { ProfileManager } from "./state/profiles";

interface Arguments {
  profiles_enabled: boolean;
  cef_manager: string;
  cef: string;
}

type LaunchEvent = 'Downloading' | 'Unpacking' | 'Launching';

async function launchCEF(channel: Channel<LaunchEvent>): Promise<AppState> {
  let addr = await invoke('launch_cef', { channel: channel });
  let browser = await connect(addr as string);
  return new AppState(browser);
}

async function connectToManager(managerAddress: string): Promise<AppState> {
  let profileManager = new ProfileManager(managerAddress);
  let profiles = await profileManager.getProfiles();
  if (profiles.length === 0) {
    throw new Error('No profiles found');
  }

  profileManager.setSelected(profiles[0]);
  let client = await profileManager.connect(profiles[0]);
  return new AppState(client, profileManager);

}

interface Event {
  message: string;
  type: 'info' | 'error';
}

function App() {
  let [event, setEvent] = createSignal<Event>({ message: "", type: "info" });
  let [app, setApp] = createSignal<AppState | null>(null);

  onMount(async () => {
    const channel = new Channel<LaunchEvent>();
    channel.onmessage = (event) => {
      setEvent({ message: `${event} Huly CEF...`, type: "info", title: "Information" });
    };

    try {
      const args = await invoke("get_args") as Arguments;

      let appState: AppState;
      if (args.profiles_enabled) {
        setEvent({ message: `Connecting to Huly CEF Manager on address ${args.cef_manager}`, type: "info" });
        appState = await connectToManager(args.cef_manager);
      } else if (args.cef !== "") {
        setEvent({ message: `Connecting to Huly CEF on address ${args.cef}`, type: "info" });
        const browser = await connect(args.cef);
        appState = new AppState(browser);
      } else {
        appState = await launchCEF(channel);
      }
      setApp(appState);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setEvent({ message: `Failed to initialize: ${errorMessage}`, type: "error" });
    }
  });

  return (
    <Show when={app()} fallback={<Notification message={event().message} type={event().type} />}>
      {(app) =>
        <div class="app" >
          <div class="sidebar">
            <TabControls app={app()} />
            <Input app={app()} />
            <Show when={app().profileManager}>
              <Profiles app={app()} />
            </Show>
            <div onClick={() => app().newTab()} class="new-tab-button">
              <p> + New Tab</p>
            </div>
            <div class="tabs">
              <For each={app().tabs}>{(tab) => (
                <Tab tab={tab} />
              )}
              </For>
            </div>
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
