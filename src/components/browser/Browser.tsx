import { createEffect, onCleanup, onMount, createSignal } from "solid-js";
import { AppState } from "../../state/state";
import "./Browser.css";
import { domCodeToKeyCode } from "../../keyboard/keycodes";
import { Cursor } from "cef-client";
import BrowserContextMenu from "./BrowserContextMenu";
import { TabConnection } from "../../state/tabs";

function Browser(props: { app: AppState }) {
  let canvasContainer!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;
  let renderer: Renderer | ServerSideRenderer;
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
    const useServerSize = props.app.config.useServerSize;
    renderer = useServerSize ? new ServerSideRenderer(canvas) : new Renderer(canvas);
    handleResize();

    resizeObserver = new ResizeObserver(debouncedResize);
    resizeObserver.observe(canvasContainer);
  });

  onCleanup(() => {
    resizeObserver?.disconnect();
    clearTimeout(timeoutId);
  });

  createEffect(() => {
    const tabState = props.app.tabs.getActive();
    if (tabState === undefined) {
      renderer.clear();
      return;
    }

    const connection = props.app.tabs.connections.get(tabState.id)!;
    connection.events.on("Frame", (frame) => {
      fpsTracker.update();
      renderer.render(frame);
    });

    connection.events.on("Cursor", (cursor) => InputHandler.setCursor(canvas, cursor));
    InputHandler.setupEventListeners(props.app, canvas, connection, renderer);
  });

  return (
    <>
      <BrowserContextMenu app={props.app}>
        <div class="canvas-container" ref={canvasContainer}>
          <div class="fps-counter">{fps()} FPS</div>
          <canvas tabIndex="0" class="canvas" ref={canvas}></canvas>
        </div>
      </BrowserContextMenu>
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

  transformCoordinates(canvasX: number, canvasY: number): { x: number; y: number } {
    // For regular renderer, coordinates are already correctly mapped
    // Just account for device pixel ratio
    return {
      x: Math.round(canvasX * this.dpr),
      y: Math.round(canvasY * this.dpr)
    };
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

  static setupEventListeners(app: AppState, canvas: HTMLCanvasElement, connection: TabConnection, renderer: Renderer | ServerSideRenderer) {
    const transformCoordinates = (x: number, y: number) => {
      if (renderer instanceof ServerSideRenderer) {
        return renderer.convertMousePosition(x, y);
      }
      return { x, y };
    };

    canvas.onmousemove = (e) => {
      const coords = transformCoordinates(e.offsetX, e.offsetY);
      connection.page.mouseMove(coords.x, coords.y);
    };
    canvas.onmousedown = (e) => {
      const coords = transformCoordinates(e.offsetX, e.offsetY);
      connection.page.click(coords.x, coords.y, e.button, true);
    };
    canvas.onmouseup = (e) => {
      const coords = transformCoordinates(e.offsetX, e.offsetY);
      connection.page.click(coords.x, coords.y, e.button, false);
    };
    canvas.onwheel = (e) => {
      const coords = transformCoordinates(e.offsetX, e.offsetY);
      connection.page.scroll(coords.x, coords.y, -e.deltaX, -e.deltaY);
    };

    canvas.onkeydown = (e) => {
      if (app.shortcuts.checkShortcutConflict(e)) return;
      if (e.key === "Tab") e.preventDefault();

      const keyCode = domCodeToKeyCode(e.code);
      if (keyCode !== undefined) {
        let unicode = 0;
        if (e.key.length === 1) {
          unicode = e.key.charCodeAt(0);
        }
        connection.page.key(keyCode, unicode, true, e.ctrlKey, e.shiftKey, e.altKey, e.metaKey);
      }
    }
    canvas.onkeyup = (e) => {
      if (app.shortcuts.checkShortcutConflict(e)) return;
      if (e.key === "Tab") e.preventDefault();

      const keyCode = domCodeToKeyCode(e.code);
      if (keyCode !== undefined) {
        connection.page.key(keyCode, 0, false, e.ctrlKey, e.shiftKey);
      }
    }

    canvas.onfocus = () => {
      app.ui.setBrowserFocused(true);
      connection.page.focus(true);
    };
    canvas.onblur = () => {
      app.ui.setBrowserFocused(false);
      connection.page.focus(false);
    };
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

interface DrawParams {
  scale: number;
  dx: number;
  dy: number;
  w: number;
  h: number;
}

class ServerSideRenderer {
  private canvas: HTMLCanvasElement;
  private canvasCtx: CanvasRenderingContext2D;
  private offscreen: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private dpr: number = window.devicePixelRatio || 1;

  private drawParams: DrawParams = { scale: 1, dx: 0, dy: 0, w: 0, h: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext("2d")!;

    this.offscreen = document.createElement("canvas");
    this.offscreenCtx = this.offscreen.getContext("2d")!;

    this.imageData = new ImageData(1, 1);
  }

  render(frame: { data: Uint8Array; width: number; height: number }) {
    this.clear();

    if (this.imageData.width != frame.width || this.imageData.height != frame.height) {
      this.imageData = new ImageData(frame.width, frame.height);
      this.offscreen.width = frame.width;
      this.offscreen.height = frame.height;
      this.calculateDrawParams();
    }

    this.imageData.data.set(frame.data);
    this.offscreenCtx.putImageData(this.imageData, 0, 0);

    this.canvasCtx.drawImage(this.offscreen, this.drawParams.dx, this.drawParams.dy, this.drawParams.w, this.drawParams.h);
  }

  clear() {
    this.canvasCtx.fillStyle = "#fff";
    this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  convertMousePosition(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this.drawParams.dx) / this.drawParams.scale,
      y: (y - this.drawParams.dy) / this.drawParams.scale,
    };
  }

  resize(width: number, height: number) {
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.calculateDrawParams();
  }

  private calculateDrawParams() {
    const scale = Math.min(this.canvas.width / this.offscreen.width, this.canvas.height / this.offscreen.height);
    const dx = (this.canvas.width - this.offscreen.width * scale) / 2;
    const dy = (this.canvas.height - this.offscreen.height * scale) / 2;
    this.drawParams = { scale, dx, dy, w: this.offscreen.width * scale, h: this.offscreen.height * scale };
  }
}