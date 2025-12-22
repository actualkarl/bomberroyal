import { Application, Container, FederatedPointerEvent } from 'pixi.js';

export class SpectatorCamera {
  private app: Application;
  private enabled: boolean = false;
  private zoom: number = 1;
  private minZoom: number = 0.3;
  private maxZoom: number = 1;
  private dragging: boolean = false;
  private lastPos: { x: number; y: number } = { x: 0, y: 0 };
  private fogLayer: Container | null = null;

  // Bound handlers for cleanup
  private wheelHandler: (e: WheelEvent) => void;
  private pointerDownHandler: (e: FederatedPointerEvent) => void;
  private pointerMoveHandler: (e: FederatedPointerEvent) => void;
  private pointerUpHandler: () => void;

  constructor(app: Application) {
    this.app = app;

    this.wheelHandler = this.onWheel.bind(this);
    this.pointerDownHandler = this.onPointerDown.bind(this);
    this.pointerMoveHandler = this.onPointerMove.bind(this);
    this.pointerUpHandler = this.onPointerUp.bind(this);
  }

  setFogLayer(layer: Container): void {
    this.fogLayer = layer;
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;

    // Hide fog
    if (this.fogLayer) {
      this.fogLayer.visible = false;
    }

    // Enable zoom (scroll wheel)
    this.app.canvas.addEventListener('wheel', this.wheelHandler, { passive: false });

    // Enable pan (click and drag)
    this.app.stage.eventMode = 'static';
    this.app.stage.on('pointerdown', this.pointerDownHandler);
    this.app.stage.on('pointermove', this.pointerMoveHandler);
    this.app.stage.on('pointerup', this.pointerUpHandler);
    this.app.stage.on('pointerupoutside', this.pointerUpHandler);
  }

  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;

    // Show fog
    if (this.fogLayer) {
      this.fogLayer.visible = true;
    }

    // Disable zoom
    this.app.canvas.removeEventListener('wheel', this.wheelHandler);

    // Disable pan
    this.app.stage.off('pointerdown', this.pointerDownHandler);
    this.app.stage.off('pointermove', this.pointerMoveHandler);
    this.app.stage.off('pointerup', this.pointerUpHandler);
    this.app.stage.off('pointerupoutside', this.pointerUpHandler);

    // Reset zoom
    this.zoom = 1;
    this.app.stage.scale.set(1);
    this.app.stage.position.set(0, 0);
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();

    const oldZoom = this.zoom;
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom - e.deltaY * 0.001));

    // Zoom towards mouse position
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;

    const worldX = (mouseX - this.app.stage.position.x) / oldZoom;
    const worldY = (mouseY - this.app.stage.position.y) / oldZoom;

    this.app.stage.scale.set(this.zoom);

    this.app.stage.position.x = mouseX - worldX * this.zoom;
    this.app.stage.position.y = mouseY - worldY * this.zoom;
  }

  private onPointerDown(e: FederatedPointerEvent): void {
    this.dragging = true;
    this.lastPos = { x: e.global.x, y: e.global.y };
  }

  private onPointerMove(e: FederatedPointerEvent): void {
    if (!this.dragging) return;

    const dx = e.global.x - this.lastPos.x;
    const dy = e.global.y - this.lastPos.y;

    this.app.stage.position.x += dx;
    this.app.stage.position.y += dy;

    this.lastPos = { x: e.global.x, y: e.global.y };
  }

  private onPointerUp(): void {
    this.dragging = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
