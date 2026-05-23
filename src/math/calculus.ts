import type { Expr, PointOfInterest } from './types';
import { evaluate } from './evaluator';
import { differentiate } from './differentiate';

export interface CalculusResult {
  zeros: PointOfInterest[];
  extrema: PointOfInterest[];
  inflectionPoints: PointOfInterest[];
}

const SAMPLE_POINTS = 4000;
const BISECTION_ITERATIONS = 80;
const NEWTON_ITERATIONS = 30;
const NEWTON_TOLERANCE = 1e-10;
const ZERO_THRESHOLD = 1e-6;
const EXTREMA_PROXIMITY = 1e-4;

export function analyzeFunction(
  expr: Expr,
  derivative1: Expr | null,
  derivative2: Expr | null,
  derivative3: Expr | null,
  domainStart: number = -10,
  domainEnd: number = 10,
): CalculusResult {
  const zeros = findZeros(expr, domainStart, domainEnd);
  const extrema = derivative1
    ? findExtrema(expr, derivative1, derivative2, domainStart, domainEnd)
    : [];
  const inflectionPoints = derivative2
    ? findInflectionPoints(expr, derivative2, derivative3, domainStart, domainEnd)
    : [];

  return { zeros, extrema, inflectionPoints };
}

function findZeros(expr: Expr, a: number, b: number): PointOfInterest[] {
  const candidates: PointOfInterest[] = [];
  const step = (b - a) / SAMPLE_POINTS;

  for (let i = 0; i <= SAMPLE_POINTS; i++) {
    const x = a + i * step;
    try {
      const y = f(expr, x);
      if (!Number.isFinite(y)) continue;

      if (Math.abs(y) < ZERO_THRESHOLD && i > 0 && i < SAMPLE_POINTS) {
        const prevY = f(expr, a + (i - 1) * step);
        const nextY = f(expr, a + (i + 1) * step);
        if (Number.isFinite(prevY) && Number.isFinite(nextY) && signChange(prevY, nextY)) {
          const refined = refineZero(expr, x);
          if (refined !== null) {
            candidates.push({ kind: 'zero', x: refined, y: 0 });
          }
        }
        continue;
      }

      if (i < SAMPLE_POINTS) {
        const nextX = a + (i + 1) * step;
        const nextY = f(expr, nextX);
        if (Number.isFinite(nextY) && signChange(y, nextY)) {
          const root = findRootBisectionNewton(expr, x, nextX);
          if (root !== null) {
            candidates.push({ kind: 'zero', x: root, y: 0 });
            i += 5;
          }
        }
      }
    } catch {
      continue;
    }
  }

  return deduplicatePoints(candidates);
}

function refineZero(expr: Expr, x0: number): number | null {
  const deriv = differentiate(expr);
  let x = x0;

  for (let i = 0; i < NEWTON_ITERATIONS; i++) {
    const fx = f(expr, x);
    if (!Number.isFinite(fx)) return null;
    if (Math.abs(fx) < NEWTON_TOLERANCE) return x;

    const fpx = f(deriv, x);
    if (!Number.isFinite(fpx) || Math.abs(fpx) < 1e-15) break;

    const dx = fx / fpx;
    x = x - dx;

    if (!Number.isFinite(x)) return null;
    if (Math.abs(dx) < NEWTON_TOLERANCE) break;
  }

  const finalFx = f(expr, x);
  if (!Number.isFinite(finalFx) || Math.abs(finalFx) > 0.01) return null;

  return x;
}

