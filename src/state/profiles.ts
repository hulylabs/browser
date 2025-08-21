import { Browser, connect } from "cef-client";
import { Accessor, createSignal, Setter } from "solid-js";

export class ProfileManager {
    private managerAddress: string;
    onProfileSelected: ((browser: Browser) => void) | undefined;

    selected: Accessor<string>;
    setSelected: Setter<string>;

    constructor(managerAddress: string) {
        this.managerAddress = managerAddress;
        [this.selected, this.setSelected] = createSignal<string>("default");
    }

    async getProfiles(): Promise<string[]> {
        let response = await fetch(`${this.managerAddress}/profiles`);
        let json = await response.json();
        return json.data.profiles;
    }

    async connect(profile: string): Promise<Browser> {
        let response = await fetch(`${this.managerAddress}/profiles/${profile}/cef`);
        let json = await response.json();
        let address = json.data.address;

        let browser = await connect(address);
        return browser;
    }
}