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
  domainStart: number = -200,
  domainEnd: number = 200,
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
  const algebraic = findExtremaAlgebraic(expr, f1, f2);
  if (algebraic !== null) return algebraic;

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

export function extractPolynomialCoeffs(expr: Expr): number[] | null {
  interface Term { coeff: number; power: number; }
  const terms: Term[] = [];

  const collect = (e: Expr, sign: number): boolean => {
    switch (e.kind) {
      case 'number':
        terms.push({ coeff: sign * e.value, power: 0 });
        return true;
      case 'variable':
        if (e.name === 'x') { terms.push({ coeff: sign, power: 1 }); return true; }
        return false;
      case 'binary':
        if (e.op === '+') return collect(e.left, sign) && collect(e.right, sign);
        if (e.op === '-') return collect(e.left, sign) && collect(e.right, -sign);
        if (e.op === '*') return collectMul(e, sign);
        if (e.op === '^') {
          if (e.left.kind === 'variable' && e.left.name === 'x' && e.right.kind === 'number') {
            terms.push({ coeff: sign, power: e.right.value });
            return true;
          }
          return false;
        }
        return false;
      case 'unary':
        if (e.op === '-') return collect(e.arg, -sign);
        if (e.op === '+') return collect(e.arg, sign);
        return false;
      default:
        return false;
    }
  };

  const collectMul = (e: Expr, sign: number): boolean => {
    let coeff = sign;
    let power: number | null = null;

    const flatten = (n: Expr): boolean => {
      if (n.kind === 'number') { coeff *= n.value; return true; }
      if (n.kind === 'variable') {
        if (n.name === 'x') {
          power = (power ?? 0) + 1;
          return true;
        }
        return false;
      }
      if (n.kind === 'binary' && n.op === '*') return flatten(n.left) && flatten(n.right);
      if (n.kind === 'binary' && n.op === '^') {
        if (n.left.kind === 'variable' && n.left.name === 'x' && n.right.kind === 'number') {
          if (power !== null) return false;
          power = n.right.value;
          return true;
        }
        return false;
      }
      return false;
    };

    if (!flatten(e)) return false;
    terms.push({ coeff, power: power ?? 0 });
    return true;
  };

  if (!collect(expr, 1)) return null;

  const maxPower = Math.max(...terms.map(t => t.power), 0);
  const coeffs = new Array<number>(maxPower + 1).fill(0);
  for (const t of terms) {
    coeffs[t.power] += t.coeff;
  }
  return coeffs;
}

export function solveQuadratic(a: number, b: number, c: number): number[] | null {
  if (Math.abs(a) < 1e-15) {
    if (Math.abs(b) < 1e-15) return null;
    return [-c / b];
  }

  const disc = b * b - 4 * a * c;
  if (disc < -1e-15) return null;
  if (Math.abs(disc) < 1e-15) return [-b / (2 * a)];

  const sqrtDisc = Math.sqrt(disc);
  const x1 = (-b - sqrtDisc) / (2 * a);
  const x2 = (-b + sqrtDisc) / (2 * a);
  return x1 < x2 ? [x1, x2] : [x2, x1];
}

export function findExtremaAlgebraic(
  expr: Expr,
  f1: Expr,
  f2: Expr | null,
): PointOfInterest[] | null {
  const coeffs = extractPolynomialCoeffs(f1);
  if (coeffs === null) return null;

  let degree = coeffs.length - 1;
  while (degree > 0 && Math.abs(coeffs[degree]) < 1e-15) degree--;
  if (degree > 2) return null;
  if (degree <= 0) return [];

  const a = degree >= 2 ? coeffs[2] : 0;
  const b = degree >= 1 ? coeffs[1] : 0;
  const c = coeffs[0];

  const roots = solveQuadratic(a, b, c);
  if (roots === null) return [];

  const extrema: PointOfInterest[] = [];
  for (const x of roots) {
    const y = f(expr, x);
    if (!Number.isFinite(y)) continue;

    if (f2) {
      const sd = f(f2, x);
      if (Number.isFinite(sd)) {
        if (sd < -EXTREMA_PROXIMITY) {
          extrema.push({ kind: 'maximum', x, y });
        } else if (sd > EXTREMA_PROXIMITY) {
          extrema.push({ kind: 'minimum', x, y });
        } else {
          const left = f(expr, x - 0.05);
          const right = f(expr, x + 0.05);
          if (Number.isFinite(left) && Number.isFinite(right)) {
            if (y > left && y > right) extrema.push({ kind: 'maximum', x, y });
            else if (y < left && y < right) extrema.push({ kind: 'minimum', x, y });
            else extrema.push({ kind: 'inflection', x, y });
          }
        }
      }
    } else {
      const left = f(expr, x - 0.01);
      const right = f(expr, x + 0.01);
      if (Number.isFinite(left) && Number.isFinite(right)) {
        if (y > left && y > right) extrema.push({ kind: 'maximum', x, y });
        else if (y < left && y < right) extrema.push({ kind: 'minimum', x, y });
      }
    }
  }

  return extrema;
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

export function computeDefiniteIntegral(expr: Expr, a: number, b: number, steps: number = 1000): number {
  if (a === b) return 0;
  if (a > b) return -computeDefiniteIntegral(expr, b, a, steps);

  const fa = f(expr, a);
  const fb = f(expr, b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) return 0;

  const tol = 1e-6 / steps;

  function adaptiveSimpson(lo: number, hi: number, fLo: number, fHi: number, depth: number): number {
    const mid = (lo + hi) / 2;
    const fMid = f(expr, mid);
    if (!Number.isFinite(fMid)) return 0;

    const h = hi - lo;
    const S = (h / 6) * (fLo + 4 * fMid + fHi);

    const leftMid = (lo + mid) / 2;
    const rightMid = (mid + hi) / 2;
    const fLeftMid = f(expr, leftMid);
    const fRightMid = f(expr, rightMid);
    if (!Number.isFinite(fLeftMid) || !Number.isFinite(fRightMid)) return S;

    const Sleft = (h / 12) * (fLo + 4 * fLeftMid + fMid);
    const Sright = (h / 12) * (fMid + 4 * fRightMid + fHi);
    const S2 = Sleft + Sright;

    if (depth >= 10 || Math.abs(S - S2) < 15 * tol) {
      return S2 + (S2 - S) / 15;
    }

    return adaptiveSimpson(lo, mid, fLo, fMid, depth + 1) + adaptiveSimpson(mid, hi, fMid, fHi, depth + 1);
  }

  const result = adaptiveSimpson(a, b, fa, fb, 0);
  return Number.isFinite(result) ? result : 0;
}

export function findNearestZeros(points: PointOfInterest[], cursorX: number): { left: number | null; right: number | null } {
  let left: number | null = null;
  let right: number | null = null;

  for (const p of points) {
    if (p.kind !== 'zero') continue;
    const x = p.x;
    if (x < cursorX) {
      if (left === null || x > left) left = x;
    } else if (x > cursorX) {
      if (right === null || x < right) right = x;
    }
  }

  return { left, right };
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
