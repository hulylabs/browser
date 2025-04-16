import { createEffect, onMount } from "solid-js";
import { App } from "../app";
import "./Browser.css";

function Browser(props: { app: App }) {
    let canvasContainer!: HTMLDivElement;
    let canvas!: HTMLCanvasElement;
    let imageData!: ImageData;

    onMount(() => {
        let ctx = canvas.getContext("2d");

        if (ctx == null)
            return console.error("Failed to get canvas context");

        const rect = canvasContainer.getBoundingClientRect();

        canvas.width = rect.width;
        canvas.height = rect.height;
        imageData = ctx.createImageData(rect.width, rect.height);

        window.addEventListener("resize", () => {
            const rect = canvasContainer.getBoundingClientRect();

            canvas.width = rect.width;
            canvas.height = rect.height;
            imageData = ctx.createImageData(rect.width, rect.height);

            let activeTab = props.app.getActiveTab();
            if (activeTab === undefined)
                return console.log("failed to get active tab");

            let cefClient = props.app.cefClients.get(activeTab.id)!;
            cefClient.onResize(rect.width, rect.height);

        });
    });

    createEffect(() => {
        let activeTab = props.app.getActiveTab();
        if (activeTab === undefined)
            return console.log("failed to get active tab");

        let ctx = canvas.getContext("2d");
        if (ctx == null)
            return console.error("Failed to get canvas context");

        let cefClient = props.app.cefClients.get(activeTab.id)!;

        cefClient.onRender = (data) => {
            imageData.data.set(data);
            ctx.putImageData(imageData, 0, 0);
        };

        cefClient.onResize(canvas.width, canvas.height);

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