import "./Tab.css";

import { TabState } from "../../state";
import { Icon, Icons } from "../Icon";

export default function Tab(props: { tab: TabState }) {
    return (
        <div class="tab" classList={{ "active": props.tab.active() }} onClick={() => props.tab.activate()}>
            <div class="tab-info">
                <div class="favicon"></div>
                <p>{props.tab.title}</p>
            </div>
            <Icon icon={Icons.X} class="close" onClick={props.tab.close} />
        </div >
    )
}