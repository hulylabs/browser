import "./Tab.css";

import { TabState } from "../../state";
import { Icon, Icons } from "../Icon";

export default function Tab(props: { tab: TabState }) {
    let activate = (event: MouseEvent) => {
        event.stopPropagation();
        props.tab.activate();
    }
    let close = (event: MouseEvent) => {
        event.stopPropagation();
        props.tab.close();
    }
    return (
        <div class="tab" classList={{ "active": props.tab.active }} onClick={activate}>
            <div class="tab-info">
                <div class="favicon"></div>
                <p>{props.tab.title}</p>
            </div>
            <Icon icon={Icons.X} class="close" onClick={close} />
        </div >
    )
}