import { createEffect, onCleanup, onMount, createSignal } from "solid-js";
import { AppState } from "../state";
import "./Browser.css";
import { domCodeToKeyCode } from "../keyboard/keycodes";

function Browser(props: { app: AppState }) {
  let canvasContainer!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;
  let imageData!: ImageData;

  let popupImageData!: ImageData;

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
    if (activeTab === undefined) return console.log("failed to get active tab");

    let ctx = canvas.getContext("2d");
    if (ctx == null) return console.error("Failed to get canvas context");

    let cefClient = props.app.cefClients.get(activeTab.id)!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    cefClient.onRender = (data) => {
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
    };

    cefClient.onPopupRender = (x, y, w, h, data) => {
      if (
        popupImageData == null ||
        popupImageData.width !== w ||
        popupImageData.height !== h
      ) {
        popupImageData = ctx.createImageData(w, h);
      }
      popupImageData.data.set(data);
      ctx.putImageData(popupImageData, x, y);
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

    canvas.onkeydown = function (e) {
      let character = 0;
      if (e.key.length === 1) {
        character = e.key.charCodeAt(0);
      }
      let keycode = domCodeToKeyCode(e.code);
      cefClient.onKeyPress(keycode, character, true, e.ctrlKey, e.shiftKey);
    };

    canvas.onkeyup = function (e) {
      let character = 0;
      if (e.key.length === 1) {
        character = e.key.charCodeAt(0);
      }
      let keycode = domCodeToKeyCode(e.code);
      cefClient.onKeyPress(keycode, character, false, e.ctrlKey, e.shiftKey);
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
