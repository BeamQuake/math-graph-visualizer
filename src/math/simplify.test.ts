import { describe, it, expect } from 'vitest';
import { Parser } from './parser';
import { simplify, exprToString } from './simplify';
import { evaluate } from './evaluator';

function simplifiedValue(input: string, x: number = 0): number {
  const expr = Parser.parse(input);
  const simplified = simplify(expr);
  return evaluate(simplified, { x });
}

function parseAndSimplify(input: string): string {
  const expr = Parser.parse(input);
  const simplified = simplify(expr);
  return exprToString(simplified);
}

describe('simplify', () => {
  describe('constant folding', () => {
    it('folds addition: 2 + 3 → 5', () => {
      expect(simplifiedValue('2 + 3')).toBe(5);
      expect(parseAndSimplify('2 + 3')).toBe('5');
    });

    it('folds subtraction: 5 - 2 → 3', () => {
      expect(simplifiedValue('5 - 2')).toBe(3);
      expect(parseAndSimplify('5 - 2')).toBe('3');
    });

    it('folds multiplication: 4 * 3 → 12', () => {
      expect(simplifiedValue('4 * 3')).toBe(12);
      expect(parseAndSimplify('4 * 3')).toBe('12');
    });

    it('folds division: 10 / 2 → 5', () => {
      expect(simplifiedValue('10 / 2')).toBe(5);
      expect(parseAndSimplify('10 / 2')).toBe('5');
    });

    it('folds power: 2 ^ 3 → 8', () => {
      expect(simplifiedValue('2 ^ 3')).toBe(8);
      expect(parseAndSimplify('2 ^ 3')).toBe('8');
    });

    it('folds nested constants: (2 + 3) * 4 → 20', () => {
      expect(simplifiedValue('(2 + 3) * 4')).toBe(20);
    });

    it('folds negative numbers: -5 + 3 → -2', () => {
      expect(simplifiedValue('-5 + 3')).toBe(-2);
    });
  });

  describe('identity: x + 0, 0 + x', () => {
    it('x + 0 → x', () => {
      expect(simplifiedValue('x + 0', 5)).toBe(5);
      expect(simplifiedValue('x + 0', -3)).toBe(-3);
    });

    it('0 + x → x', () => {
      expect(simplifiedValue('0 + x', 5)).toBe(5);
      expect(simplifiedValue('0 + x', -3)).toBe(-3);
    });

    it('x + 0 in expression: (x + 0) * 2 → 2x', () => {
      expect(simplifiedValue('(x + 0) * 2', 3)).toBe(6);
    });
  });

  describe('identity: x - 0, x - x', () => {
    it('x - 0 → x', () => {
      expect(simplifiedValue('x - 0', 5)).toBe(5);
      expect(simplifiedValue('x - 0', -3)).toBe(-3);
    });

    it('x - x → 0', () => {
      expect(simplifiedValue('x - x', 5)).toBe(0);
      expect(simplifiedValue('x - x', -3)).toBe(0);
      expect(parseAndSimplify('x - x')).toBe('0');
    });

    it('constant - same constant → 0', () => {
      expect(simplifiedValue('5 - 5')).toBe(0);
      expect(parseAndSimplify('5 - 5')).toBe('0');
    });
  });

  describe('identity: x * 0, 0 * x', () => {
    it('x * 0 → 0', () => {
      expect(simplifiedValue('x * 0', 5)).toBe(0);
      expect(simplifiedValue('x * 0', -3)).toBe(0);
      expect(parseAndSimplify('x * 0')).toBe('0');
    });

    it('0 * x → 0', () => {
      expect(simplifiedValue('0 * x', 5)).toBe(0);
      expect(simplifiedValue('0 * x', -3)).toBe(0);
      expect(parseAndSimplify('0 * x')).toBe('0');
    });

    it('0 * complex expression → 0: 0 * (x + 1)', () => {
      expect(simplifiedValue('0 * (x + 1)', 5)).toBe(0);
    });
  });

  describe('identity: x * 1, 1 * x', () => {
    it('x * 1 → x', () => {
      expect(simplifiedValue('x * 1', 5)).toBe(5);
      expect(simplifiedValue('x * 1', -3)).toBe(-3);
    });

    it('1 * x → x', () => {
      expect(simplifiedValue('1 * x', 5)).toBe(5);
      expect(simplifiedValue('1 * x', -3)).toBe(-3);
    });

    it('1 * expression preserves it: 1 * (x + 2)', () => {
      expect(simplifiedValue('1 * (x + 2)', 3)).toBe(5);
    });
  });

  describe('identity: x * -1, -1 * x → -x', () => {
    it('-1 * x → -x', () => {
      expect(simplifiedValue('-1 * x', 5)).toBe(-5);
      expect(simplifiedValue('-1 * x', -3)).toBe(3);
    });

    it('x * -1 → -x', () => {
      expect(simplifiedValue('x * -1', 5)).toBe(-5);
      expect(simplifiedValue('x * -1', -3)).toBe(3);
    });
  });

  describe('identity: x / 1, 0 / x, x / x', () => {
    it('x / 1 → x', () => {
      expect(simplifiedValue('x / 1', 5)).toBe(5);
      expect(simplifiedValue('x / 1', -3)).toBe(-3);
    });

    it('0 / x → 0 (when x is variable)', () => {
      expect(parseAndSimplify('0 / x')).toBe('0');
      const expr = Parser.parse('0 / x');
      const simplified = simplify(expr);
      expect(evaluate(simplified, { x: 5 })).toBe(0);
    });

    it('0 / constant → 0', () => {
      expect(simplifiedValue('0 / 5')).toBe(0);
      expect(parseAndSimplify('0 / 5')).toBe('0');
    });

    it('x / x → 1 (when structurally equal)', () => {
      expect(simplifiedValue('x / x', 5)).toBe(1);
      expect(simplifiedValue('x / x', -3)).toBe(1);
      expect(parseAndSimplify('x / x')).toBe('1');
    });

    it('constant / same constant → 1', () => {
      expect(parseAndSimplify('5 / 5')).toBe('1');
    });
  });

  describe('identity: x ^ 0, x ^ 1, 0 ^ x, 1 ^ x', () => {
    it('x ^ 0 → 1', () => {
      const expr = Parser.parse('x ^ 0');
      const simplified = simplify(expr);
      expect(simplified.kind).toBe('number');
      expect((simplified as any).value).toBe(1);
      expect(parseAndSimplify('x ^ 0')).toBe('1');
    });

    it('(x + 2) ^ 0 → 1', () => {
      const expr = Parser.parse('(x + 2) ^ 0');
      const simplified = simplify(expr);
      expect(simplified.kind).toBe('number');
      expect((simplified as any).value).toBe(1);
    });

    it('x ^ 1 → x', () => {
      const expr = Parser.parse('x ^ 1');
      const simplified = simplify(expr);
      expect(evaluate(simplified, { x: 5 })).toBe(5);
      expect(evaluate(simplified, { x: -3 })).toBe(-3);
    });

    it('0 ^ x → 0', () => {
      const expr = Parser.parse('0 ^ x');
      const simplified = simplify(expr);
      expect(simplified.kind).toBe('number');
      expect((simplified as any).value).toBe(0);
      expect(parseAndSimplify('0 ^ x')).toBe('0');
    });

    it('1 ^ x → 1', () => {
      const expr = Parser.parse('1 ^ x');
      const simplified = simplify(expr);
      expect(simplified.kind).toBe('number');
      expect((simplified as any).value).toBe(1);
      expect(parseAndSimplify('1 ^ x')).toBe('1');
    });
  });

  describe('unary simplification', () => {
    it('-5 (unary number) → -5', () => {
      expect(parseAndSimplify('-5')).toBe('-5');
      expect(simplifiedValue('-5')).toBe(-5);
    });

    it('--5 (double unary negation of number) → 5', () => {
      expect(simplifiedValue('--5')).toBe(5);
    });

    it('+5 (unary plus of number) → 5', () => {
      expect(simplifiedValue('+5')).toBe(5);
    });

    it('preserves unary minus on variable: -x', () => {
      const expr = Parser.parse('-x');
      const simplified = simplify(expr);
      expect(evaluate(simplified, { x: 5 })).toBe(-5);
    });
  });

  describe('complex expressions', () => {
    it('simplifies (x + 0) * (0 + 1) → x', () => {
      expect(simplifiedValue('(x + 0) * (0 + 1)', 5)).toBe(5);
    });

    it('simplifies x ^ 2 - x ^ 2 → 0', () => {
      expect(parseAndSimplify('x^2 - x^2')).toBe('0');
    });

    it('simplifies (x * 0) + (1 * x) → x', () => {
      expect(simplifiedValue('(x * 0) + (1 * x)', 7)).toBe(7);
    });

    it('simplifies nested: 2 * (3 + 4) * x', () => {
      expect(simplifiedValue('2 * (3 + 4) * x', 2)).toBe(28);
    });
  });

  describe('exprToString serialization', () => {
    it('serializes numbers', () => {
      expect(parseAndSimplify('42')).toBe('42');
    });

    it('serializes variables', () => {
      const expr = Parser.parse('x');
      expect(exprToString(expr)).toBe('x');
    });

    it('serializes binary operations with parens', () => {
      const expr = Parser.parse('x + y');
      const str = exprToString(expr);
      expect(str).toContain('+');
    });

    it('serializes function calls', () => {
      const expr = Parser.parse('sin(x)');
      expect(exprToString(expr)).toContain('sin');
      expect(exprToString(expr)).toContain('(');
    });

    it('serializes unary operations', () => {
      const expr = Parser.parse('-x');
      expect(exprToString(expr)).toContain('-');
    });
  });
});
