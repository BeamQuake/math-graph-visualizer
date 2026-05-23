import { describe, it, expect } from 'vitest';
import { Parser } from './parser';
import { differentiate } from './differentiate';
import { analyzeFunction } from './calculus';

describe('Calculus', () => {
  it('finds zeros of linear function', () => {
    const expr = Parser.parse('x - 2');
    const result = analyzeFunction(expr, null, null, null, -10, 10);
    expect(result.zeros.length).toBeGreaterThanOrEqual(1);
    const zero = result.zeros.find((z) => Math.abs(z.x - 2) < 0.01);
    expect(zero).toBeDefined();
  });

  it('finds zeros of quadratic', () => {
    // x^2 - 4 = 0 => x = ±2
    const expr = Parser.parse('x^2 - 4');
    const result = analyzeFunction(expr, null, null, null, -5, 5);
    expect(result.zeros.length).toBeGreaterThanOrEqual(2);
    const xs = result.zeros.map((z) => Math.round(z.x)).sort((a, b) => a - b);
    expect(xs).toContain(-2);
    expect(xs).toContain(2);
  });

  it('finds extrema of x^2 (minimum at 0)', () => {
    const expr = Parser.parse('x^2');
    const f1 = differentiate(expr);
    const f2 = differentiate(f1);
    const result = analyzeFunction(expr, f1, f2, null, -5, 5);
    expect(result.extrema.length).toBeGreaterThanOrEqual(1);
    const min = result.extrema.find((e) => e.kind === 'minimum');
    expect(min).toBeDefined();
    expect(Math.abs(min!.x)).toBeLessThan(0.01);
    expect(Math.abs(min!.y)).toBeLessThan(0.01);
  });

  it('finds extrema of -x^2 (maximum at 0)', () => {
    const expr = Parser.parse('-x^2');
    const f1 = differentiate(expr);
    const f2 = differentiate(f1);
    const result = analyzeFunction(expr, f1, f2, null, -5, 5);
    expect(result.extrema.length).toBeGreaterThanOrEqual(1);
    const max = result.extrema.find((e) => e.kind === 'maximum');
    expect(max).toBeDefined();
    expect(Math.abs(max!.x)).toBeLessThan(0.01);
  });

  it('finds extrema of x^3 - 3x^2 + 2', () => {
    // f'(x) = 3x^2 - 6x = 3x(x-2) => critical at x=0, x=2
    // f''(x) = 6x - 6
    // f''(0) = -6 < 0 => max at x=0, y=2
    // f''(2) = 6 > 0 => min at x=2, y=-2
    const expr = Parser.parse('x^3 - 3*x^2 + 2');
    const f1 = differentiate(expr);
    const f2 = differentiate(f1);
    const result = analyzeFunction(expr, f1, f2, null, -5, 5);

    const max = result.extrema.find((e) => e.kind === 'maximum');
    const min = result.extrema.find((e) => e.kind === 'minimum');

    expect(max).toBeDefined();
    expect(Math.abs(max!.x)).toBeLessThan(0.1);
    expect(Math.abs(max!.y - 2)).toBeLessThan(0.1);

    expect(min).toBeDefined();
    expect(Math.abs(min!.x - 2)).toBeLessThan(0.1);
    expect(Math.abs(min!.y + 2)).toBeLessThan(0.1);
  });

  it('finds inflection point of x^3', () => {
    // f(x) = x^3, f''(x) = 6x, zero at x=0
    // f'''(x) = 6 ≠ 0 => inflection point at (0, 0)
    const expr = Parser.parse('x^3');
    const f1 = differentiate(expr);
    const f2 = differentiate(f1);
    const f3 = differentiate(f2);
    const result = analyzeFunction(expr, f1, f2, f3, -5, 5);

    expect(result.inflectionPoints.length).toBeGreaterThanOrEqual(1);
    const ip = result.inflectionPoints[0];
    expect(Math.abs(ip.x)).toBeLessThan(0.1);
  });

  it('finds zeros of sin(x) in [-5, 5]', () => {
    const expr = Parser.parse('sin(x)');
    const result = analyzeFunction(expr, null, null, null, -5, 5);
    expect(result.zeros.length).toBeGreaterThanOrEqual(3); // -pi, 0, pi
    const xs = result.zeros.map((z) => Math.round(z.x)).sort((a, b) => a - b);
    expect(xs).toContain(0);
  });
});
