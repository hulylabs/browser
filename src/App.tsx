import { For } from "solid-js";
import "./App.css";
import Input from "./components/sidebar/Input";
import Tab from "./components/sidebar/Tab";
import TitleBar from "./components/TitleBar";
import { getCurrentWindow } from "@tauri-apps/api/window";
import NewTabButton from "./components/sidebar/NewTabButton";
import { App } from "./model";
import Browser from "./components/Browser";


function AppComponent() {
  let window = getCurrentWindow();
  console.log(window);
  let app = new App(window);

  return (
    <div class="app">
      <div class="sidebar">
        <div class="buttons"></div>
        <Input app={app} />
        <NewTabButton onClick={() => app.newTab()} />
        <For each={app.tabs}>{(tab) => (
          <Tab tab={tab} />
        )}
        </For>
      </div>

      <div class="main">
        <div class="browser">
          <Browser state={app} />
        </div>
      </div>

    </div >
  );
}

export default AppComponent;
