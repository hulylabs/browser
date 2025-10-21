import { createResource, For, Show } from "solid-js";
import { AppState } from "../../state/state";

export function Profiles(props: { app: AppState }) {
  const fetchProfiles = async () => {
    let profiles = await props.app.profiles!.getProfiles();
    return profiles;
  };
  const [profiles] = createResource(fetchProfiles);

  const handleProfileSelect = async (profileValue: string) => {
    props.app.profiles?.setSelected(profileValue);
    let client = await props.app.profiles!.connect(profileValue);
    await props.app.setClient(client);
  };

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
            value={props.app.profiles?.selected()}
            onInput={e => handleProfileSelect((e.target as HTMLSelectElement).value)}
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
