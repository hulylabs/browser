import "./Icons.css"

import X from "../assets/x.svg?raw";
import Back from "../assets/back.svg?raw";
import Forward from "../assets/forward.svg?raw";
import Reload from "../assets/reload.svg?raw";

export const Icons = {
    X,
    Back,
    Forward,
    Reload
}

interface IconProps {
    icon: string;
    class?: string;
    classList?: { [key: string]: boolean | undefined };
    onClick?: (e: MouseEvent) => void;
}

export function Icon(props: IconProps) {
    return (
        <div class={"icon " + props.class} classList={props.classList} onClick={props.onClick} innerHTML={props.icon} >
        </div>
    )
}