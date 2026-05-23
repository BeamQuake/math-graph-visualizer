import { describe, it, expect } from 'vitest';
import { Parser } from './parser';
import { evaluate, isFiniteNumber } from './evaluator';

function evalAt(input: string, x: number): number {
  const expr = Parser.parse(input);
  return evaluate(expr, { x });
}

describe('evaluate', () => {
  describe('basic arithmetic', () => {
    it('evaluates addition', () => {
      expect(evalAt('2 + 3', 0)).toBe(5);
    });

    it('evaluates subtraction', () => {
      expect(evalAt('5 - 3', 0)).toBe(2);
    });

    it('evaluates multiplication', () => {
      expect(evalAt('4 * 3', 0)).toBe(12);
    });

    it('evaluates division', () => {
      expect(evalAt('10 / 2', 0)).toBe(5);
    });

    it('evaluates power', () => {
      expect(evalAt('2 ^ 3', 0)).toBe(8);
    });

    it('evaluates constants', () => {
      expect(evalAt('pi', 0)).toBeCloseTo(Math.PI);
      expect(evalAt('e', 0)).toBeCloseTo(Math.E);
    });
  });

  describe('division by zero', () => {
    it('positive / 0 = Infinity', () => {
      const result = evalAt('5 / 0', 0);
      expect(result).toBe(Infinity);
      expect(Number.isFinite(result)).toBe(false);
    });

    it('negative / 0 = -Infinity', () => {
      const result = evalAt('-5 / 0', 0);
      expect(result).toBe(-Infinity);
      expect(Number.isFinite(result)).toBe(false);
    });

    it('0 / 0 = NaN', () => {
      const result = evalAt('0 / 0', 0);
      expect(Number.isNaN(result)).toBe(true);
    });

    it('variable / 0 when x is positive = Infinity', () => {
      const expr = Parser.parse('x / 0');
      expect(evaluate(expr, { x: 5 })).toBe(Infinity);
      expect(evaluate(expr, { x: -5 })).toBe(-Infinity);
    });
  });

  describe('negative base ^ non-integer exponent = NaN', () => {
    it('(-2) ^ 0.5 = NaN', () => {
      const result = evalAt('(-2) ^ 0.5', 0);
      expect(Number.isNaN(result)).toBe(true);
    });

    it('(-1) ^ (1/2) = NaN', () => {
      const result = evalAt('(-1) ^ 0.5', 0);
      expect(Number.isNaN(result)).toBe(true);
    });

    it('(-2) ^ 2 = 4 (integer exponent works)', () => {
      expect(evalAt('(-2) ^ 2', 0)).toBe(4);
    });

    it('2 ^ 0.5 = sqrt(2) (positive base works)', () => {
      expect(evalAt('2 ^ 0.5', 0)).toBeCloseTo(Math.sqrt(2));
    });

    it('(-2) ^ -2 = 0.25 (negative integer exponent works)', () => {
      expect(evalAt('(-2) ^ (-2)', 0)).toBe(0.25);
    });
  });

  describe('undefined variable throws', () => {
    it('throws on undefined variable', () => {
      const expr = Parser.parse('y');
      expect(() => evaluate(expr, { x: 5 })).toThrow('Undefined variable: y');
    });

    it('works when variable is defined', () => {
      const expr = Parser.parse('x');
      expect(evaluate(expr, { x: 5 })).toBe(5);
    });
  });

  describe('unknown function throws', () => {
    it('throws on unknown function', () => {
      const expr = Parser.parse('foobar(x)');
      expect(() => evaluate(expr, { x: 5 })).toThrow('Unknown function: foobar');
    });
  });

  describe('call table: trigonometric functions', () => {
    it('sin(x)', () => {
      expect(evalAt('sin(0)', 0)).toBe(0);
      expect(evalAt('sin(x)', Math.PI / 2)).toBeCloseTo(1);
      expect(evalAt('sin(x)', Math.PI)).toBeCloseTo(0);
    });

    it('cos(x)', () => {
      expect(evalAt('cos(0)', 0)).toBe(1);
      expect(evalAt('cos(x)', Math.PI / 2)).toBeCloseTo(0);
      expect(evalAt('cos(x)', Math.PI)).toBeCloseTo(-1);
    });

    it('tan(x)', () => {
      expect(evalAt('tan(0)', 0)).toBe(0);
      expect(evalAt('tan(x)', Math.PI / 4)).toBeCloseTo(1);
    });

    it('asin(x)', () => {
      expect(evalAt('asin(0)', 0)).toBe(0);
      expect(evalAt('asin(1)', 0)).toBeCloseTo(Math.PI / 2);
      expect(evalAt('asin(-1)', 0)).toBeCloseTo(-Math.PI / 2);
    });

    it('acos(x)', () => {
      expect(evalAt('acos(0)', 0)).toBeCloseTo(Math.PI / 2);
      expect(evalAt('acos(1)', 0)).toBe(0);
      expect(evalAt('acos(-1)', 0)).toBeCloseTo(Math.PI);
    });

    it('atan(x)', () => {
      expect(evalAt('atan(0)', 0)).toBe(0);
      expect(evalAt('atan(1)', 0)).toBeCloseTo(Math.PI / 4);
    });

    it('atan2(y, x)', () => {
      const expr = Parser.parse('atan2(1, 0)');
      expect(evaluate(expr, {})).toBeCloseTo(Math.PI / 2);
    });
  });

  describe('call table: hyperbolic functions', () => {
    it('sinh(x)', () => {
      expect(evalAt('sinh(0)', 0)).toBe(0);
      expect(evalAt('sinh(1)', 0)).toBeCloseTo(Math.sinh(1));
    });

    it('cosh(x)', () => {
      expect(evalAt('cosh(0)', 0)).toBe(1);
      expect(evalAt('cosh(1)', 0)).toBeCloseTo(Math.cosh(1));
    });

    it('tanh(x)', () => {
      expect(evalAt('tanh(0)', 0)).toBe(0);
      expect(evalAt('tanh(1)', 0)).toBeCloseTo(Math.tanh(1));
    });
  });

  describe('call table: exponential and logarithmic', () => {
    it('exp(x)', () => {
      expect(evalAt('exp(0)', 0)).toBe(1);
      expect(evalAt('exp(1)', 0)).toBeCloseTo(Math.E);
    });

    it('ln(x)', () => {
      expect(evalAt('ln(1)', 0)).toBe(0);
      expect(evalAt('ln(e)', 0)).toBe(1);
    });

    it('log(x) = log10(x)', () => {
      expect(evalAt('log(1)', 0)).toBe(0);
      expect(evalAt('log(10)', 0)).toBe(1);
    });

    it('log2(x)', () => {
      expect(evalAt('log2(1)', 0)).toBe(0);
      expect(evalAt('log2(8)', 0)).toBe(3);
    });

    it('log10(x)', () => {
      expect(evalAt('log10(1)', 0)).toBe(0);
      expect(evalAt('log10(100)', 0)).toBe(2);
    });
  });

  describe('call table: other functions', () => {
    it('sqrt(x)', () => {
      expect(evalAt('sqrt(0)', 0)).toBe(0);
      expect(evalAt('sqrt(4)', 0)).toBe(2);
      expect(evalAt('sqrt(2)', 0)).toBeCloseTo(Math.SQRT2);
    });

    it('abs(x)', () => {
      expect(evalAt('abs(5)', 0)).toBe(5);
      expect(evalAt('abs(-5)', 0)).toBe(5);
      expect(evalAt('abs(0)', 0)).toBe(0);
    });

    it('ceil(x)', () => {
      expect(evalAt('ceil(1.1)', 0)).toBe(2);
      expect(evalAt('ceil(-1.1)', 0)).toBe(-1);
    });

    it('floor(x)', () => {
      expect(evalAt('floor(1.9)', 0)).toBe(1);
      expect(evalAt('floor(-1.1)', 0)).toBe(-2);
    });

    it('round(x)', () => {
      expect(evalAt('round(1.4)', 0)).toBe(1);
      expect(evalAt('round(1.5)', 0)).toBe(2);
    });

    it('sign(x)', () => {
      expect(evalAt('sign(5)', 0)).toBe(1);
      expect(evalAt('sign(-5)', 0)).toBe(-1);
      expect(evalAt('sign(0)', 0)).toBe(0);
    });

    it('max(a, b, ...)', () => {
      const expr = Parser.parse('max(1, 3, 2)');
      expect(evaluate(expr, {})).toBe(3);
    });

    it('min(a, b, ...)', () => {
      const expr = Parser.parse('min(1, 3, 2)');
      expect(evaluate(expr, {})).toBe(1);
    });
  });

  describe('isFiniteNumber', () => {
    it('returns true for finite numbers', () => {
      expect(isFiniteNumber(0)).toBe(true);
      expect(isFiniteNumber(5)).toBe(true);
      expect(isFiniteNumber(-3.14)).toBe(true);
    });

    it('returns false for Infinity', () => {
      expect(isFiniteNumber(Infinity)).toBe(false);
      expect(isFiniteNumber(-Infinity)).toBe(false);
    });

    it('returns false for NaN', () => {
      expect(isFiniteNumber(NaN)).toBe(false);
    });
  });
});
