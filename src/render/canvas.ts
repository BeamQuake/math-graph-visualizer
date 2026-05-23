import type { Expr, PointOfInterest, ThemeColors, DerivativeInfo } from '../math/types';
import { Camera } from './camera';
import { FunctionPlotter } from './plot';
import type { PlotOptions } from './plot';
import { drawGrid } from './grid';
import { drawMarkers } from './markers';
import { evaluate } from '../math/evaluator';
import { findNearestZeros } from '../math/calculus';

export interface GraphConfig {
  fExpr: Expr | null;
  derivatives: DerivativeInfo[];
  pointsOfInterest: PointOfInterest[];
  showHelpers: boolean;
  integralEnabled: boolean;
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
  private pointerScreen: { x: number; y: number } = { x: 0, y: 0 };

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
    const loop = (now: number) => {
      this.camera.tick(now);
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

  animateToFit(points: PointOfInterest[]): void {
    if (points.length === 0) return;

    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const p of points) {
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y;
      if (p.y > yMax) yMax = p.y;
    }

    const padFrac = 0.2;
    const xPad = Math.max((xMax - xMin) * padFrac, 2);
    const yPad = Math.max((yMax - yMin) * padFrac, 2);

    const cx = (xMin + xMax) / 2;
    const cy = (yMin + yMax) / 2;

    const scaleX = this.logicalW / (xMax - xMin + xPad * 2);
    const scaleY = this.logicalH / (yMax - yMin + yPad * 2);
    const scale = Math.max(5, Math.min(500, Math.min(scaleX, scaleY)));

    this.camera.animateTo({ offsetX: cx, offsetY: cy, scale });
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

    if (cfg.integralEnabled && this.hoverWorld !== null && cfg.fExpr) {
      this.drawIntegral(cfg);
    }

    if ((cfg.showHelpers || cfg.integralEnabled) && this.hoverWorld !== null) {
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
    const tx = Math.min(Math.max(sx + 10, 4), w - 60);
    const ty = Math.min(Math.max(sy - 10, 16), h - 4);
    this.ctx.fillText(label, tx, ty);

    this.ctx.restore();
  }

  private f(expr: Expr, x: number): number {
    try { return evaluate(expr, { x }); } catch { return NaN; }
  }

  private drawIntegral(cfg: GraphConfig): void {
    if (!this.hoverWorld || !cfg.fExpr) return;

    const cursorX = this.hoverWorld.x;
    const zeroPoints = cfg.pointsOfInterest.filter(p => p.kind === 'zero');
    const { left, right } = findNearestZeros(zeroPoints, cursorX);

    const s = this.camera.scale;
    const w = this.logicalW;
    const h = this.logicalH;

    const integrals: { fromX: number; toX: number; value: number; label: string }[] = [];

    const { yMin, yMax } = this.camera.getVisibleRange(w, h);
    const asymptoteThreshold = (yMax - yMin) * 3;

    const scanToEnd = (startX: number, endX: number): number | null => {
      const step = (endX - startX) / 200;
      if (step === 0 || !Number.isFinite(step)) return 0;

      const expr = cfg.fExpr!;
      let prevY = this.f(expr, startX);
      if (!Number.isFinite(prevY)) return null;

      let area = 0;
      for (let i = 1; i <= 200; i++) {
        const x = startX + i * step;
        const y = this.f(expr, x);

        if (!Number.isFinite(y)) return null;

        if (Number.isFinite(prevY) && prevY * y < 0 && Math.abs(y - prevY) > asymptoteThreshold) {
          return null;
        }

        area += (prevY + y) * step / 2;
        prevY = y;
      }

      return area;
    };

    if (left !== null) {
      const value = scanToEnd(left, cursorX);
      if (value !== null) {
        const label = Number.isFinite(value)
          ? `∫(${formatCoord(left)} → ·) = ${formatCoord(value)}`
          : `∫(${formatCoord(left)} → ·) = undefiniert`;
        integrals.push({ fromX: left, toX: cursorX, value, label });
      }
    }

    if (right !== null) {
      const value = scanToEnd(cursorX, right);
      if (value !== null) {
        const label = Number.isFinite(value)
          ? `∫(· → ${formatCoord(right)}) = ${formatCoord(value)}`
          : `∫(· → ${formatCoord(right)}) = undefiniert`;
        integrals.push({ fromX: cursorX, toX: right, value, label });
      }
    }

    if (integrals.length === 0) return;

    // Draw area fills in world coordinates
    this.ctx.save();
    this.ctx.transform(s, 0, 0, -s, w / 2 - this.camera.offsetX * s, h / 2 + this.camera.offsetY * s);

    for (const iv of integrals) {
      const { fromX, toX, value } = iv;
      if (!Number.isFinite(value)) continue;
      const numSamples = 200;
      const step = (toX - fromX) / numSamples;

      this.ctx.beginPath();
      let segStart: number | null = null;
      let prevY = NaN;
      for (let i = 0; i <= numSamples; i++) {
        const x = fromX + i * step;
        const y = this.f(cfg.fExpr!, x);
        if (Number.isFinite(y)) {
          if (segStart === null) {
            segStart = i;
            this.ctx.moveTo(x, y);
          } else if (Number.isFinite(prevY) && prevY * y < 0 && Math.abs(y - prevY) > asymptoteThreshold) {
            const segEndX = fromX + (i - 1) * step;
            const segStartX = fromX + segStart * step;
            this.ctx.lineTo(segEndX, 0);
            this.ctx.lineTo(segStartX, 0);
            this.ctx.closePath();
            segStart = i;
            this.ctx.moveTo(x, y);
          } else {
            this.ctx.lineTo(x, y);
          }
          prevY = y;
        } else {
          if (segStart !== null) {
            const segEndX = fromX + (i - 1) * step;
            const segStartX = fromX + segStart * step;
            this.ctx.lineTo(segEndX, 0);
            this.ctx.lineTo(segStartX, 0);
            this.ctx.closePath();
            segStart = null;
          }
          prevY = NaN;
        }
      }
      if (segStart === null) continue;

      this.ctx.lineTo(toX, 0);
      this.ctx.lineTo(fromX + segStart * step, 0);
      this.ctx.closePath();

      this.ctx.fillStyle = value >= 0 ? 'rgba(0,200,100,0.25)' : 'rgba(200,50,50,0.25)';
      this.ctx.fill();
    }

    this.ctx.restore();

    // Draw tooltip label in screen coordinates
    const lineH = 18;
    const padX = 14;
    const padY = 7;
    const px = this.pointerScreen.x;
    const py = this.pointerScreen.y;

    this.ctx.save();
    this.ctx.font = 'bold 13px system-ui, sans-serif';

    let maxW = 0;
    for (const iv of integrals) {
      const m = this.ctx.measureText(iv.label);
      if (m.width > maxW) maxW = m.width;
    }
    const bw = maxW + padX * 2;
    const bh = integrals.length * lineH + padY * 2;

    let bx = px + 15;
    let by = py - 10 - bh;
    bx = Math.min(bx, w - bw - 10);
    by = Math.max(by, 10);

    const bg = this.cssVar('--bg-panel');
    const border = this.cssVar('--border');
    const text = this.cssVar('--text');

    this.ctx.fillStyle = bg;
    this.ctx.beginPath();
    this.ctx.roundRect(bx, by, bw, bh, 4);
    this.ctx.fill();
    this.ctx.strokeStyle = border;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.fillStyle = text;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    let labelY = by + padY;
    for (const iv of integrals) {
      this.ctx.fillText(iv.label, bx + padX, labelY);
      labelY += lineH;
    }

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
    this.pointerScreen = { x, y };

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

  private cssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
}

function formatCoord(v: number): string {
  if (!Number.isFinite(v)) return '∞';
  const abs = Math.abs(v);
  if (abs < 0.001) return '0';
  if (abs < 1) return v.toFixed(2);
  if (abs < 100) return v.toFixed(2);
  if (abs < 10000) return v.toFixed(0);
  return v.toExponential(2);
}
