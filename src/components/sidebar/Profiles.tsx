import { createResource, For, Show, createSignal, createEffect } from "solid-js";
import { AppState } from "../../state";

const fetchProfiles = async () => {
  const response = await fetch("/api/profiles");
  return response.json();
};

const createProfile = async (name: string) => {
  const response = await fetch(`/api/profiles/${name}`, {
    method: "POST",
  });
  return response.json();
};

export function Profiles(props: { app: AppState }) {
  const [profiles, { refetch }] = createResource(fetchProfiles);
  const [selected, setSelected] = createSignal<string | undefined>(undefined);
  const [profile, setProfile] = createSignal("");
  const [creating, setCreating] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    if (selected()) {
      props.app.setProfile(selected()!);
    }
  });

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      await createProfile(profile());
      setProfile("");
      refetch();
    } catch (e: any) {
      setError(e.message || "Failed to create profile");
    } finally {
      setCreating(false);
    }
  };

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
        <div style="margin-top: 1em;">
          <input
            type="text"
            placeholder="New profile name"
            value={profile()}
            onInput={e => setProfile((e.target as HTMLInputElement).value)}
            disabled={creating()}
          />
          <button onClick={handleCreate} disabled={creating() || !profile().trim()}>
            {creating() ? "Creating..." : "Create"}
          </button>
        </div>
        <Show when={error()}>
          <p style="color: red;">{error()}</p>
        </Show>
      </Show>
    </div>
  );
}
