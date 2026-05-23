import { describe, it, expect } from 'vitest';
import { Parser } from '../math/parser';
import { extendTowardAsymptote, extendBackwardFromNan } from './plot';

describe('extendTowardAsymptote', () => {
  it('empty points does nothing', () => {
    const expr = Parser.parse('1/x');
    const points: { x: number; y: number }[] = [];
    extendTowardAsymptote(points, expr, 0);
    expect(points).toHaveLength(0);
  });

  it('last point non-finite does nothing', () => {
    const expr = Parser.parse('1/x');
    const points: { x: number; y: number }[] = [{ x: -0.1, y: NaN }];
    extendTowardAsymptote(points, expr, 0);
    expect(points).toHaveLength(1);
  });

  it('pushes point closer to asymptote for 1/x near 0', () => {
    const expr = Parser.parse('1/x');
    const points: { x: number; y: number }[] = [{ x: -0.1, y: -10 }];
    extendTowardAsymptote(points, expr, 0);
    expect(points).toHaveLength(2);
    const p = points[1];
    expect(p.x).toBeGreaterThan(-0.1);
    expect(p.x).toBeLessThan(0);
    expect(Number.isFinite(p.y)).toBe(true);
    expect(p.y).toBeLessThan(-10);
  });

  it('pushes point for ln(x-1) from valid to NaN', () => {
    const expr = Parser.parse('ln(x-1)');
    const points: { x: number; y: number }[] = [{ x: 1.1, y: -2.3026 }];
    extendTowardAsymptote(points, expr, 1);
    expect(points).toHaveLength(2);
    const p = points[1];
    expect(p.x).toBeGreaterThan(1);
    expect(p.x).toBeLessThan(1.1);
    expect(Number.isFinite(p.y)).toBe(true);
  });

  it('1/(x-2) approaching asymptote from left (valid < NaN)', () => {
    const expr = Parser.parse('1/(x-2)');
    const points: { x: number; y: number }[] = [{ x: 1.9, y: -10 }];
    extendTowardAsymptote(points, expr, 2);
    expect(points).toHaveLength(2);
    const p = points[1];
    expect(p.x).toBeGreaterThan(1.9);
    expect(p.x).toBeLessThan(2);
    expect(Number.isFinite(p.y)).toBe(true);
    expect(p.y).toBeLessThan(-10);
  });

  it('1/(x-2) approaching asymptote from right (valid > NaN)', () => {
    const expr = Parser.parse('1/(x-2)');
    const points: { x: number; y: number }[] = [{ x: 2.1, y: 10 }];
    extendTowardAsymptote(points, expr, 2);
    expect(points).toHaveLength(2);
    const p = points[1];
    expect(p.x).toBeGreaterThan(2);
    expect(p.x).toBeLessThan(2.1);
    expect(Number.isFinite(p.y)).toBe(true);
    expect(p.y).toBeGreaterThan(10);
  });
});

describe('extendBackwardFromNan', () => {
  it('nanX >= validX does nothing', () => {
    const expr = Parser.parse('ln(x-1)');
    const points: { x: number; y: number }[] = [];
    extendBackwardFromNan(points, expr, 2, 1.5);
    expect(points).toHaveLength(0);
  });

  it('pushes point near domain boundary for ln(x-1)', () => {
    const expr = Parser.parse('ln(x-1)');
    const points: { x: number; y: number }[] = [];
    extendBackwardFromNan(points, expr, 0.95, 1.05);
    expect(points).toHaveLength(1);
    const p = points[0];
    expect(p.x).toBeGreaterThan(1);
    expect(p.x).toBeLessThan(1.05);
    expect(Number.isFinite(p.y)).toBe(true);
    expect(p.y).toBeLessThan(0);
  });

  it('pushes point near 0 for 1/x approaching from positive side', () => {
    const expr = Parser.parse('1/x');
    const points: { x: number; y: number }[] = [];
    extendBackwardFromNan(points, expr, 0, 0.1);
    expect(points).toHaveLength(1);
    const p = points[0];
    expect(p.x).toBeGreaterThan(0);
    expect(p.x).toBeLessThan(0.1);
    expect(Number.isFinite(p.y)).toBe(true);
    expect(p.y).toBeGreaterThan(10);
  });

  it('pushes point for 1/(x-2) approaching from right', () => {
    const expr = Parser.parse('1/(x-2)');
    const points: { x: number; y: number }[] = [];
    extendBackwardFromNan(points, expr, 2, 2.5);
    expect(points).toHaveLength(1);
    const p = points[0];
    expect(p.x).toBeGreaterThan(2);
    expect(p.x).toBeLessThan(2.5);
    expect(Number.isFinite(p.y)).toBe(true);
  });

});
