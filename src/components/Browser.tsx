import { createEffect, onMount } from "solid-js";
import { App } from "../model";

function Browser(props: { state: App }) {
    let canvas_container: HTMLDivElement | undefined;
    let canvas: HTMLCanvasElement | undefined;
    let imageData: ImageData | undefined;

    createEffect(() => {
        let cefClient = props.state.cefClients.get(props.state.getActiveTab().id);

        if (!canvas) return console.log("canvas not found");

        let ctx = canvas.getContext("2d");
        if (!ctx) return console.log("failed to get 2d context");


        if (cefClient) {
            cefClient.onRender = (data) => {
                if (!imageData) return console.log("imageData not found");
                imageData.data.set(data);
                ctx.putImageData(imageData, 0, 0);
            };
        }
    });

    onMount(() => {
        if (!canvas_container) return console.log("canvas container not found");
        if (!canvas) return console.log("canvas not found");

        let ctx = canvas.getContext("2d");
        if (!ctx) return console.log("failed to get 2d context");

        const style = window.getComputedStyle(canvas);

        const width = parseFloat(style.width);
        const height = parseFloat(style.height);

        canvas.width = width;
        canvas.height = height;

        imageData = ctx.createImageData(width, height);
        // props.cefClient.onResize(width, height);
        // props.cefClient.startVideo();

        // canvas.onmousemove = function (e) {
        //     props.cefClient.onMouseMove(e.offsetX, e.offsetY);
        // };

        // canvas.onmousedown = function (e) {
        //     props.cefClient.onMouseDown(e.offsetX, e.offsetY, e.button);
        // };

        // canvas.onmouseup = function (e) {
        //     props.cefClient.onMouseUp(e.offsetX, e.offsetY, e.button);
        // };

        // canvas.onwheel = function (e) {
        //     props.cefClient.onMouseWheel(e.offsetX, e.offsetY, e.deltaX, e.deltaY);
        // };

        // const resizeObserver = new ResizeObserver(entries => {
        //     for (let entry of entries) {
        //         const { width, height } = entry.contentRect;
        //         canvas.width = width;
        //         canvas.height = height;
        //         imageData = ctx.createImageData(width, height)

        //         props.cefClient.onResize(width, height);
        //     }
        // });

        // resizeObserver.observe(canvas_container);

        // props.cefClient.onCursorChanged = (cursor) => {
        //     if (cursor === "Hand") {
        //         canvas.style.cursor = "pointer";
        //     }

        //     if (cursor === "Pointer") {
        //         canvas.style.cursor = "default";
        //     }
        // };

        // props.cefClient.onRender = (data) => {
        //     imageData.data.set(data);
        //     ctx.putImageData(imageData, 0, 0);
        // };
    });

    return <>
        <div class="canvas-container" ref={canvas_container}>
            <canvas class="canvas" ref={canvas}></canvas>
        </div>
    </>
}

export default Browser;