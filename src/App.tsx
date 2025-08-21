import { For, Show } from "solid-js";
import { AppState } from "./state/state";
import Browser from "./components/Browser";
import Input from "./components/sidebar/Input";
import Tab from "./components/sidebar/Tab";
import "./App.css";
import TabControls from "./components/sidebar/TabControls";
import { ShortcutPlugin } from "./state/plugins/shortcuts/shortcut";
import { Profiles } from "./components/sidebar/Profiles";

function App(props: { app: AppState }) {
  let app = props.app;
  app.addPlugin(new ShortcutPlugin());

  return (
    <div class="app">
      <div class="sidebar">
        <TabControls app={app} />
        <Input app={app} />
        <Show when={app.profileManager}>
          <Profiles app={app} />
        </Show>
        <div onClick={() => app.newTab()} class="new-tab-button">
          <p> + New Tab</p>
        </div>
        <div class="tabs">
          <For each={app.tabs}>{(tab) => (
            <Tab tab={tab} />
          )}
          </For>
        </div>
      </div>

      <div class="browser">
        <Browser app={app} />
      </div>
    </div>
  )
}


export default App;
