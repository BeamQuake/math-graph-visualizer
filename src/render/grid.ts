import type { Camera } from './camera';
import type { ThemeColors } from '../math/types';

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  w: number,
  h: number,
  colors: ThemeColors,
): void {
  const { xMin, xMax, yMin, yMax } = camera.getVisibleRange(w, h);

  // Calculate nice step sizes
  const targetMajor = 1 / camera.scale * 80; // ~80px between majors
  const majorStep = niceStep(targetMajor);
  const minorStep = majorStep / 5;

  ctx.save();

  // Minor grid lines
  ctx.strokeStyle = colors.gridMinor;
  ctx.lineWidth = 0.5;

  let x = Math.floor(xMin / minorStep) * minorStep;
  while (x <= xMax) {
    if (Math.abs(x) % majorStep > 0.0001) {
      const sx = camera.worldToScreen(x, 0, w, h).x;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();
    }
    x += minorStep;
  }

  let y = Math.floor(yMin / minorStep) * minorStep;
  while (y <= yMax) {
    if (Math.abs(y) % majorStep > 0.0001) {
      const sy = camera.worldToScreen(0, y, w, h).y;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
      ctx.stroke();
    }
    y += minorStep;
  }

  // Major grid lines
  ctx.strokeStyle = colors.gridMajor;
  ctx.lineWidth = 1;

  x = Math.floor(xMin / majorStep) * majorStep;
  while (x <= xMax) {
    if (Math.abs(x) > 0.0001) {
      const sx = camera.worldToScreen(x, 0, w, h).x;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();
    }
    x += majorStep;
  }

  y = Math.floor(yMin / majorStep) * majorStep;
  while (y <= yMax) {
    if (Math.abs(y) > 0.0001) {
      const sy = camera.worldToScreen(0, y, w, h).y;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
      ctx.stroke();
    }
    y += majorStep;
  }

  // Axes
  ctx.strokeStyle = colors.axes;
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  // X-axis
  const originY = camera.worldToScreen(0, 0, w, h).y;
  if (originY >= 0 && originY <= h) {
    ctx.moveTo(0, originY);
    ctx.lineTo(w, originY);

    // Arrow right
    const arrowSize = 8;
    ctx.lineTo(w - arrowSize, originY - arrowSize / 2);
    ctx.moveTo(w, originY);
    ctx.lineTo(w - arrowSize, originY + arrowSize / 2);
  }

  // Y-axis
  const originX = camera.worldToScreen(0, 0, w, h).x;
  if (originX >= 0 && originX <= w) {
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, h);

    // Arrow top
    const arrowSize = 8;
    ctx.lineTo(originX - arrowSize / 2, arrowSize);
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX + arrowSize / 2, arrowSize);
  }

  ctx.stroke();

  // Axis labels
  ctx.fillStyle = colors.text;
  ctx.globalAlpha = 0.7;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const labelStep = majorStep;
  x = Math.floor(xMin / labelStep) * labelStep;
  while (x <= xMax) {
    if (Math.abs(x) > 0.0001) {
      const sx = camera.worldToScreen(x, 0, w, h).x;
      const labelY = Math.min(h - 2, Math.max(2, originY + 4));
      if (originY < h - 10 && originY > 10) {
        ctx.fillText(formatNum(x), sx, labelY);
      }
    }
    x += labelStep;
  }

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  y = Math.floor(yMin / labelStep) * labelStep;
  while (y <= yMax) {
    if (Math.abs(y) > 0.0001) {
      const sy = camera.worldToScreen(0, y, w, h).y;
      const labelX = Math.min(w - 4, Math.max(4, originX - 6));
      if (originX < w - 20 && originX > 20) {
        ctx.fillText(formatNum(y), labelX, sy);
      }
    }
    y += labelStep;
  }

  // Origin label
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  if (originX >= 0 && originX <= w && originY >= 0 && originY <= h) {
    ctx.fillText('O', originX - 6, originY + 4);
  }

  // Axis labels (x, y)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('x', w - 8, originY > 0 && originY < h ? originY - 6 : h - 6);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('y', originX + 6, 10);

  ctx.globalAlpha = 1;

  ctx.restore();
}

function niceStep(target: number): number {
  const exp = Math.floor(Math.log10(target));
  const frac = target / Math.pow(10, exp);

  let nice: number;
  if (frac < 1.5) nice = 1;
  else if (frac < 3.5) nice = 2;
  else if (frac < 7.5) nice = 5;
  else nice = 10;

  return nice * Math.pow(10, exp);
}

function formatNum(n: number): string {
  const abs = Math.abs(n);
  if (abs < 0.001) return '0';
  if (abs < 1) return n.toFixed(2);
  if (abs < 10) return n.toFixed(1);
  if (abs < 1000) return n.toFixed(0);
  return n.toExponential(1);
}
