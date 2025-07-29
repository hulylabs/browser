import { createEffect, onCleanup, onMount, createSignal } from "solid-js";
import { AppState } from "../state";
import "./Browser.css";
import { domCodeToKeyCode } from "../keyboard/keycodes";
import { Cursor } from "cef-client/dist/event_stream";

function Browser(props: { app: AppState }) {
  let canvasContainer!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;
  let imageData!: ImageData;

  let resizeObserver!: ResizeObserver;
  let timeoutId: number = 0;

  // Add FPS tracking state
  const [fps, setFps] = createSignal(0);
  let frameCount = 0;
  let lastTime = performance.now();

  onMount(() => {
    let ctx = canvas.getContext("2d");
    if (ctx == null) return console.error("Failed to get canvas context");

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
        props.app.resize(rect.width, rect.height);
      }, 100);
    });

    resizeObserver.observe(canvasContainer);
  });

  onCleanup(() => {
    resizeObserver?.disconnect();
    clearTimeout(timeoutId);
  });

  createEffect(() => {
    let tabState = props.app.getActiveTab();
    if (tabState === undefined) return console.log("failed to get active tab");

    let ctx = canvas.getContext("2d");
    if (ctx == null) return console.error("Failed to get canvas context");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let tabStream = props.app.tabStreams.get(tabState.id)!;
    let tab = props.app.tabConnections.get(tabState.id)!;

    tabStream.on("Frame", (data) => {
      // Calculate FPS
      frameCount++;
      const now = performance.now();
      const elapsed = now - lastTime;

      if (elapsed >= 1000) {
        setFps(Math.round((frameCount * 1000) / elapsed));
        frameCount = 0;
        lastTime = now;
      }

      imageData.data.set(data);
      ctx.putImageData(imageData, 0, 0);
    });

    tabStream.on("Cursor", (cursor) => {
      const cursorMap: Record<Cursor, string> = {
        [Cursor.Pointer]: "default",
        [Cursor.Hand]: "pointer",
        [Cursor.IBeam]: "text",
        [Cursor.Crosshair]: "crosshair",
      };
      canvas.style.cursor = cursorMap[cursor] ?? "default";
    });

    canvas.onmousemove = function (e) {
      tab.mouseMove(e.offsetX, e.offsetY);
    };

    canvas.onmousedown = function (e) {
      tab.click(e.offsetX, e.offsetY, e.button, true);
    };

    canvas.onmouseup = function (e) {
      tab.click(e.offsetX, e.offsetY, e.button, false);
    };

    canvas.onwheel = function (e) {
      tab.scroll(e.offsetX, e.offsetY, e.deltaX, e.deltaY);
    };

    canvas.onkeydown = function (e) {
      const keyCode = domCodeToKeyCode(e.code);
      if (keyCode !== undefined) {
        tab.key(keyCode, 0, true, e.shiftKey, e.ctrlKey);
      }
    };

    canvas.onkeyup = function (e) {
      const keyCode = domCodeToKeyCode(e.code);
      if (keyCode !== undefined) {
        tab.key(keyCode, 0, false, e.shiftKey, e.ctrlKey);
      }
    };
  });

  return (
    <>
      <div class="canvas-container" ref={canvasContainer}>
        <div class="fps-counter">{fps()} FPS</div>
        <canvas tabIndex="0" class="canvas" ref={canvas}></canvas>
      </div>
    </>
  );
}

export default Browser;
