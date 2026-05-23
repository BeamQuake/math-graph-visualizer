import { describe, it, expect } from 'vitest';
import { Parser } from './parser';
import { differentiate } from './differentiate';
import { simplify } from './simplify';
import { analyzeFunction, extractPolynomialCoeffs, solveQuadratic, findExtremaAlgebraic, computeDefiniteIntegral, findNearestZeros } from './calculus';

const n = (v: number) => ({ kind: 'number' as const, value: v });
const v = (name: string) => ({ kind: 'variable' as const, name });
const p = (base: string, exp: number) => ({ kind: 'binary' as const, op: '^' as const, left: v(base), right: n(exp) });
const m = (left: any, right: any) => ({ kind: 'binary' as const, op: '*' as const, left, right });
const a = (left: any, right: any) => ({ kind: 'binary' as const, op: '+' as const, left, right });

describe('extractPolynomialCoeffs', () => {
  it('constant', () => {
    expect(extractPolynomialCoeffs(n(5))).toEqual([5]);
  });

  it('constant zero', () => {
    expect(extractPolynomialCoeffs(n(0))).toEqual([0]);
  });

  it('variable x', () => {
    expect(extractPolynomialCoeffs(v('x'))).toEqual([0, 1]);
  });

  it('x^3', () => {
    expect(extractPolynomialCoeffs(p('x', 3))).toEqual([0, 0, 0, 1]);
  });

  it('3*x^2', () => {
    expect(extractPolynomialCoeffs(m(n(3), p('x', 2)))).toEqual([0, 0, 3]);
  });

  it('4*x', () => {
    expect(extractPolynomialCoeffs(m(n(4), v('x')))).toEqual([0, 4]);
  });

  it('4*x - 5', () => {
    expect(extractPolynomialCoeffs(a(m(n(4), v('x')), n(-5)))).toEqual([-5, 4]);
  });

  it('3*x^2 + 4*x - 5', () => {
    const expr = a(m(n(3), p('x', 2)), a(m(n(4), v('x')), n(-5)));
    expect(extractPolynomialCoeffs(expr)).toEqual([-5, 4, 3]);
  });

  it('3*x^2 - 6*x', () => {
    const expr = a(m(n(3), p('x', 2)), m(n(-6), v('x')));
    expect(extractPolynomialCoeffs(expr)).toEqual([0, -6, 3]);
  });

  it('2 * (2*x) collapses nested mul', () => {
    const expr = m(n(2), m(n(2), v('x')));
    expect(extractPolynomialCoeffs(expr)).toEqual([0, 4]);
  });

  it('non-polynomial returns null', () => {
    const expr = { kind: 'call' as const, name: 'sin', args: [v('x')] };
    expect(extractPolynomialCoeffs(expr)).toBeNull();
  });

  it('non-x variable returns null', () => {
    expect(extractPolynomialCoeffs(v('t'))).toBeNull();
  });

  it('simplified derivative of x^3 is 3*x^2', () => {
    const f = Parser.parse('x^3');
    const f1 = simplify(differentiate(f));
    expect(extractPolynomialCoeffs(f1)).toEqual([0, 0, 3]);
  });

  it('simplified derivative of x^3 - 3*x^2 + 2 is 3*x^2 - 6*x', () => {
    const f = Parser.parse('x^3 - 3*x^2 + 2');
    const f1 = simplify(differentiate(f));
    expect(extractPolynomialCoeffs(f1)).toEqual([0, -6, 3]);
  });

  it('simplified derivative of -0.1*x^2 - 3*x is -0.2*x - 3', () => {
    const f = Parser.parse('-0.1*x^2 - 3*x');
    const f1 = simplify(differentiate(f));
    const coeffs = extractPolynomialCoeffs(f1);
    expect(coeffs).not.toBeNull();
    expect(coeffs![0]).toBeCloseTo(-3, 5);
    expect(coeffs![1]).toBeCloseTo(-0.2, 5);
  });
});

