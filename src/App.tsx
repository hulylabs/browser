import { For } from "solid-js";
import { AppState } from "./state";
import Browser from "./components/Browser";
import Input from "./components/sidebar/Input";
import NewTabButton from "./components/sidebar/NewTabButton";
import Tab from "./components/sidebar/Tab";
import "./App.css";
import TabControls from "./components/sidebar/TabControls";
import { ShortcutPlugin } from "./plugins/shortcuts/shortcut";

function App() {
  let app = new AppState();
  app.addPlugin(new ShortcutPlugin());

  return (
    <div class="app">
      <div class="sidebar">
        <TabControls app={app} />
        <Input app={app} />
        <NewTabButton onClick={() => app.newTab()} />
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
