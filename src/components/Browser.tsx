import { createEffect, onCleanup, onMount } from "solid-js";
import { AppState } from "../state";
import "./Browser.css";

function Browser(props: { app: AppState }) {
    let canvasContainer!: HTMLDivElement;
    let canvas!: HTMLCanvasElement;
    let imageData!: ImageData;

    let resizeObserver!: ResizeObserver;
    let timeoutId: number = 0;

    onMount(() => {
        let ctx = canvas.getContext("2d");

        if (ctx == null)
            return console.error("Failed to get canvas context");

        const rect = canvasContainer.getBoundingClientRect();

        canvas.width = rect.width;
        canvas.height = rect.height;
        imageData = ctx.createImageData(rect.width, rect.height);

        resizeObserver = new ResizeObserver(() => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const rect = canvasContainer.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
                imageData = ctx.createImageData(rect.width, rect.height);
                props.app.resizeActiveTab(rect.width, rect.height);
            }, 100);
        });

        resizeObserver.observe(canvasContainer);
    });

    onCleanup(() => {
        resizeObserver?.disconnect();
        clearTimeout(timeoutId);
    });

    createEffect(() => {
        let activeTab = props.app.getActiveTab();
        if (activeTab === undefined)
            return console.log("failed to get active tab");

        let ctx = canvas.getContext("2d");
        if (ctx == null)
            return console.error("Failed to get canvas context");

        let cefClient = props.app.cefClients.get(activeTab.id)!;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        cefClient.onRender = (data) => {
            imageData.data.set(data);
            ctx.putImageData(imageData, 0, 0);
        };

        cefClient.resize(canvas.width, canvas.height);

        canvas.onmousemove = function (e) {
            cefClient.onMouseMove(e.offsetX, e.offsetY);
        };

        canvas.onmousedown = function (e) {
            cefClient.onMouseDown(e.offsetX, e.offsetY, e.button);
        };

        canvas.onmouseup = function (e) {
            cefClient.onMouseUp(e.offsetX, e.offsetY, e.button);
        };

        canvas.onwheel = function (e) {
            cefClient.onMouseWheel(e.offsetX, e.offsetY, e.deltaX, e.deltaY);
        };

        cefClient.onCursorChanged = (cursor) => {
            if (cursor === "Hand") {
                canvas.style.cursor = "pointer";
            }

            if (cursor === "Pointer") {
                canvas.style.cursor = "default";
            }
        };
    });

    return <>
        <div class="canvas-container" ref={canvasContainer}>
            <canvas class="canvas" ref={canvas}></canvas>
        </div>
    </>
}

export default Browser;