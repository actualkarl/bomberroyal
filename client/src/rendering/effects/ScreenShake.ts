import { Application } from 'pixi.js';

export class ScreenShake {
  private app: Application;
  private originalX: number = 0;
  private originalY: number = 0;
  private shaking: boolean = false;

  constructor(app: Application) {
    this.app = app;
  }

  shake(intensity: number = 5, duration: number = 200): void {
    if (this.shaking) return;

    this.shaking = true;
    this.originalX = this.app.stage.position.x;
    this.originalY = this.app.stage.position.y;

    const startTime = Date.now();

    const doShake = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed < duration) {
        const decay = 1 - (elapsed / duration);
        this.app.stage.position.x = this.originalX + (Math.random() - 0.5) * intensity * decay;
        this.app.stage.position.y = this.originalY + (Math.random() - 0.5) * intensity * decay;
        requestAnimationFrame(doShake);
      } else {
        this.app.stage.position.x = this.originalX;
        this.app.stage.position.y = this.originalY;
        this.shaking = false;
      }
    };

    doShake();
  }

  // Store position for spectator mode
  storeOriginalPosition(): void {
    this.originalX = this.app.stage.position.x;
    this.originalY = this.app.stage.position.y;
  }
}
