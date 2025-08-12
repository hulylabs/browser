import { createResource, For, Show, createSignal, createEffect } from "solid-js";
import { AppState } from "../../state";

export function Profiles(props: { app: AppState }) {
  const fetchProfiles = async () => {
    const response = await fetch(`${props.app.managerAddress}/profiles`);
    return response.json();
  };

  const [profiles, { refetch }] = createResource(fetchProfiles);
  const [selected, setSelected] = createSignal<string | undefined>(undefined);
  const [error, _] = createSignal<string | null>(null);

  createEffect(() => {
    if (selected()) {
      props.app.setProfile(selected()!);
    }
  });

  return (
    <div class="profiles">
      <h4>Profiles</h4>
      <Show when={profiles.loading}>
        <p>Loading...</p>
      </Show>
      <Show when={profiles.error}>
        <p>Error loading profiles: {profiles.error.message}</p>
      </Show>
      <Show when={profiles()}>
        <div>
          <select
            value={selected()}
            onInput={e => setSelected((e.target as HTMLSelectElement).value)}
          >
            <option value="" disabled selected>Select a profile</option>
            <For each={profiles().data.profiles}>
              {(profile) => (
                <option value={profile}>{profile}</option>
              )}
            </For>
          </select>
        </div>
        <Show when={error()}>
          <p style="color: red;">{error()}</p>
        </Show>
      </Show>
    </div>
  );
}