describe('solveQuadratic', () => {
  it('two real roots', () => {
    expect(solveQuadratic(1, -5, 6)).toEqual([2, 3]);
  });

  it('double root', () => {
    expect(solveQuadratic(1, -2, 1)).toEqual([1]);
  });

  it('no real roots', () => {
    expect(solveQuadratic(1, 0, 1)).toBeNull();
  });

  it('linear case', () => {
    expect(solveQuadratic(0, 2, -6)).toEqual([3]);
  });

  it('constant case returns null', () => {
    expect(solveQuadratic(0, 0, 5)).toBeNull();
  });

  it('3*x^2 - 6*x = 0 => x=0, x=2', () => {
    expect(solveQuadratic(3, -6, 0)).toEqual([0, 2]);
  });

  it('2*x^2 + 4*x + 2 = 0 => double root at x=-1', () => {
    expect(solveQuadratic(2, 4, 2)).toEqual([-1]);
  });

  it('-0.2*x - 3 = 0 => x=-15', () => {
    const roots = solveQuadratic(0, -0.2, -3);
    expect(roots).not.toBeNull();
    expect(roots![0]).toBeCloseTo(-15, 10);
  });
});

describe('findExtremaAlgebraic', () => {
  it('x^2 has minimum at 0', () => {
    const expr = Parser.parse('x^2');
    const f1 = simplify(differentiate(expr));
    const f2 = simplify(differentiate(f1));
    const extrema = findExtremaAlgebraic(expr, f1, f2);
    expect(extrema).not.toBeNull();
    expect(extrema!.length).toBe(1);
    expect(extrema![0].kind).toBe('minimum');
    expect(Math.abs(extrema![0].x)).toBeLessThan(0.0001);
  });

  it('-x^2 has maximum at 0', () => {
    const expr = Parser.parse('-x^2');
    const f1 = simplify(differentiate(expr));
    const f2 = simplify(differentiate(f1));
    const extrema = findExtremaAlgebraic(expr, f1, f2);
    expect(extrema).not.toBeNull();
    expect(extrema!.length).toBe(1);
    expect(extrema![0].kind).toBe('maximum');
    expect(Math.abs(extrema![0].x)).toBeLessThan(0.0001);
  });

  it('x^3 - 3x^2 + 2 has max at 0 and min at 2', () => {
    const expr = Parser.parse('x^3 - 3*x^2 + 2');
    const f1 = simplify(differentiate(expr));
    const f2 = simplify(differentiate(f1));
    const extrema = findExtremaAlgebraic(expr, f1, f2);
    expect(extrema).not.toBeNull();
    expect(extrema!.length).toBe(2);

    const max = extrema!.find(e => e.kind === 'maximum');
    const min = extrema!.find(e => e.kind === 'minimum');
    expect(max).toBeDefined();
    expect(min).toBeDefined();
    expect(Math.abs(max!.x)).toBeLessThan(0.0001);
    expect(Math.abs(min!.x - 2)).toBeLessThan(0.0001);
    expect(Math.abs(max!.y - 2)).toBeLessThan(0.0001);
    expect(Math.abs(min!.y + 2)).toBeLessThan(0.0001);
  });

  it('-0.1*x^2 - 3*x has maximum at x=-15', () => {
    const expr = Parser.parse('-0.1*x^2 - 3*x');
    const f1 = simplify(differentiate(expr));
    const f2 = simplify(differentiate(f1));
    const extrema = findExtremaAlgebraic(expr, f1, f2);
    expect(extrema).not.toBeNull();
    expect(extrema!.length).toBe(1);
    expect(extrema![0].kind).toBe('maximum');
    expect(extrema![0].x).toBeCloseTo(-15, 8);
    expect(extrema![0].y).toBeCloseTo(22.5, 5);
  });

  it('5*x has no extrema (linear)', () => {
    const expr = Parser.parse('5*x');
    const f1 = simplify(differentiate(expr));
    const extrema = findExtremaAlgebraic(expr, f1, null);
    expect(extrema).not.toBeNull();
    expect(extrema!.length).toBe(0);
  });

  it('sin(x) returns null (non-polynomial)', () => {
    const expr = Parser.parse('sin(x)');
    const f1 = simplify(differentiate(expr));
    expect(findExtremaAlgebraic(expr, f1, null)).toBeNull();
  });
});

