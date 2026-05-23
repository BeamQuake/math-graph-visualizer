import type { Camera } from './camera';
import type { Expr } from '../math/types';
import { evaluate } from '../math/evaluator';

export interface PlotOptions {
  color: string;
  lineWidth: number;
  dash?: number[];
  glowColor?: string;
  glowWidth?: number;
  opacity?: number;
}

const SAMPLE_RESOLUTION = 2;

export class FunctionPlotter {
  plot(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    w: number,
    h: number,
    expr: Expr,
    options: PlotOptions,
  ): void {
    const { xMin, xMax, yMin, yMax } = camera.getVisibleRange(w, h);
    const numSamples = Math.ceil(w / SAMPLE_RESOLUTION);
    const step = (xMax - xMin) / numSamples;
    const asymptoteThreshold = (yMax - yMin) * 3;

    const points: { x: number; y: number }[] = [];
    for (let i = 0; i <= numSamples; i++) {
      const x = xMin + i * step;
      let y: number;
      try {
        y = evaluate(expr, { x });
      } catch {
        if (points.length > 0) points.push({ x, y: NaN });
        continue;
      }

      if (!Number.isFinite(y)) {
        if (points.length > 0) points.push({ x, y: NaN });
        continue;
      }

      if (points.length > 0 && Number.isFinite(points[points.length - 1].y)) {
        const prevY = points[points.length - 1].y;
        if (Math.abs(y - prevY) > asymptoteThreshold) {
          points.push({ x, y: NaN });
        }
      }

      points.push({ x, y });
    }

    if (points.length < 2) return;

    const opacity = options.opacity ?? 1;

    ctx.save();
    ctx.transform(
      camera.scale, 0,
      0, -camera.scale,
      w / 2 - camera.offsetX * camera.scale,
      h / 2 + camera.offsetY * camera.scale,
    );

    if (options.glowColor) {
      ctx.save();
      ctx.globalAlpha = opacity * 0.2;
      ctx.strokeStyle = options.glowColor;
      ctx.lineWidth = (options.glowWidth ?? 6) / camera.scale;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'butt';
      this.drawPath(ctx, points);
      ctx.stroke();
      ctx.restore();
    }

    ctx.globalAlpha = opacity;
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth / camera.scale;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (options.dash) {
      ctx.setLineDash(options.dash.map((d) => d / camera.scale));
    }
    this.drawPath(ctx, points);
    ctx.stroke();

    ctx.restore();
  }

  private drawPath(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
  ): void {
    ctx.beginPath();
    let i = 0;

    while (i < points.length) {
      while (i < points.length && !Number.isFinite(points[i].y)) i++;
      if (i >= points.length) break;

      ctx.moveTo(points[i].x, points[i].y);
      i++;

      while (i < points.length && Number.isFinite(points[i].y)) {
        ctx.lineTo(points[i].x, points[i].y);
        i++;
      }
    }
  }
}
