import { createEffect, onCleanup, onMount, createSignal } from "solid-js";
import { AppState, TabConnection } from "../state/state";
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
  const fpsTracker = new FPSTracker(setFps);

  const handleResize = () => {
    const rect = canvasContainer.getBoundingClientRect();
    const [width, height] = [rect.width, rect.height];

    renderer.resize(width, height);
    props.app.resize(width, height);
  }

  const debouncedResize = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(handleResize, 100);
  }

  onMount(() => {
    renderer = new Renderer(canvas);
    handleResize();

    resizeObserver = new ResizeObserver(debouncedResize);
    resizeObserver.observe(canvasContainer);
  });

  onCleanup(() => {
    resizeObserver?.disconnect();
    clearTimeout(timeoutId);
  });

  createEffect(() => {
    const tabState = props.app.getActiveTab();
    if (tabState === undefined) {
      console.warn("failed to get active tab");
      return;
    }

    const connection = props.app.connections.get(tabState.id)!;

    connection.events.on("Frame", (frame) => {
      fpsTracker.update();
      renderer.render(frame);
    });

    connection.events.on("Cursor", (cursor) => InputHandler.setCursor(canvas, cursor));

    InputHandler.setupEventListeners(canvas, connection);

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


class Renderer {
  private canvas: HTMLCanvasElement;
  private canvasCtx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private dpr: number = window.devicePixelRatio || 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext("2d")!;
    this.imageData = new ImageData(1, 1);
  }

  render(frame: { data: Uint8Array; width: number; height: number }) {
    this.clear();
    if (this.imageData.width != frame.width || this.imageData.height != frame.height) {
      console.warn(`size mismatch: imagedata: [${this.imageData.width}, ${this.imageData.height}], frame: [${frame.width}, ${frame.height}]`);
      return;
    }

    this.imageData.data.set(frame.data);
    this.canvasCtx.putImageData(this.imageData, 0, 0);
  }

  clear() {
    this.canvasCtx.fillStyle = "#ffffff";
    this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  resize(width: number, height: number) {
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.imageData = new ImageData(width * this.dpr, height * this.dpr);
  }
}

class InputHandler {
  private static readonly CURSOR_MAP: Record<Cursor, string> = {
    [Cursor.Pointer]: "default",
    [Cursor.Hand]: "pointer",
    [Cursor.IBeam]: "text",
    [Cursor.Crosshair]: "crosshair",
  };

  static setupEventListeners(canvas: HTMLCanvasElement, connection: TabConnection) {
    canvas.onmousemove = (e) => this.handleMouseMove(e, connection);
    canvas.onmousedown = (e) => this.handleMouseDown(e, connection);
    canvas.onmouseup = (e) => this.handleMouseUp(e, connection);
    canvas.onwheel = (e) => this.handleWheel(e, connection);

    canvas.onkeydown = (e) => this.handleKeyDown(e, connection);
    canvas.onkeyup = (e) => this.handleKeyUp(e, connection);

    canvas.onfocus = () => connection.page.focus(true);
    canvas.onblur = () => connection.page.focus(false);
  }

  private static handleMouseMove(e: MouseEvent, connection: TabConnection) {
    connection.page.mouseMove(e.offsetX, e.offsetY);
  }

  private static handleMouseDown(e: MouseEvent, connection: TabConnection) {
    connection.page.click(e.offsetX, e.offsetY, e.button, true);
  }

  private static handleMouseUp(e: MouseEvent, connection: TabConnection) {
    connection.page.click(e.offsetX, e.offsetY, e.button, false);
  }

  private static handleWheel(e: WheelEvent, connection: TabConnection) {
    connection.page.scroll(e.offsetX, e.offsetY, e.deltaX, e.deltaY);
  }

  private static handleKeyDown(e: KeyboardEvent, connection: TabConnection) {
    const keyCode = domCodeToKeyCode(e.code);
    if (keyCode !== undefined) {
      connection.page.key(keyCode, 0, true, e.shiftKey, e.ctrlKey);
      if (e.key.length === 1) {
        connection.page.char(e.key.charCodeAt(0));
      }
    }
  }

  private static handleKeyUp(e: KeyboardEvent, connection: TabConnection) {
    const keyCode = domCodeToKeyCode(e.code);
    if (keyCode !== undefined) {
      connection.page.key(keyCode, 0, false, e.shiftKey, e.ctrlKey);
    }
  }

  static setCursor(canvas: HTMLCanvasElement, cursor: Cursor) {
    canvas.style.cursor = this.CURSOR_MAP[cursor] ?? "default";
  }
}

class FPSTracker {
  private frameCount = 0;
  private lastTime = performance.now();
  private setFps: (fps: number) => void;

  constructor(setFps: (fps: number) => void) {
    this.setFps = setFps;
  }

  update() {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastTime;

    if (elapsed >= 1000) {
      this.setFps(Math.round((this.frameCount * 1000) / elapsed));
      this.frameCount = 0;
      this.lastTime = now;
    }
  }
}