describe('findNearestZeros', () => {
  const makeZero = (x: number) => ({ kind: 'zero' as const, x, y: 0 });

  it('finds nearest left and right zeros', () => {
    const result = findNearestZeros(
      [makeZero(-3), makeZero(0), makeZero(5)],
      1,
    );
    expect(result.left).toBe(0);
    expect(result.right).toBe(5);
  });

  it('finds only left when cursor past rightmost zero', () => {
    const result = findNearestZeros(
      [makeZero(-3), makeZero(0)],
      -1,
    );
    expect(result.left).toBe(-3);
    expect(result.right).toBe(0);
  });

  it('no zeros returns nulls', () => {
    const result = findNearestZeros([], 0);
    expect(result.left).toBeNull();
    expect(result.right).toBeNull();
  });

  it('ignores non-zero points of interest', () => {
    const result = findNearestZeros(
      [
        { kind: 'maximum' as const, x: 0, y: 5 },
        makeZero(3),
      ],
      1,
    );
    expect(result.left).toBeNull();
    expect(result.right).toBe(3);
  });
});

describe('computeDefiniteIntegral', () => {
  it('∫ x dx from 0 to 1 = 0.5', () => {
    const expr = Parser.parse('x');
    const result = computeDefiniteIntegral(expr, 0, 1);
    expect(result).toBeCloseTo(0.5, 4);
  });

  it('∫ x^2 dx from 0 to 2 = 8/3', () => {
    const expr = Parser.parse('x^2');
    const result = computeDefiniteIntegral(expr, 0, 2);
    expect(result).toBeCloseTo(8 / 3, 4);
  });

  it('∫ sin(x) dx from 0 to π = 2', () => {
    const expr = Parser.parse('sin(x)');
    const result = computeDefiniteIntegral(expr, 0, Math.PI);
    expect(result).toBeCloseTo(2, 3);
  });

  it('∫ 0 dx from 0 to 5 = 0', () => {
    const expr = Parser.parse('0');
    const result = computeDefiniteIntegral(expr, 0, 5);
    expect(result).toBeCloseTo(0, 10);
  });

  it('zero interval returns 0', () => {
    const expr = Parser.parse('x');
    expect(computeDefiniteIntegral(expr, 3, 3)).toBe(0);
  });

  it('swapped bounds negates', () => {
    const expr = Parser.parse('x');
    const forward = computeDefiniteIntegral(expr, 0, 2);
    const backward = computeDefiniteIntegral(expr, 2, 0);
    expect(forward).toBeCloseTo(2, 4);
    expect(backward).toBeCloseTo(-2, 4);
  });

  it('ln(x-1) from 0 to 3 returns NaN (function undefined at left endpoint)', () => {
    const expr = Parser.parse('ln(x-1)');
    expect(computeDefiniteIntegral(expr, 0, 3)).toBeNaN();
  });

  it('ln(x-1) from 1 to 3 returns NaN (left endpoint -∞)', () => {
    const expr = Parser.parse('ln(x-1)');
    expect(computeDefiniteIntegral(expr, 1, 3)).toBeNaN();
  });

  it('ln(x-1) from 1.1 to 3 returns finite value', () => {
    const expr = Parser.parse('ln(x-1)');
    const result = computeDefiniteIntegral(expr, 1.1, 3);
    expect(result).not.toBeNaN();
    expect(result).toBeCloseTo(-0.283, 1);
  });

  it('ln(x-1) across domain boundary returns NaN', () => {
    const expr = Parser.parse('ln(x-1)');
    expect(computeDefiniteIntegral(expr, 0.5, 3)).toBeNaN();
  });

  it('1/x from -1 to 1 returns NaN (asymptote at 0)', () => {
    const expr = Parser.parse('1/x');
    expect(computeDefiniteIntegral(expr, -1, 1)).toBeNaN();
  });

  it('1/x from 1 to 2 returns finite (no asymptote in range)', () => {
    const expr = Parser.parse('1/x');
    const result = computeDefiniteIntegral(expr, 1, 2);
    expect(result).not.toBeNaN();
    expect(result).toBeCloseTo(Math.LN2, 3);
  });

  it('1/(x-3) from 0 to 6 returns NaN (asymptote at 3)', () => {
    const expr = Parser.parse('1/(x-3)');
    expect(computeDefiniteIntegral(expr, 0, 6)).toBeNaN();
  });
});

