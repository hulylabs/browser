import { Accessor, createContext, createSignal, onCleanup, onMount, Setter, useContext } from "solid-js";
import styles from "./ResizablePane.module.scss";

interface ResizablePaneContextValue {
    width: Accessor<number>,
    setWidth: Setter<number>,
    minWidth: number,
    maxWidth: number,
    containerRef: HTMLDivElement | undefined,
}

const ResizablePaneContext = createContext<ResizablePaneContextValue>()

function useResizablePaneContext() {
    const context = useContext(ResizablePaneContext);

    if (context === undefined) {
        throw new Error(
            "`useResizablePaneContext` must be used within a `ResizablePane` component",
        );
    }

    return context;
}

interface ResizablePaneProps {
    width: number
    minWidth: number
    maxWidth: number
    class?: string
    children: any
}

function Root(props: ResizablePaneProps) {
    const [width, setWidth] = createSignal(props.width);

    const context: ResizablePaneContextValue = {
        width,
        setWidth,
        minWidth: props.minWidth,
        maxWidth: props.maxWidth,
        containerRef: undefined,
    }

    return (
        <ResizablePaneContext.Provider value={context}>
            <div class={props.class}>
                {props.children}
            </div>
        </ResizablePaneContext.Provider>
    );
}

function Handle() {
    const context = useResizablePaneContext();

    const [isDragging, setIsDragging] = createSignal(false);

    const handleResize = (event: MouseEvent) => {
        if (!isDragging() || !context.containerRef) return;

        const rect = context.containerRef.getBoundingClientRect();
        const relativeX = event.clientX - rect.left;

        const newWidth = Math.max(context.minWidth, Math.min(context.maxWidth, relativeX));
        context.setWidth(newWidth);
    };

    const handleMouseDown = (event: MouseEvent) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleMouseUp = () => setIsDragging(false);

    onMount(() => {
        window.addEventListener("mousemove", handleResize);
        window.addEventListener("mouseup", handleMouseUp);
    });

    onCleanup(() => {
        window.removeEventListener("mousemove", handleResize);
        window.removeEventListener("mouseup", handleMouseUp);
    });

    return (
        <div
            class={`sidebar-handle ${styles.handle}`}
            onMouseDown={handleMouseDown}
        />
    );
}

function Content(props: { class?: string, children: any }) {
    let containerRef!: HTMLDivElement;
    const context = useResizablePaneContext();

    onMount(() => {
        let context = useResizablePaneContext();
        context.containerRef = containerRef;
    });

    return (
        <div style={{ width: `${context.width()}px` }} class={props.class} ref={containerRef}>
            {props.children}
        </div>
    );
}

export const ResizablePane = Object.assign(Root, {
    Content,
    Handle,
});
