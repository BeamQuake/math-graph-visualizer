import type { PointOfInterest, ThemeColors } from '../math/types';

export class InfoPanel {
  private container: HTMLElement;
  private highlightListeners: Array<(idx: number | null) => void> = [];

  constructor() {
    this.container = document.getElementById('info-points')!;
    this.container.addEventListener('mouseleave', () => {
      this.highlightListeners.forEach((fn) => fn(null));
    });
  }

  onHighlight(fn: (idx: number | null) => void): void {
    this.highlightListeners.push(fn);
  }

  update(points: PointOfInterest[], colors: ThemeColors): void {
    if (points.length === 0) {
      this.container.innerHTML = '<p class="info-empty">Keine besonderen Punkte gefunden</p>';
      return;
    }

    this.container.innerHTML = points
      .map(
        (p, i) =>
          `<div class="point-entry" data-point-index="${i}">
        <span class="point-entry__dot" style="background:${this.colorForKind(p.kind, colors)}"></span>
        <span class="point-entry__label">${this.labelForKind(p.kind)}</span>
        <span class="point-entry__coords">(${fmt(p.x)}, ${fmt(p.y)})</span>
      </div>`,
      )
      .join('');

    this.container.querySelectorAll('.point-entry').forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.addEventListener('mouseenter', () => {
        const idx = parseInt(htmlEl.dataset.pointIndex ?? '', 10);
        if (!isNaN(idx)) {
          this.highlightListeners.forEach((fn) => fn(idx));
        }
      });
      htmlEl.addEventListener('mouseleave', () => {
        this.highlightListeners.forEach((fn) => fn(null));
      });
    });
  }

  clear(): void {
    this.container.innerHTML = '<p class="info-empty">Keine Funktion geladen</p>';
    this.highlightListeners.forEach((fn) => fn(null));
  }

  private labelForKind(kind: PointOfInterest['kind']): string {
    switch (kind) {
      case 'maximum':
        return 'Max';
      case 'minimum':
        return 'Min';
      case 'inflection':
        return 'Wend';
      case 'zero':
        return 'Null';
    }
  }

  private colorForKind(kind: PointOfInterest['kind'], colors: ThemeColors): string {
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
}

function fmt(v: number): string {
  const abs = Math.abs(v);
  if (abs < 0.001) return '0';
  if (abs < 1) return v.toFixed(2);
  if (abs < 100) return v.toFixed(1);
  return v.toFixed(0);
}
