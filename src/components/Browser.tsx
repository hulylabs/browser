import { createEffect, onMount } from "solid-js";
import { App } from "../model";
import "./Browser.css";

function Browser(props: { state: App }) {
    let canvasContainer!: HTMLDivElement;
    let canvas!: HTMLCanvasElement;
    let imageData!: ImageData;
    let renderingCtx!: CanvasRenderingContext2D;

    onMount(() => {
        let ctx = canvas.getContext("2d");

        if (ctx == null)
            return console.error("Failed to get canvas context");

        renderingCtx = ctx;

        const style = window.getComputedStyle(canvasContainer!);
        const width = parseFloat(style.width);
        const height = parseFloat(style.height);

        canvas.width = width;
        canvas.height = height;
        imageData = renderingCtx.createImageData(width, height);

        const resizeObserver = new ResizeObserver(entries => {
            console.log("entries", entries);
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                console.log("width", width);
                console.log("height", height);
                canvas.width = width;
                canvas.height = height;
                imageData = renderingCtx.createImageData(width, height)
            }
        });

        resizeObserver.observe(canvasContainer);
    });

    createEffect(() => {
        let activeTab = props.state.getActiveTab();
        if (activeTab === undefined)
            return console.log("failed to get active tab");

        let cefClient = props.state.cefClients.get(activeTab.id)!;

        cefClient.onResize(canvas.width, canvas.height);
        cefClient.onRender = (data) => {
            imageData.data.set(data);
            renderingCtx.putImageData(imageData, 0, 0);
        };

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