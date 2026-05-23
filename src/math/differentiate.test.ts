import { describe, it, expect } from 'vitest';
import { Parser } from './parser';
import { differentiate } from './differentiate';
import { evaluate } from './evaluator';

function derivativeAt(exprStr: string, x: number, order: number = 1): number {
  let expr = Parser.parse(exprStr);
  for (let i = 0; i < order; i++) {
    expr = differentiate(expr);
  }
  return evaluate(expr, { x });
}

describe('Differentiator', () => {
  it('derivative of constant is 0', () => {
    expect(derivativeAt('5', 0)).toBe(0);
    expect(derivativeAt('pi', 0)).toBe(0);
  });

  it('derivative of x is 1', () => {
    expect(derivativeAt('x', 0)).toBe(1);
    expect(derivativeAt('x', 100)).toBe(1);
  });

  it('derivative of linear function', () => {
    expect(derivativeAt('2*x + 3', 0)).toBe(2);
    expect(derivativeAt('2*x + 3', 10)).toBe(2);
  });

  it('derivative of x^2 is 2x', () => {
    expect(derivativeAt('x^2', 0)).toBe(0);
    expect(derivativeAt('x^2', 1)).toBe(2);
    expect(derivativeAt('x^2', 5)).toBe(10);
    expect(derivativeAt('x^2', -3)).toBe(-6);
  });

  it('derivative of x^3 is 3x^2', () => {
    expect(derivativeAt('x^3', 0)).toBe(0);
    expect(derivativeAt('x^3', 1)).toBe(3);
    expect(derivativeAt('x^3', 2)).toBe(12);
  });

  it('derivative of sin(x) is cos(x)', () => {
    expect(derivativeAt('sin(x)', 0)).toBeCloseTo(1);
    expect(derivativeAt('sin(x)', Math.PI / 2)).toBeCloseTo(0);
    expect(derivativeAt('sin(x)', Math.PI)).toBeCloseTo(-1);
  });

  it('derivative of cos(x) is -sin(x)', () => {
    expect(derivativeAt('cos(x)', 0)).toBeCloseTo(0);
    expect(derivativeAt('cos(x)', Math.PI / 2)).toBeCloseTo(-1);
    expect(derivativeAt('cos(x)', Math.PI)).toBeCloseTo(0);
  });

  it('derivative of exp(x) is exp(x)', () => {
    expect(derivativeAt('exp(x)', 0)).toBeCloseTo(1);
    expect(derivativeAt('exp(x)', 1)).toBeCloseTo(Math.E);
  });

  it('derivative of ln(x) is 1/x', () => {
    expect(derivativeAt('ln(x)', 1)).toBeCloseTo(1);
    expect(derivativeAt('ln(x)', 2)).toBeCloseTo(0.5);
  });

  it('derivative with product rule', () => {
    // f(x) = x*sin(x), f'(x) = sin(x) + x*cos(x)
    expect(derivativeAt('x*sin(x)', 0)).toBeCloseTo(0); // sin(0) + 0*cos(0) = 0
    expect(derivativeAt('x*sin(x)', 1)).toBeCloseTo(Math.sin(1) + Math.cos(1));
  });

  it('second derivative of x^3 is 6x', () => {
    expect(derivativeAt('x^3', 0, 2)).toBeCloseTo(0);
    expect(derivativeAt('x^3', 1, 2)).toBeCloseTo(6);
    expect(derivativeAt('x^3', 2, 2)).toBeCloseTo(12);
  });

  it('third derivative of x^4 is 24x', () => {
    expect(derivativeAt('x^4', 0, 3)).toBeCloseTo(0);
    expect(derivativeAt('x^4', 1, 3)).toBeCloseTo(24);
  });

  it('derivative of polynomial', () => {
    // f(x) = 2x^3 + 3x^2 + x + 1
    // f'(x) = 6x^2 + 6x + 1
    expect(derivativeAt('2*x^3 + 3*x^2 + x + 1', 0)).toBeCloseTo(1);
    expect(derivativeAt('2*x^3 + 3*x^2 + x + 1', 1)).toBeCloseTo(13);
    expect(derivativeAt('2*x^3 + 3*x^2 + x + 1', -1)).toBeCloseTo(1);
  });
});
