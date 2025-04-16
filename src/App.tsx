import Browser from "./components/Browser";
import "./App.css";
import { For } from "solid-js";
import Input from "./components/sidebar/Input";
import NewTabButton from "./components/sidebar/NewTabButton";
import Tab from "./components/sidebar/Tab";
import { App } from "./app";

function AppComponent() {
  let app = new App();

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
