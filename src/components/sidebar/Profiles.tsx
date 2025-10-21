import { createResource, For, Show } from "solid-js";
import { AppState } from "../../state/state";
import styles from "./Profiles.module.scss";

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
    <div class={styles.profiles}>
      <h4 class={styles.header}>Profiles</h4>

      <Show when={profiles.loading}>
        <div class={styles.loadingState}>
          Loading profiles...
        </div>
      </Show>

      <Show when={profiles()}>
        <select
          class={styles.select}
          value={props.app.profiles?.selected()}
          onInput={e => handleProfileSelect((e.target as HTMLSelectElement).value)}
        >
          <For each={profiles()}>
            {(profile) => (
              <option class={styles.option} value={profile}>
                {profile}
              </option>
            )}
          </For>
        </select>
      </Show >
    </div >
  );
}