describe('Calculus integration', () => {
  it('finds zeros of linear function', () => {
    const expr = Parser.parse('x - 2');
    const result = analyzeFunction(expr, null, null, null, -10, 10);
    expect(result.zeros.length).toBeGreaterThanOrEqual(1);
    const zero = result.zeros.find((z) => Math.abs(z.x - 2) < 0.01);
    expect(zero).toBeDefined();
  });

  it('finds zeros of quadratic', () => {
    const expr = Parser.parse('x^2 - 4');
    const result = analyzeFunction(expr, null, null, null, -5, 5);
    expect(result.zeros.length).toBeGreaterThanOrEqual(2);
    const xs = result.zeros.map((z) => Math.round(z.x)).sort((a, b) => a - b);
    expect(xs).toContain(-2);
    expect(xs).toContain(2);
  });

  it('finds extrema of x^2 (minimum at 0)', () => {
    const expr = Parser.parse('x^2');
    const f1 = simplify(differentiate(expr));
    const f2 = simplify(differentiate(f1));
    const result = analyzeFunction(expr, f1, f2, null, -5, 5);
    expect(result.extrema.length).toBeGreaterThanOrEqual(1);
    const min = result.extrema.find((e) => e.kind === 'minimum');
    expect(min).toBeDefined();
    expect(Math.abs(min!.x)).toBeLessThan(0.01);
    expect(Math.abs(min!.y)).toBeLessThan(0.01);
  });

  it('finds extrema of -x^2 (maximum at 0)', () => {
    const expr = Parser.parse('-x^2');
    const f1 = simplify(differentiate(expr));
    const f2 = simplify(differentiate(f1));
    const result = analyzeFunction(expr, f1, f2, null, -5, 5);
    expect(result.extrema.length).toBeGreaterThanOrEqual(1);
    const max = result.extrema.find((e) => e.kind === 'maximum');
    expect(max).toBeDefined();
    expect(Math.abs(max!.x)).toBeLessThan(0.01);
  });

  it('finds extrema of x^3 - 3x^2 + 2', () => {
    const expr = Parser.parse('x^3 - 3*x^2 + 2');
    const f1 = simplify(differentiate(expr));
    const f2 = simplify(differentiate(f1));
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

  it('finds extrema of -0.1*x^2 - 3*x (max at x=-15, y=22.5)', () => {
    const expr = Parser.parse('-0.1*x^2 - 3*x');
    const f1 = simplify(differentiate(expr));
    const f2 = simplify(differentiate(f1));
    const result = analyzeFunction(expr, f1, f2, null, -200, 200);

    const max = result.extrema.find((e) => e.kind === 'maximum');
    expect(max).toBeDefined();
    expect(max!.x).toBeCloseTo(-15, 5);
    expect(max!.y).toBeCloseTo(22.5, 4);
  });

  it('finds inflection point of x^3', () => {
    const expr = Parser.parse('x^3');
    const f1 = simplify(differentiate(expr));
    const f2 = simplify(differentiate(f1));
    const f3 = simplify(differentiate(f2));
    const result = analyzeFunction(expr, f1, f2, f3, -5, 5);

    expect(result.inflectionPoints.length).toBeGreaterThanOrEqual(1);
    const ip = result.inflectionPoints[0];
    expect(Math.abs(ip.x)).toBeLessThan(0.1);
  });

  it('finds zeros of sin(x) in [-5, 5]', () => {
    const expr = Parser.parse('sin(x)');
    const result = analyzeFunction(expr, null, null, null, -5, 5);
    expect(result.zeros.length).toBeGreaterThanOrEqual(3);
    const xs = result.zeros.map((z) => Math.round(z.x)).sort((a, b) => a - b);
    expect(xs).toContain(0);
  });

  it('finds extrema of sin(x) numerically (non-polynomial fallback)', () => {
    const expr = Parser.parse('sin(x)');
    const f1 = simplify(differentiate(expr));
    const f2 = simplify(differentiate(f1));
    const result = analyzeFunction(expr, f1, f2, null, -5, 5);
    expect(result.extrema.length).toBeGreaterThanOrEqual(2);
  });

  it('finds maximum of exp(-x^2/2) (Gaussian, a=1, b=0, c=1)', () => {
    const expr = Parser.parse('exp(-x^2/2)');
    const f1 = simplify(differentiate(expr));
    const f2 = simplify(differentiate(f1));
    const result = analyzeFunction(expr, f1, f2, null, -5, 5);
    const max = result.extrema.find(e => e.kind === 'maximum');
    expect(max).toBeDefined();
    expect(max!.x).toBeCloseTo(0, 4);
    expect(max!.y).toBeCloseTo(1, 4);
  });

  it('finds maximum of 4*exp(-x^2/(2*4)) (Gaussian, a=4, b=0, c=2)', () => {
    // Built from buildGaussian: 4*exp(-x^2/(2*4))
    const expr = Parser.parse('4*exp(-x^2/(2*4))');
    const f1 = simplify(differentiate(expr));
    const f2 = simplify(differentiate(f1));
    const result = analyzeFunction(expr, f1, f2, null, -10, 10);
    const max = result.extrema.find(e => e.kind === 'maximum');
    expect(max).toBeDefined();
    expect(max!.x).toBeCloseTo(0, 4);
    expect(max!.y).toBeCloseTo(4, 4);
  });

  it('finds maximum of exp(-(x-3)^2/2) (Gaussian shifted, b=3)', () => {
    // Gaussian shifted to x=3
    const expr = Parser.parse('exp(-(x-3)^2/2)');
    const f1 = simplify(differentiate(expr));
    const f2 = simplify(differentiate(f1));
    const result = analyzeFunction(expr, f1, f2, null, 0, 6);
    const max = result.extrema.find(e => e.kind === 'maximum');
    expect(max).toBeDefined();
    expect(max!.x).toBeCloseTo(3, 4);
    expect(max!.y).toBeCloseTo(1, 4);
  });

  it('reciprocal preset 1/(x-1) (c=0) has no zeros', () => {
    const expr = Parser.parse('1/(x-1) + 0');
    const result = analyzeFunction(expr, null, null, null, -200, 200);
    expect(result.zeros).toHaveLength(0);
  });

  it('reciprocal with c=1 (1/(x-1)+1) has zero at x=0', () => {
    const expr = Parser.parse('1/(x-1) + 1');
    const result = analyzeFunction(expr, null, null, null, -200, 200);
    expect(result.zeros.length).toBeGreaterThanOrEqual(1);
    const z = result.zeros.find(z => Math.abs(z.x) < 0.1);
    expect(z).toBeDefined();
  });

  it('gaussian preset exp(-x^2/2) has no zeros', () => {
    const expr = Parser.parse('exp(-x^2/2)');
    const result = analyzeFunction(expr, null, null, null, -200, 200);
    expect(result.zeros).toHaveLength(0);
  });

  it('computeDefiniteIntegral NaN for reciprocal crossing asymptote', () => {
    const expr = Parser.parse('1/(x-1) + 1');
    expect(computeDefiniteIntegral(expr, 0, 2)).toBeNaN();
  });

  it('computeDefiniteIntegral finite for reciprocal not crossing asymptote', () => {
    const expr = Parser.parse('1/(x-1) + 1');
    const result = computeDefiniteIntegral(expr, 0, 0.5);
    expect(result).not.toBeNaN();
    expect(result).toBeLessThan(0);
  });

  it('findNearestZeros returns null for empty points', () => {
    const result = findNearestZeros([], 0);
    expect(result.left).toBeNull();
    expect(result.right).toBeNull();
  });
});
