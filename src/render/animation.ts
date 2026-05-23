export type EasingFn = (t: number) => number;

export const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutCubic: EasingFn = (t) => 1 - Math.pow(1 - t, 3);

export const easeOutElastic: EasingFn = (t) => {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
};

export interface Tween {
  from: number;
  to: number;
  duration: number;
  startTime: number;
  easing: EasingFn;
}

export function createTween(
  from: number,
  to: number,
  duration: number,
  easing: EasingFn = easeInOutCubic,
): Tween {
  return { from, to, duration, startTime: performance.now(), easing };
}

export function updateTween(tween: Tween, now: number): { value: number; done: boolean } {
  const elapsed = now - tween.startTime;
  const t = Math.min(1, elapsed / tween.duration);
  const value = tween.from + (tween.to - tween.from) * tween.easing(t);
  return { value, done: t >= 1 };
}

export class TweenController {
  private tweens: Map<string, Tween> = new Map();

  set(key: string, from: number, to: number, duration: number = 350, easing: EasingFn = easeInOutCubic): void {
    this.tweens.set(key, createTween(from, to, duration, easing));
  }

  get(key: string, now: number): { value: number; done: boolean } {
    const tween = this.tweens.get(key);
    if (!tween) return { value: 0, done: true };
    const result = updateTween(tween, now);
    if (result.done) {
      this.tweens.delete(key);
    }
    return result;
  }

  isActive(): boolean {
    return this.tweens.size > 0;
  }

  clear(): void {
    this.tweens.clear();
  }
}
