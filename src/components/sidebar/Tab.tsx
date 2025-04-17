import { TabState } from "../../state";
import "./Tab.css";

export default function Tab(props: { tab: TabState }) {
    return (
        <div class="tab" classList={{ "active": props.tab.active() }} onClick={() => props.tab.activate()}>
            <div class="icon"></div>
            <p>{props.tab.title}</p>
        </div>
    )
}