import { createResource, For, Show, createEffect } from "solid-js";
import { AppState } from "../../state/state";

export function Profiles(props: { app: AppState }) {
  const fetchProfiles = async () => {
    let profiles = await props.app.profileManager!.getProfiles();
    return profiles;
  };
  const [profiles] = createResource(fetchProfiles);

  createEffect(async () => {
    let profile = props.app.profileManager!.selected();
    let client = await props.app.profileManager!.connect(profile);
    await props.app.setClient(client);
  });

  return (
    <div class="profiles">
      <h4>Profiles</h4>
      <Show when={profiles.loading}>
        <p>Loading...</p>
      </Show>
      <Show when={profiles.error}>
        <p>Couldn't load profiles: {profiles.error.message}</p>
      </Show>

      <Show when={profiles()}>
        <div>
          <select
            value={props.app.profileManager?.selected()}
            onInput={e => props.app.profileManager?.setSelected((e.target as HTMLSelectElement).value)}
          >
            <option value="" disabled selected>Select a profile</option>
            <For each={profiles()}>
              {(profile) => (
                <option value={profile}>{profile}</option>
              )}
            </For>
          </select>
        </div>
      </Show>
    </div>
  );
}
