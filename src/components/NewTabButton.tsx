import "./NewTabButton.css"

export default function NewTabButton(props: { onClick: () => void }) {
    return (
        <div onClick={() => props.onClick()} class="new-tab-button">
            <p> + New Tab</p>
        </div>
    )
}