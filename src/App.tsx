import { For } from "solid-js";
import "./App.css";
import Input from "./components/Input";
import Tab from "./components/Tab";
import TitleBar from "./components/TitleBar";
import { AppState } from "./model";
import { getCurrentWindow } from "@tauri-apps/api/window";
import NewTabButton from "./components/NewTabButton";


function App() {
  let window = getCurrentWindow();
  console.log(window);
  let appState = new AppState(window);

  return (
    <div class="app">
      <div class="sidebar">
        <div class="buttons"></div>
        <Input />
        <NewTabButton onClick={() => appState.newTab()} />
        <For each={appState.tabs}>{(tab) => (
          <Tab model={tab} />
        )}
        </For>
      </div>

      <div class="main">
        <TitleBar state={appState} />
        <div class="browser"></div>
      </div>

    </div >
  );
}

export default App;
