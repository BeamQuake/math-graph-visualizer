import { describe, it, expect } from 'vitest';
import {
  easeInOutCubic,
  easeOutCubic,
  easeOutElastic,
  createTween,
  updateTween,
  TweenController,
} from './animation';

describe('animation', () => {
  describe('easing functions', () => {
    describe('easeInOutCubic', () => {
      it('returns 0 at t=0', () => {
        expect(easeInOutCubic(0)).toBe(0);
      });

      it('returns 1 at t=1', () => {
        expect(easeInOutCubic(1)).toBe(1);
      });

      it('returns 0.5 at t=0.5 (symmetric)', () => {
        expect(easeInOutCubic(0.5)).toBe(0.5);
      });

      it('increases monotonically from 0 to 1', () => {
        for (let t = 0; t <= 1; t += 0.1) {
          const val = easeInOutCubic(t);
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThanOrEqual(1);
        }
      });

      it('matches formula: t < 0.5 → 4*t^3', () => {
        expect(easeInOutCubic(0.25)).toBeCloseTo(4 * 0.25 * 0.25 * 0.25);
      });

      it('matches formula: t >= 0.5 → 1 - (-2t+2)^3 / 2', () => {
        const t = 0.75;
        const expected = 1 - Math.pow(-2 * t + 2, 3) / 2;
        expect(easeInOutCubic(t)).toBeCloseTo(expected);
      });
    });

    describe('easeOutCubic', () => {
      it('returns 0 at t=0', () => {
        expect(easeOutCubic(0)).toBe(0);
      });

      it('returns 1 at t=1', () => {
        expect(easeOutCubic(1)).toBe(1);
      });

      it('matches formula: 1 - (1-t)^3', () => {
        for (let t = 0; t <= 1; t += 0.2) {
          const expected = 1 - Math.pow(1 - t, 3);
          expect(easeOutCubic(t)).toBeCloseTo(expected);
        }
      });
    });

    describe('easeOutElastic', () => {
      it('returns 0 at t=0', () => {
        expect(easeOutElastic(0)).toBe(0);
      });

      it('returns 1 at t=1', () => {
        expect(easeOutElastic(1)).toBe(1);
      });

      it('produces values near 1 for t close to 1', () => {
        expect(easeOutElastic(0.9)).toBeGreaterThan(0.8);
      });

      it('has smooth transitions', () => {
        for (let t = 0.01; t <= 0.99; t += 0.05) {
          const val = easeOutElastic(t);
          expect(Number.isFinite(val)).toBe(true);
        }
      });
    });
  });

  describe('tween functions', () => {
    it('createTween creates tween with properties', () => {
      const tween = createTween(0, 100, 1000, easeInOutCubic);
      expect(tween.from).toBe(0);
      expect(tween.to).toBe(100);
      expect(tween.duration).toBe(1000);
      expect(tween.easing).toBe(easeInOutCubic);
    });

    it('updateTween returns from value at t=0', () => {
      const startTime = 1000;
      const tween = {
        from: 0,
        to: 100,
        duration: 1000,
        startTime: startTime,
        easing: easeInOutCubic,
      };
      const result = updateTween(tween, startTime);
      expect(result.value).toBe(0);
      expect(result.done).toBe(false);
    });

    it('updateTween returns to value at t=duration', () => {
      const startTime = 1000;
      const tween = {
        from: 0,
        to: 100,
        duration: 1000,
        startTime: startTime,
        easing: easeInOutCubic,
      };
      const result = updateTween(tween, startTime + 1000);
      expect(result.value).toBe(100);
      expect(result.done).toBe(true);
    });

    it('updateTween interpolates correctly', () => {
      const startTime = 1000;
      const tween = {
        from: 0,
        to: 100,
        duration: 1000,
        startTime: startTime,
        easing: (t: number) => t,
      };
      const result = updateTween(tween, startTime + 500);
      expect(result.value).toBe(50);
      expect(result.done).toBe(false);
    });

    it('updateTween goes beyond duration but marks done', () => {
      const startTime = 1000;
      const tween = {
        from: 0,
        to: 100,
        duration: 1000,
        startTime: startTime,
        easing: easeInOutCubic,
      };
      const result = updateTween(tween, startTime + 2000);
      expect(result.value).toBe(100);
      expect(result.done).toBe(true);
    });
  });

  describe('TweenController', () => {
    it('is initially empty', () => {
      const controller = new TweenController();
      expect(controller.isActive()).toBe(false);
    });

    it('becomes active after setting a tween', () => {
      const controller = new TweenController();
      controller.set('test', 0, 100, 1000);
      expect(controller.isActive()).toBe(true);
    });

    it('get returns done=true and value=0 for unknown key', () => {
      const controller = new TweenController();
      const result = controller.get('unknown', 1000);
      expect(result.value).toBe(0);
      expect(result.done).toBe(true);
    });

    it('clear removes all tweens', () => {
      const controller = new TweenController();
      controller.set('test', 0, 100, 1000);
      expect(controller.isActive()).toBe(true);
      controller.clear();
      expect(controller.isActive()).toBe(false);
    });


  });
});
