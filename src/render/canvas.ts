import type { Expr, PointOfInterest, ThemeColors, DerivativeInfo } from '../math/types';
import { Camera } from './camera';
import { FunctionPlotter } from './plot';
import type { PlotOptions } from './plot';
import { drawGrid } from './grid';
import { drawMarkers } from './markers';
import { evaluate } from '../math/evaluator';

export interface GraphConfig {
  fExpr: Expr | null;
  derivatives: DerivativeInfo[];
  pointsOfInterest: PointOfInterest[];
  showHelpers: boolean;
  showLabels: boolean;
  colors: ThemeColors;
  highlightedPoint: number;
}

export class GraphCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  camera: Camera;
  private plotter: FunctionPlotter;
  private rafId: number = 0;
  private config: GraphConfig | null = null;
  private hoverWorld: { x: number; y: number } | null = null;

  private logicalW = 0;
  private logicalH = 0;
  private dpr = 1;

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

  private lastPinchDist = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.camera = new Camera();
    this.plotter = new FunctionPlotter();

    this.setupResize();
    this.setupInteraction();
  }

  setConfig(config: GraphConfig): void {
    this.config = config;
  }

  start(): void {
    const loop = () => {
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  resize(): void {
    this.setupResize();
  }

  getVisibleRange(): { xMin: number; xMax: number; yMin: number; yMax: number } {
    return this.camera.getVisibleRange(this.logicalW, this.logicalH);
  }

  resetCamera(): void {
    this.camera.reset();
  }

  setInitialScale(): void {
    const s = this.logicalW / 22;
    this.camera.scale = s;
    this.camera.targetScale = s;
  }

  private render(): void {
    const cfg = this.config;
    if (!cfg) return;

    const w = this.logicalW;
    const h = this.logicalH;
    const dpr = this.dpr;

    // Reset to physical pixel space
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = cfg.colors.bg;
    this.ctx.fillRect(0, 0, w, h);

    drawGrid(this.ctx, this.camera, w, h, cfg.colors);

    for (const deriv of cfg.derivatives) {
      if (!deriv.visible || !deriv.expr) continue;
      const opts = this.derivativeOptions(deriv.order, cfg.colors);
      this.plotter.plot(this.ctx, this.camera, w, h, deriv.expr, opts);
    }

    if (cfg.fExpr) {
      const opts = this.mainFunctionOptions(cfg.colors);
      this.plotter.plot(this.ctx, this.camera, w, h, cfg.fExpr, opts);
    }

    drawMarkers(this.ctx, this.camera, w, h, cfg.pointsOfInterest, cfg.colors, cfg.showLabels, cfg.highlightedPoint);

    if (cfg.showHelpers && this.hoverWorld !== null) {
      this.drawHelpers(cfg.colors);
    }
  }

  private drawHelpers(colors: ThemeColors): void {
    if (!this.hoverWorld) return;

    const w = this.logicalW;
    const h = this.logicalH;
    const { x, y } = this.hoverWorld;

    const sx = (x - this.camera.offsetX) * this.camera.scale + w / 2;
    const sy = h / 2 - (y - this.camera.offsetY) * this.camera.scale;

    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return;

    this.ctx.save();

    const originX = (0 - this.camera.offsetX) * this.camera.scale + w / 2;
    const originY = h / 2 - (0 - this.camera.offsetY) * this.camera.scale;

    this.ctx.strokeStyle = colors.textDim;
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);

    // Vertical dashed line
    if (sx >= 0 && sx <= w) {
      this.ctx.beginPath();
      this.ctx.moveTo(sx, sy);
      this.ctx.lineTo(sx, originY >= 0 && originY <= h ? originY : h);
      this.ctx.stroke();

      // x-axis label
      this.ctx.fillStyle = colors.text;
      this.ctx.globalAlpha = 0.7;
      this.ctx.font = '12px system-ui, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(formatCoord(x), sx, Math.min(h - 14, Math.max(2, originY + 4)));
    }

    // Horizontal dashed line
    if (sy >= 0 && sy <= h) {
      this.ctx.beginPath();
      this.ctx.moveTo(sx, sy);
      this.ctx.lineTo(originX >= 0 && originX <= w ? originX : 0, sy);
      this.ctx.stroke();

      // y-axis label
      this.ctx.textAlign = 'right';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(formatCoord(y), Math.min(w - 4, Math.max(4, originX - 6)), sy);
    }

    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1;

    // Cursor crosshair dot
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    this.ctx.fillStyle = colors.axes;
    this.ctx.fill();

    // Coordinates label (no background)
    const label = `(${formatCoord(x)}, ${formatCoord(y)})`;
    this.ctx.font = '12px system-ui, sans-serif';
    this.ctx.fillStyle = colors.textDim;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'bottom';
    const tx = Math.min(sx + 10, w - 60);
    const ty = Math.max(sy - 10, 16);
    this.ctx.fillText(label, tx, ty);

    this.ctx.restore();
  }

  private mainFunctionOptions(colors: ThemeColors): PlotOptions {
    return {
      color: colors.f,
      lineWidth: 2.5,
      glowColor: colors.f,
      glowWidth: 8,
    };
  }

  private derivativeOptions(order: number, colors: ThemeColors): PlotOptions {
    const base = order === 1 ? colors.f1 : order === 2 ? colors.f2 : colors.f3;
    const dash = order === 1 ? [8, 4] : order === 2 ? [2, 6] : [8, 4, 2, 4];
    return {
      color: base,
      lineWidth: 2,
      dash,
      opacity: 0.85,
    };
  }

  private setupResize(): void {
    const resize = () => {
      const rect = this.canvas.getBoundingClientRect();
      this.logicalW = rect.width;
      this.logicalH = rect.height;
      this.dpr = window.devicePixelRatio || 1;
      this.canvas.width = rect.width * this.dpr;
      this.canvas.height = rect.height * this.dpr;
      // ctx.scale NICHT hier — pro Frame via setTransform
    };
    window.addEventListener('resize', resize);
    resize();
  }

  private setupInteraction(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => this.onPointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => this.onPointerUp());
    this.canvas.addEventListener('mouseleave', () => { this.hoverWorld = null; });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const t = Math.min(1, Math.abs(e.deltaY) / 100);
      const factor = e.deltaY < 0 ? 1 + t * 0.2 : 1 / (1 + t * 0.2);
      this.camera.zoom(factor, cx, cy, this.logicalW, this.logicalH);
    }, { passive: false });

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        this.lastPinchDist = this.pinchDist(e.touches);
      }
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        this.onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        const dist = this.pinchDist(e.touches);
        if (this.lastPinchDist > 0) {
          const factor = dist / this.lastPinchDist;
          const rect = this.canvas.getBoundingClientRect();
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
          this.camera.zoom(factor, cx, cy, this.logicalW, this.logicalH);
        }
        this.lastPinchDist = dist;
      }
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      this.onPointerUp();
      this.lastPinchDist = 0;
    });
  }

  private onPointerDown(cx: number, cy: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.isDragging = true;
    this.dragStartX = cx - rect.left;
    this.dragStartY = cy - rect.top;
  }

  private onPointerMove(cx: number, cy: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = cx - rect.left;
    const y = cy - rect.top;

    if (this.isDragging) {
      const dx = x - this.dragStartX;
      const dy = y - this.dragStartY;
      this.camera.pan(dx, dy);
      this.dragStartX = x;
      this.dragStartY = y;
    }

    // Update hover world position
    const world = this.camera.screenToWorld(x, y, this.logicalW, this.logicalH);
    const cfg = this.config;
    if (cfg?.fExpr) {
      try {
        const fv = evaluate(cfg.fExpr, { x: world.x });
        this.hoverWorld = { x: world.x, y: Number.isFinite(fv) ? fv : world.y };
      } catch {
        this.hoverWorld = { x: world.x, y: world.y };
      }
    } else {
      this.hoverWorld = { x: world.x, y: world.y };
    }
  }

  private onPointerUp(): void {
    this.isDragging = false;
  }

  private pinchDist(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

function formatCoord(v: number): string {
  if (!Number.isFinite(v)) return '∞';
  const abs = Math.abs(v);
  if (abs < 0.001) return '0';
  if (abs < 1) return v.toFixed(2);
  if (abs < 100) return v.toFixed(1);
  if (abs < 10000) return v.toFixed(0);
  return v.toExponential(2);
}
