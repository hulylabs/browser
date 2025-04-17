import { For } from "solid-js";
import { AppState } from "./state";
import Browser from "./components/Browser";
import Input from "./components/sidebar/Input";
import NewTabButton from "./components/sidebar/NewTabButton";
import Tab from "./components/sidebar/Tab";
import "./App.css";

function AppComponent() {
  let app = new AppState();

  return (
    <div class="app">
      <div class="sidebar">
        <Input app={app} />
        <NewTabButton onClick={() => app.newTab()} />
        <For each={app.tabs}>{(tab) => (
          <Tab tab={tab} />
        )}
        </For>
      </div>

      <div class="browser">
        <Browser app={app} />
      </div>
    </div>
  )
}

export default AppComponent;
