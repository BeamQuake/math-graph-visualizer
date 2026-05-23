import { describe, it, expect } from 'vitest';
import {
  buildExpression,
  buildParamList,
  buildDefaultParams,
  presetToParams,
} from './function-builder';
import { Parser } from './parser';
import { evaluate } from './evaluator';
import { PRESETS } from './presets';
import type { FunctionParams } from './types';

function parsesAndEvaluates(exprStr: string, x: number): number {
  const expr = Parser.parse(exprStr);
  return evaluate(expr, { x });
}

describe('function-builder', () => {
  describe('buildDefaultParams', () => {
    it('returns default params for polynomial', () => {
      const params = buildDefaultParams('polynomial');
      expect(params.type).toBe('polynomial');
      expect(params.order).toBe(3);
      expect(params.extra).toEqual({});
    });

    it('returns default params for exponential', () => {
      const params = buildDefaultParams('exponential');
      expect(params.type).toBe('exponential');
      expect(params.extra.a).toBe(2);
      expect(params.extra.b).toBe(0.5);
      expect(params.extra.c).toBe(-1);
    });

    it('returns default params for logarithmic', () => {
      const params = buildDefaultParams('logarithmic');
      expect(params.type).toBe('logarithmic');
      expect(params.extra.a).toBe(2);
      expect(params.extra.b).toBe(1);
      expect(params.extra.c).toBe(-1);
    });

    it('returns default params for gaussian', () => {
      const params = buildDefaultParams('gaussian');
      expect(params.type).toBe('gaussian');
      expect(params.extra.a).toBe(1);
      expect(params.extra.b).toBe(0);
      expect(params.extra.c).toBe(1);
    });

    it('returns default params for rational', () => {
      const params = buildDefaultParams('rational');
      expect(params.type).toBe('rational');
      expect(params.extra.n2).toBe(1);
      expect(params.extra.d2).toBe(1);
    });

    it('returns default params for reciprocal', () => {
      const params = buildDefaultParams('reciprocal');
      expect(params.type).toBe('reciprocal');
      expect(params.extra.a).toBe(1);
      expect(params.extra.b).toBe(1);
      expect(params.extra.c).toBe(0);
    });

    it('returns default params for custom', () => {
      const params = buildDefaultParams('custom');
      expect(params.type).toBe('custom');
      expect(params.extra).toEqual({});
    });
  });

  describe('buildParamList', () => {
    it('returns a3, a2, a1, a0 for polynomial order 3', () => {
      const params: FunctionParams = { type: 'polynomial', order: 3, coeffs: [], extra: {} };
      const labels = buildParamList(params);
      expect(labels).toEqual(['a3', 'a2', 'a1', 'a0']);
    });

    it('returns a4, a3, a2, a1, a0 for polynomial order 4', () => {
      const params: FunctionParams = { type: 'polynomial', order: 4, coeffs: [], extra: {} };
      const labels = buildParamList(params);
      expect(labels).toEqual(['a4', 'a3', 'a2', 'a1', 'a0']);
    });

    it('returns [a, b, c] for exponential', () => {
      const params: FunctionParams = { type: 'exponential', order: 0, coeffs: [], extra: {} };
      expect(buildParamList(params)).toEqual(['a', 'b', 'c']);
    });

    it('returns [a, b, c] for logarithmic', () => {
      const params: FunctionParams = { type: 'logarithmic', order: 0, coeffs: [], extra: {} };
      expect(buildParamList(params)).toEqual(['a', 'b', 'c']);
    });

    it('returns [a, b, c] for gaussian', () => {
      const params: FunctionParams = { type: 'gaussian', order: 0, coeffs: [], extra: {} };
      expect(buildParamList(params)).toEqual(['a', 'b', 'c']);
    });

    it('returns [n2, n1, n0, d2, d1, d0] for rational', () => {
      const params: FunctionParams = { type: 'rational', order: 0, coeffs: [], extra: {} };
      expect(buildParamList(params)).toEqual(['n2', 'n1', 'n0', 'd2', 'd1', 'd0']);
    });

    it('returns [] for custom', () => {
      const params: FunctionParams = { type: 'custom', order: 0, coeffs: [], extra: {} };
      expect(buildParamList(params)).toEqual([]);
    });
  });

  describe('buildExpression - polynomial', () => {
    it('builds default polynomial expression and evaluates correctly', () => {
      const params = buildDefaultParams('polynomial');
      const expr = buildExpression(params);
      const exprParsed = Parser.parse(expr);
      expect(evaluate(exprParsed, { x: 0 })).toBeDefined();
      expect(evaluate(exprParsed, { x: 1 })).toBeDefined();
    });

    it('builds linear expression with coeffs ordered [a1, a0]', () => {
      const params: FunctionParams = {
        type: 'polynomial',
        order: 1,
        coeffs: [2, 5],
        extra: {},
      };
      const expr = buildExpression(params);
      expect(parsesAndEvaluates(expr, 0)).toBe(5);
      expect(parsesAndEvaluates(expr, 1)).toBe(7);
    });

    it('handles zero coefficients properly', () => {
      const params: FunctionParams = {
        type: 'polynomial',
        order: 2,
        coeffs: [1, 0, 0],
        extra: {},
      };
      const expr = buildExpression(params);
      expect(parsesAndEvaluates(expr, 2)).toBe(4);
    });
  });

  describe('buildExpression - exponential', () => {
    it('builds a*exp(b*x) + c', () => {
      const params: FunctionParams = {
        type: 'exponential',
        order: 0,
        coeffs: [],
        extra: { a: 2, b: 1, c: 0 },
      };
      const expr = buildExpression(params);
      expect(expr).toBe('2*exp(1*x) + 0');
      expect(parsesAndEvaluates(expr, 0)).toBeCloseTo(2);
      expect(parsesAndEvaluates(expr, 1)).toBeCloseTo(2 * Math.E);
    });
  });

  describe('buildExpression - logarithmic', () => {
    it('builds a*ln(b*x + c)', () => {
      const params: FunctionParams = {
        type: 'logarithmic',
        order: 0,
        coeffs: [],
        extra: { a: 1, b: 1, c: 0 },
      };
      const expr = buildExpression(params);
      expect(expr).toBe('1*ln(1*x + 0)');
      expect(parsesAndEvaluates(expr, 1)).toBeCloseTo(0);
      expect(parsesAndEvaluates(expr, Math.E)).toBeCloseTo(1);
    });
  });

  describe('buildExpression - gaussian', () => {
    it('builds a*exp(-(x-b)^2/(2*c^2))', () => {
      const params: FunctionParams = {
        type: 'gaussian',
        order: 0,
        coeffs: [],
        extra: { a: 1, b: 0, c: 1 },
      };
      const expr = buildExpression(params);
      expect(expr).toBe('exp(-x^2/2)');
      expect(parsesAndEvaluates(expr, 0)).toBeCloseTo(1);
    });

    it('handles negative b correctly (b=-2 → (x+2))', () => {
      const params: FunctionParams = {
        type: 'gaussian',
        order: 0,
        coeffs: [],
        extra: { a: 1, b: -2, c: 1 },
      };
      const expr = buildExpression(params);
      expect(expr).toBe('exp(-(x+2)^2/2)');
    });

    it('handles non-1 sigma2 (c=-2 → sigma2=4)', () => {
      const params: FunctionParams = {
        type: 'gaussian',
        order: 0,
        coeffs: [],
        extra: { a: 4, b: 0, c: -2 },
      };
      const expr = buildExpression(params);
      expect(expr).toBe('4*exp(-x^2/(2*4))');
      expect(parsesAndEvaluates(expr, 0)).toBeCloseTo(4);
      expect(parsesAndEvaluates(expr, 5)).toBeLessThan(parsesAndEvaluates(expr, 0));
    });
  });

  describe('buildExpression - rational', () => {
    it('builds (x^2-1)/(x^2+1)', () => {
      const params: FunctionParams = {
        type: 'rational',
        order: 0,
        coeffs: [],
        extra: { n2: 1, n1: 0, n0: -1, d2: 1, d1: 0, d0: 1 },
      };
      const expr = buildExpression(params);
      expect(parsesAndEvaluates(expr, 0)).toBeCloseTo(-1);
      expect(parsesAndEvaluates(expr, 1)).toBeCloseTo(0);
    });
  });

  describe('buildExpression - reciprocal', () => {
    it('builds a/(x - b) + c', () => {
      const params: FunctionParams = {
        type: 'reciprocal',
        order: 0,
        coeffs: [],
        extra: { a: 1, b: 1, c: 0 },
      };
      const expr = buildExpression(params);
      expect(expr).toBe('1/(x - 1) + 0');
      expect(parsesAndEvaluates(expr, 2)).toBeCloseTo(1);
    });
  });

  describe('buildExpression - custom', () => {
    it('returns empty string for custom type', () => {
      const params: FunctionParams = {
        type: 'custom',
        order: 0,
        coeffs: [],
        extra: {},
      };
      expect(buildExpression(params)).toBe('');
    });
  });

  describe('presetToParams', () => {
    it('converts polynomial preset correctly', () => {
      const preset = PRESETS.find(p => p.id === 'poly3')!;
      const params = presetToParams(preset);
      expect(params.type).toBe('polynomial');
      expect(params.order).toBe(3);
      expect(params.coeffs).toEqual([1, -3, 0, 2]);
    });

    it('converts rational preset correctly', () => {
      const preset = PRESETS.find(p => p.id === 'rational')!;
      const params = presetToParams(preset);
      expect(params.type).toBe('rational');
      expect(params.extra.n2).toBe(1);
      expect(params.extra.d2).toBe(1);
    });

    it('converts exponential preset correctly', () => {
      const preset = PRESETS.find(p => p.id === 'exponential')!;
      const params = presetToParams(preset);
      expect(params.type).toBe('exponential');
      expect(params.extra.a).toBe(2);
    });

    it('buildExpression produces parseable expressions for all presets', () => {
      for (const preset of PRESETS) {
        if (preset.type === 'custom') continue;
        const params = presetToParams(preset);
        const built = buildExpression(params);
        // Verify it parses without error
        const builtParses = Parser.parse(built);
        expect(builtParses).toBeDefined();
      }
    });
  });
});
