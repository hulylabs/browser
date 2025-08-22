import { createEffect, onCleanup, onMount, createSignal } from "solid-js";
import { AppState } from "../state/state";
import "./Browser.css";
import { domCodeToKeyCode } from "../keyboard/keycodes";
import { Cursor } from "cef-client";


function Browser(props: { app: AppState }) {
  let canvasContainer!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;

  let renderer: Renderer;

  let resizeObserver!: ResizeObserver;
  let timeoutId: any = 0;

  const [fps, setFps] = createSignal(0);
  let frameCount = 0;
  let lastTime = performance.now();

  onMount(() => {
    const rect = canvasContainer.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    props.app.resize(rect.width, rect.height);

    renderer = new Renderer(canvas);

    resizeObserver = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const rect = canvasContainer.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        props.app.resize(rect.width, rect.height);
        renderer.resize(rect.width, rect.height);
      }, 100);
    });

    resizeObserver.observe(canvasContainer);
  });

  onCleanup(() => {
    resizeObserver?.disconnect();
    clearTimeout(timeoutId);
  });

  createEffect(() => {
    console.log(`Connecting to tab`);
    let tabState = props.app.getActiveTab();
    if (tabState === undefined) return console.warn("failed to get active tab");
    let connection = props.app.connections.get(tabState.id)!;

    connection.events.on("Frame", (frame) => {
      frameCount++;
      const now = performance.now();
      const elapsed = now - lastTime;

      if (elapsed >= 1000) {
        setFps(Math.round((frameCount * 1000) / elapsed));
        frameCount = 0;
        lastTime = now;
      }

      renderer.render({ data: frame.data, width: frame.width, height: frame.height });
    });

    connection.events.on("Cursor", (cursor) => {
      const cursorMap: Record<Cursor, string> = {
        [Cursor.Pointer]: "default",
        [Cursor.Hand]: "pointer",
        [Cursor.IBeam]: "text",
        [Cursor.Crosshair]: "crosshair",
      };
      canvas.style.cursor = cursorMap[cursor] ?? "default";
    });

    canvas.onmousemove = function (e) {
      const { x, y } = renderer?.convertMousePosition(e.offsetX, e.offsetY) ?? { x: 0, y: 0 };
      connection.page.mouseMove(x, y);
    };

    canvas.onmousedown = function (e) {
      const { x, y } = renderer?.convertMousePosition(e.offsetX, e.offsetY) ?? { x: 0, y: 0 };
      connection.page.click(x, y, e.button, true);
    };

    canvas.onmouseup = function (e) {
      const { x, y } = renderer?.convertMousePosition(e.offsetX, e.offsetY) ?? { x: 0, y: 0 };
      connection.page.click(x, y, e.button, false);
    };

    canvas.onwheel = function (e) {
      const { x, y } = renderer?.convertMousePosition(e.offsetX, e.offsetY) ?? { x: 0, y: 0 };
      connection.page.scroll(x, y, e.deltaX, e.deltaY);
    };

    canvas.onkeydown = function (e) {
      const keyCode = domCodeToKeyCode(e.code);
      if (keyCode !== undefined) {
        connection.page.key(keyCode, 0, true, e.shiftKey, e.ctrlKey);
        if (e.key.length === 1) {
          connection.page.char(e.key.charCodeAt(0));
        }
      }
    };

    canvas.onkeyup = function (e) {
      const keyCode = domCodeToKeyCode(e.code);
      if (keyCode !== undefined) {
        connection.page.key(keyCode, 0, false, e.shiftKey, e.ctrlKey);
      }
    };

    canvas.onfocus = function () {
      connection.page.focus(true);
    };

    canvas.onblur = function () {
      connection.page.focus(false);
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

interface Size {
  width: number;
  height: number;
}

interface DrawParams {
  scale: number;
  dx: number;
  dy: number;
  w: number;
  h: number;
}

class Renderer {
  private canvas: HTMLCanvasElement;
  private canvasCtx: CanvasRenderingContext2D;

  private offScreenCanvas: HTMLCanvasElement
  private offScreenCanvasSize: Size;
  private offScreenImageData: ImageData;
  private offScreenCtx: CanvasRenderingContext2D;

  private drawParams: DrawParams = { scale: 1, dx: 0, dy: 0, w: 0, h: 0 };


  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext("2d")!;

    this.offScreenCanvas = document.createElement("canvas");
    this.offScreenCanvas.width = 0;
    this.offScreenCanvas.height = 0;
    this.offScreenCanvasSize = { width: 1, height: 1 };
    this.offScreenImageData = new ImageData(1, 1);
    this.offScreenCtx = this.offScreenCanvas.getContext("2d")!;
  }

  render(frame: { data: Uint8Array; width: number; height: number }) {
    if (frame.width !== this.offScreenCanvasSize.width || frame.height !== this.offScreenCanvasSize.height) {
      this.resizeOffScreenCanvas(frame.width, frame.height);
      this.drawParams = this.calculateDrawParams({ width: frame.width, height: frame.height }, { width: this.canvas.width, height: this.canvas.height });
    }

    this.offScreenImageData.data.set(frame.data);
    this.offScreenCtx.putImageData(this.offScreenImageData, 0, 0);

    this.canvasCtx.fillStyle = "#ffffff";
    this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvasCtx.drawImage(
      this.offScreenCanvas,
      0, 0, frame.width, frame.height,
      this.drawParams.dx, this.drawParams.dy, this.drawParams.w, this.drawParams.h
    );
  }

  resize(width: number, height: number) {
    this.drawParams = this.calculateDrawParams(
      { width: this.offScreenCanvas.width, height: this.offScreenCanvas.height },
      { width, height }
    );
  }

  convertMousePosition(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this.drawParams.dx) / this.drawParams.scale,
      y: (y - this.drawParams.dy) / this.drawParams.scale,
    };
  }

  private resizeOffScreenCanvas(width: number, height: number) {
    this.offScreenCanvas.width = width;
    this.offScreenCanvas.height = height;
    this.offScreenImageData = new ImageData(width, height);
    this.offScreenCtx = this.offScreenCanvas.getContext("2d")!;
  }

  private calculateDrawParams(serverSize: Size, clientSize: Size): DrawParams {
    const scale = Math.min(clientSize.width / serverSize.width, clientSize.height / serverSize.height);
    const dx = (clientSize.width - serverSize.width * scale) / 2;
    const dy = (clientSize.height - serverSize.height * scale) / 2;
    return { scale, dx, dy, w: serverSize.width * scale, h: serverSize.height * scale };
  }
}
