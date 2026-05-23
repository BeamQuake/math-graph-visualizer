import type { Camera } from './camera';
import type { ThemeColors, PointOfInterest } from '../math/types';

export function drawMarkers(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  w: number,
  h: number,
  points: PointOfInterest[],
  colors: ThemeColors,
  showLabels: boolean,
  highlightedIndex: number = -1,
): void {
  ctx.save();

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const sx = (p.x - camera.offsetX) * camera.scale + w / 2;
    const sy = h / 2 - (p.y - camera.offsetY) * camera.scale;

    if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;

    const isHighlighted = i === highlightedIndex;
    const color = getMarkerColor(p.kind, colors);
    const size = isHighlighted ? 10 : 7;

    // Highlight ring (outer glow)
    if (isHighlighted) {
      ctx.beginPath();
      ctx.arc(sx, sy, size + 10, 0, Math.PI * 2);
      ctx.fillStyle = color + '33';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sx, sy, size + 6, 0, Math.PI * 2);
      ctx.strokeStyle = color + 'aa';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Halo
    ctx.beginPath();
    ctx.arc(sx, sy, size + 4, 0, Math.PI * 2);
    ctx.fillStyle = color + '22';
    ctx.fill();

    // Marker shape
    ctx.beginPath();
    if (p.kind === 'inflection') {
      ctx.moveTo(sx, sy - size);
      ctx.lineTo(sx + size, sy);
      ctx.lineTo(sx, sy + size);
      ctx.lineTo(sx - size, sy);
      ctx.closePath();
    } else {
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
    }

    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = isHighlighted ? color : color + '88';
    ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
    ctx.stroke();

    // Label with background pill
    if (showLabels) {
      const labelText = `(${fmtCoord(p.x)}, ${fmtCoord(p.y)})`;
      const pad = 6;
      const lh = 22;

      ctx.font = '16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const metrics = ctx.measureText(labelText);
      const lw = metrics.width + pad * 2;
      const lx = sx - lw / 2;

      const labelY = p.kind === 'inflection' ? sy - size - lh - pad : sy + size + pad;
      const ly = labelY - 3;

      ctx.fillStyle = colors.bg;
      roundRect(ctx, lx, ly, lw, lh + 6, 4);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.fillText(labelText, sx, labelY);
    }
  }

  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getMarkerColor(kind: PointOfInterest['kind'], colors: ThemeColors): string {
  switch (kind) {
    case 'maximum':
      return colors.max;
    case 'minimum':
      return colors.min;
    case 'inflection':
      return colors.inflection;
    case 'zero':
      return colors.zero;
  }
}

function fmtCoord(v: number): string {
  const abs = Math.abs(v);
  if (abs < 0.001) return '0';
  if (abs < 1) return v.toFixed(2);
  if (abs < 100) return v.toFixed(1);
  return v.toFixed(0);
}
