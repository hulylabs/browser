import { createEffect, onCleanup, onMount, createSignal } from "solid-js";
import { AppState } from "../state";
import "./Browser.css";
import { domCodeToKeyCode } from "../keyboard/keycodes";
import { Cursor } from "cef-client";


function Browser(props: { app: AppState }) {
  let canvasContainer!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;

  let renderer: ClientRenderer | ServerRenderer | undefined;

  let resizeObserver!: ResizeObserver;
  let timeoutId: number = 0;

  // Add FPS tracking state
  const [fps, setFps] = createSignal(0);
  let frameCount = 0;
  let lastTime = performance.now();

  onMount(() => {
    const rect = canvasContainer.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    if (props.app.useServerSize === true) {
      if (props.app.serverSize() === undefined) {
        console.warn("Server size is not set, waiting for response from server");
      } else {
        let size = props.app.serverSize()!;
        let serverSize = { width: size.width, height: size.height };
        let clientSize = { width: canvas.width, height: canvas.height };
        renderer = new ServerRenderer(canvas, serverSize, clientSize, (serverSize, _) => {
          props.app.resize(serverSize.width, serverSize.height);
        });
      }
    } else {
      renderer = new ClientRenderer(canvas, rect.width, rect.height, (clientSize) => {
        props.app.resize(clientSize.width, clientSize.height);
      });
    }

    resizeObserver = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const rect = canvasContainer.getBoundingClientRect();
        renderer?.resize(rect.width, rect.height);
      }, 100);
    });

    resizeObserver.observe(canvasContainer);
  });

  onCleanup(() => {
    resizeObserver?.disconnect();
    clearTimeout(timeoutId);
  });

  createEffect(() => {
    if (props.app.serverSize() === undefined) return;
    let size = props.app.serverSize()!;
    let serverSize = { width: size.width, height: size.height };
    let clientSize = { width: canvas.width, height: canvas.height };
    if (renderer === undefined) {
      renderer = new ServerRenderer(canvas, serverSize, clientSize, (serverSize, _) => {
        props.app.resize(serverSize.width, serverSize.height);
      });
    }
  });

  createEffect(() => {
    let tabState = props.app.getActiveTab();
    if (tabState === undefined) return console.warn("failed to get active tab");
    let connection = props.app.connections.get(tabState.id)!;

    connection.events.on("Frame", (frame) => {
      // Calculate FPS
      frameCount++;
      const now = performance.now();
      const elapsed = now - lastTime;

      if (elapsed >= 1000) {
        setFps(Math.round((frameCount * 1000) / elapsed));
        frameCount = 0;
        lastTime = now;
      }

      if (renderer === undefined) {
        console.warn("Renderer is not initialized");
        return;
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

class ServerRenderer {
  private onResize: (serverSize: Size, clientSize: Size) => void;

  private serverSize: Size;
  private clientSize: Size;

  private drawParams: DrawParams = { scale: 1, dx: 0, dy: 0, w: 0, h: 0 };
  private offScreenCanvas: HTMLCanvasElement
  private offScreenCtx: CanvasRenderingContext2D;
  private offScreenImageData: ImageData;

  private target: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(target: HTMLCanvasElement, serverSize: Size, clientSize: Size, onResize: (serverSize: Size, clientSize: Size) => void) {
    this.serverSize = serverSize;
    this.clientSize = clientSize;

    this.drawParams = this.calculateDrawParams(this.serverSize, this.clientSize);
    this.offScreenCanvas = document.createElement("canvas");
    this.offScreenCanvas.width = serverSize.width;
    this.offScreenCanvas.height = serverSize.height;
    this.offScreenImageData = new ImageData(serverSize.width, serverSize.height);
    this.offScreenCtx = this.offScreenCanvas.getContext("2d")!;

    this.target = target;
    this.ctx = target.getContext("2d")!;

    this.onResize = onResize;
  }

  render(frame: { data: Uint8Array; width: number; height: number }) {
    if (frame.width != this.serverSize.width || frame.height != this.serverSize.height) {
      return console.error("Frame size does not match server size");
    }

    this.offScreenImageData.data.set(frame.data);
    this.offScreenCtx.putImageData(this.offScreenImageData, 0, 0);

    this.ctx.fillStyle = "#808080ff";
    this.ctx.fillRect(0, 0, this.target.width, this.target.height);
    this.ctx.drawImage(
      this.offScreenCanvas,
      0, 0, frame.width, frame.height,
      this.drawParams.dx, this.drawParams.dy, this.drawParams.w, this.drawParams.h
    );
  }

  resize(width: number, height: number) {
    this.clientSize = { width, height };
    this.drawParams = this.calculateDrawParams(this.serverSize, this.clientSize);

    this.target.width = width;
    this.target.height = height;

    this.onResize(this.serverSize, this.clientSize);
  }

  convertMousePosition(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this.drawParams.dx) / this.drawParams.scale,
      y: (y - this.drawParams.dy) / this.drawParams.scale,
    };
  }

  private calculateDrawParams(serverSize: Size, clientSize: Size): DrawParams {
    const scale = Math.min(clientSize.width / serverSize.width, clientSize.height / serverSize.height);
    const dx = (clientSize.width - serverSize.width * scale) / 2;
    const dy = (clientSize.height - serverSize.height * scale) / 2;
    return { scale, dx, dy, w: serverSize.width * scale, h: serverSize.height * scale };
  }
}

class ClientRenderer {
  private onResize: (clientSize: Size) => void;

  private target: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData;

  constructor(target: HTMLCanvasElement, width: number, height: number, onResize: (clientSize: Size) => void) {
    this.target = target;
    this.ctx = target.getContext("2d")!;
    this.target.width = width;
    this.target.height = height;

    this.imageData = new ImageData(width, height);

    this.onResize = onResize;
  }

  render(frame: { data: Uint8Array; width: number; height: number }) {
    if (this.imageData.width !== frame.width || this.imageData.height !== frame.height) {
      return console.error("Frame size does not match canvas size");
    }

    this.imageData.data.set(frame.data);
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  resize(width: number, height: number) {
    this.target.width = width;
    this.target.height = height;
    this.imageData = new ImageData(width, height);

    this.onResize({ width, height });
  }

  convertMousePosition(x: number, y: number): { x: number; y: number } {
    return { x, y };
  }
}