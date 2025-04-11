import { TabModel } from "../model";
import "./Tab.css";

export default function Tab(props: { model: TabModel }) {
    return (
        <div class="tab">
            <div class="icon"></div>
            <p>{props.model.title}</p>
        </div>
    )
}