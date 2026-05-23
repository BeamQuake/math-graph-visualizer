import type { CameraState } from '../math/types';

export const DEFAULT_CAMERA: CameraState = {
  offsetX: 0,
  offsetY: 0,
  scale: 40,
};

export class Camera {
  offsetX: number;
  offsetY: number;
  scale: number;

  targetOffsetX: number;
  targetOffsetY: number;
  targetScale: number;

  private animating = false;
  private animStart: number = 0;

  constructor(state: CameraState = DEFAULT_CAMERA) {
    this.offsetX = state.offsetX;
    this.offsetY = state.offsetY;
    this.scale = state.scale;
    this.targetOffsetX = state.offsetX;
    this.targetOffsetY = state.offsetY;
    this.targetScale = state.scale;
  }

  screenToWorld(sx: number, sy: number, canvasW: number, canvasH: number): { x: number; y: number } {
    const x = (sx - canvasW / 2) / this.scale + this.offsetX;
    const y = (canvasH / 2 - sy) / this.scale + this.offsetY;
    return { x, y };
  }

  worldToScreen(wx: number, wy: number, canvasW: number, canvasH: number): { x: number; y: number } {
    const x = (wx - this.offsetX) * this.scale + canvasW / 2;
    const y = canvasH / 2 - (wy - this.offsetY) * this.scale;
    return { x, y };
  }

  getVisibleRange(canvasW: number, canvasH: number): { xMin: number; xMax: number; yMin: number; yMax: number } {
    const topLeft = this.screenToWorld(0, 0, canvasW, canvasH);
    const bottomRight = this.screenToWorld(canvasW, canvasH, canvasW, canvasH);
    return {
      xMin: topLeft.x,
      xMax: bottomRight.x,
      yMin: bottomRight.y,
      yMax: topLeft.y,
    };
  }

  pan(dx: number, dy: number): void {
    this.offsetX -= dx / this.scale;
    this.offsetY += dy / this.scale;
    this.targetOffsetX = this.offsetX;
    this.targetOffsetY = this.offsetY;
  }

  zoom(factor: number, cx: number, cy: number, canvasW: number, canvasH: number): void {
    const world = this.screenToWorld(cx, cy, canvasW, canvasH);
    this.scale = Math.max(5, Math.min(500, this.scale * factor));
    this.targetScale = this.scale;

    const newScreen = this.worldToScreen(world.x, world.y, canvasW, canvasH);
    const ddx = (newScreen.x - cx) / this.scale;
    const ddy = (cy - newScreen.y) / this.scale;
    this.offsetX += ddx;
    this.offsetY += ddy;
    this.targetOffsetX = this.offsetX;
    this.targetOffsetY = this.offsetY;
  }

  tick(now: number): boolean {
    if (!this.animating) return false;

    const t = Math.min(1, (now - this.animStart) / 300);
    const e = easeInOutCubic(t);

    this.offsetX = lerp(this.offsetX, this.targetOffsetX, e);
    this.offsetY = lerp(this.offsetY, this.targetOffsetY, e);
    this.scale = lerp(this.scale, this.targetScale, e);

    if (t >= 1) {
      this.offsetX = this.targetOffsetX;
      this.offsetY = this.targetOffsetY;
      this.scale = this.targetScale;
      this.animating = false;
    }

    return this.animating;
  }

  animateTo(target: Partial<CameraState>): void {
    this.targetOffsetX = target.offsetX ?? this.targetOffsetX;
    this.targetOffsetY = target.offsetY ?? this.targetOffsetY;
    this.targetScale = target.scale ?? this.targetScale;
    this.animating = true;
    this.animStart = performance.now();
  }

  reset(): void {
    this.offsetX = DEFAULT_CAMERA.offsetX;
    this.offsetY = DEFAULT_CAMERA.offsetY;
    this.scale = DEFAULT_CAMERA.scale;
    this.targetOffsetX = this.offsetX;
    this.targetOffsetY = this.offsetY;
    this.targetScale = this.scale;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
