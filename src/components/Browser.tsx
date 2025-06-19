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
    let activeTab = props.app.getActiveTab();
    if (activeTab === undefined) return console.log("failed to get active tab");

    let ctx = canvas.getContext("2d");
    if (ctx == null) return console.error("Failed to get canvas context");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let tabStream = props.app.tabStreams.get(activeTab.id)!;
    tabStream.onRender = (data) => {
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

    tabStream.onPopupRender = (x, y, w, h, data) => {
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


    tabStream.onCursorChanged = (cursor) => {
      if (cursor === "Hand") {
        canvas.style.cursor = "pointer";
      }

      if (cursor === "Pointer") {
        canvas.style.cursor = "default";
      }
    };

    canvas.onmousemove = function (e) {
      props.app.browserClient.mouseMove(activeTab.id, e.offsetX, e.offsetY);
    };

    canvas.onmousedown = function (e) {
      props.app.browserClient.mouseClick(activeTab.id, e.offsetX, e.offsetY, e.button, true);
    };

    canvas.onmouseup = function (e) {
      props.app.browserClient.mouseClick(activeTab.id, e.offsetX, e.offsetY, e.button, false);
    };

    canvas.onwheel = function (e) {
      props.app.browserClient.mouseWheel(activeTab.id, e.offsetX, e.offsetY, e.deltaX, e.deltaY);
    };

    canvas.onkeydown = function (e) {
      let character = 0;
      if (e.key.length === 1) {
        character = e.key.charCodeAt(0);
      }
      let keycode = domCodeToKeyCode(e.code);
      props.app.browserClient.keyPress(activeTab.id, keycode, character, true, e.ctrlKey, e.shiftKey);
    };

    canvas.onkeyup = function (e) {
      let character = 0;
      if (e.key.length === 1) {
        character = e.key.charCodeAt(0);
      }
      let keycode = domCodeToKeyCode(e.code);
      props.app.browserClient.keyPress(activeTab.id, keycode, character, false, e.ctrlKey, e.shiftKey);
    };

    canvas.onfocus = () => {
      console.log("canvas focused");
      props.app.browserClient.setFocus(activeTab.id, true);
    };

    canvas.onblur = () => {
      console.log("canvas blurred");
      props.app.browserClient.setFocus(activeTab.id, false);
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