function findExtrema(
  expr: Expr,
  f1: Expr,
  f2: Expr | null,
  a: number,
  b: number,
): PointOfInterest[] {
  const criticalPoints = findZeros(f1, a, b);
  const extrema: PointOfInterest[] = [];

  for (const cp of criticalPoints) {
    const y = f(expr, cp.x);
    if (!Number.isFinite(y)) continue;

    if (f2) {
      const secondDeriv = f(f2, cp.x);
      if (Number.isFinite(secondDeriv)) {
        if (secondDeriv < -EXTREMA_PROXIMITY) {
          extrema.push({ kind: 'maximum', x: cp.x, y });
        } else if (secondDeriv > EXTREMA_PROXIMITY) {
          extrema.push({ kind: 'minimum', x: cp.x, y });
        } else {
          const left = f(expr, cp.x - 0.05);
          const right = f(expr, cp.x + 0.05);
          if (Number.isFinite(left) && Number.isFinite(right)) {
            if (y > left && y > right) {
              extrema.push({ kind: 'maximum', x: cp.x, y });
            } else if (y < left && y < right) {
              extrema.push({ kind: 'minimum', x: cp.x, y });
            } else {
              extrema.push({ kind: 'inflection', x: cp.x, y });
            }
          }
        }
      }
    } else {
      const left = f(expr, cp.x - 0.01);
      const right = f(expr, cp.x + 0.01);
      if (Number.isFinite(left) && Number.isFinite(right)) {
        if (y > left && y > right) {
          extrema.push({ kind: 'maximum', x: cp.x, y });
        } else if (y < left && y < right) {
          extrema.push({ kind: 'minimum', x: cp.x, y });
        }
      }
    }
  }

  return deduplicatePoints(extrema);
}

function findInflectionPoints(
  expr: Expr,
  f2: Expr,
  f3: Expr | null,
  a: number,
  b: number,
): PointOfInterest[] {
  const candidates = findZeros(f2, a, b);
  const points: PointOfInterest[] = [];

  for (const cand of candidates) {
    if (f3) {
      const thirdDeriv = f(f3, cand.x);
      if (!Number.isFinite(thirdDeriv) || Math.abs(thirdDeriv) < EXTREMA_PROXIMITY) continue;
    }

    const left = f(f2, cand.x - 0.02);
    const right = f(f2, cand.x + 0.02);
    if (Number.isFinite(left) && Number.isFinite(right) && signChange(left, right)) {
      const y = f(expr, cand.x);
      points.push({ kind: 'inflection', x: cand.x, y: Number.isFinite(y) ? y : 0 });
    }
  }

  return deduplicatePoints(points);
}

function findRootBisectionNewton(
  expr: Expr,
  a: number,
  b: number,
): number | null {
  let fa = f(expr, a);
  let fb = f(expr, b);

  if (!Number.isFinite(fa) || !Number.isFinite(fb)) return null;

  if (Math.abs(fa) < ZERO_THRESHOLD) return a;
  if (Math.abs(fb) < ZERO_THRESHOLD) return b;

  if (!signChange(fa, fb)) return null;

  let lo = a;
  let hi = b;
  let fLo = fa;

  for (let i = 0; i < BISECTION_ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    const fMid = f(expr, mid);
    if (!Number.isFinite(fMid)) break;
    if (Math.abs(fMid) < NEWTON_TOLERANCE) return mid;

    if (signChange(fLo, fMid)) {
      hi = mid;
      fb = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }

  const deriv = differentiate(expr);
  let x = (lo + hi) / 2;

  for (let i = 0; i < NEWTON_ITERATIONS; i++) {
    const fx = f(expr, x);
    if (Math.abs(fx) < NEWTON_TOLERANCE) return x;

    const fpx = f(deriv, x);
    if (!Number.isFinite(fpx) || Math.abs(fpx) < 1e-15) break;

    const dx = fx / fpx;
    x = x - dx;
    if (!Number.isFinite(x) || Math.abs(dx) < NEWTON_TOLERANCE) break;
  }

  const finalFx = f(expr, x);
  if (!Number.isFinite(finalFx) || Math.abs(finalFx) > 0.01) return null;

  return x;
}

function f(expr: Expr, x: number): number {
  try {
    return evaluate(expr, { x });
  } catch {
    return NaN;
  }
}

function signChange(a: number, b: number): boolean {
  return (a > 0 && b < 0) || (a < 0 && b > 0);
}

function deduplicatePoints(points: PointOfInterest[]): PointOfInterest[] {
  if (points.length === 0) return points;

  const sorted = [...points].sort((a, b) => a.x - b.x);
  const result: PointOfInterest[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].x - sorted[result.length - 1].x) > EXTREMA_PROXIMITY * 10) {
      result.push(sorted[i]);
    }
  }

  return result;
}
