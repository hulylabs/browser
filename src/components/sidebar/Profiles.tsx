import { For } from "solid-js";
import { AppState } from "../../state";

export function Profiles(props: { app: AppState }) {
  return (
    <div class="profiles">
      <h2>Profiles</h2>
      <ul>
        <For each={props.app.profiles}>
          {(profile) => (
            <li>{profile.name}</li>
          )}
        </For>
      </ul>
    </div>
  );
}
