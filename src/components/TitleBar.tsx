import { AppState } from "../model";
import "./Titlebar.css";

export default function TitleBar(props: { state: AppState }) {
    return (
        <div class="titlebar">
            <div class="tab-controls">
                <button><i class="fa-solid fa-arrow-left"></i></button>
                <button><i class="fa-solid fa-arrow-right"></i></button>
                <button><i class="fa-solid fa-rotate-right"></i></button>
            </div>
            <div class="window-controls">
                <button onClick={() => props.state.minimizeWindow()}><i class="fa-solid fa-window-minimize"></i></button>
                <button onClick={() => props.state.maximizeWindow()}><i class="fa-solid fa-expand"></i></button>
                <button onClick={() => props.state.closeWindow()}><i class="fa-solid fa-xmark"></i></button>
            </div>
        </div>
    );
}