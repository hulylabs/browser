import "./App.css";
import TitleBar from "./components/TitleBar";
import { AppState } from "./model";
import { getCurrentWindow } from "@tauri-apps/api/window";


function App() {
  let window = getCurrentWindow();
  console.log(window);
  let appState = new AppState(window);

  return (
    <div class="app">
      <div class="sidebar"></div>

      <div class="main">
        <TitleBar state={appState} />
        <div class="browser"></div>
      </div>

    </div >
  );
}

export default App;
