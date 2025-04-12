import { TabModel } from "../../model";
import "./Tab.css";

export default function Tab(props: { tab: TabModel }) {
    return (
        <div class="tab" classList={{ "active": props.tab.active() }} onClick={() => props.tab.activate()}>
            <div class="icon"></div>
            <p>{props.tab.title}</p>
        </ div>
    )
}