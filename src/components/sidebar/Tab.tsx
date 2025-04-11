import { TabModel } from "../../model";
import "./Tab.css";

export default function Tab(props: { tab: TabModel }) {
    let classes = () => "tab " + (props.tab.active() ? "active" : "");
    return (
        <div class={classes()} onClick={() => props.tab.activate()}>
            <div class="icon"></div>
            <p>{props.tab.title}</p>
        </ div>
    )
}