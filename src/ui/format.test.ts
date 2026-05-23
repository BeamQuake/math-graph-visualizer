import { describe, it, expect } from 'vitest';
import { formatExpression } from './format';

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

describe('formatExpression', () => {
  describe('e^ superscript', () => {
    it('renders e^(0.5x) with sup span', () => {
      const result = formatExpression('2*exp(0.5*x) + -1');
      expect(result).toContain('<span class="math-sup">');
      expect(result).toContain('<span class="math-const">e</span>');
      expect(stripHtml(result)).toBe('2e(0.5x) - 1');
    });

    it('renders e with math-const class', () => {
      const result = formatExpression('exp(x)');
      expect(result).toContain('<span class="math-const">e</span>');
    });

    it('handles nested parens in exponent', () => {
      const result = formatExpression('exp(-(x-0)^2/(2*1^2))');
      expect(result).toContain('<span class="math-sup">');
      expect(stripHtml(result)).toBe('e(-(x-0)²/(2))');
    });
  });

  describe('simplification', () => {
    it('simplifies 1^N → 1: 2*1^2 → 2', () => {
      expect(stripHtml(formatExpression('2*1^2'))).toBe('2');
    });

    it('simplifies 1^N in denominator: 2*1^2) → 2)', () => {
      const result = stripHtml(formatExpression('2*1^2)'));
      expect(result).toBe('2)');
    });

    it('simplifies 1^N and strips *1: 1*1^2 → empty omitted', () => {
      const result = stripHtml(formatExpression('1*1^2'));
      expect(result).toBe('1');
    });
  });

  describe('implied multiplication', () => {
    it('removes * before variable: 2*x → 2x', () => {
      expect(stripHtml(formatExpression('2*x'))).toBe('2x');
    });

    it('removes * before letter: 0.5*x → 0.5x', () => {
      expect(stripHtml(formatExpression('0.5*x'))).toBe('0.5x');
    });

    it('does NOT merge digits: 2*1^2 → 2 (no 21²)', () => {
      expect(stripHtml(formatExpression('2*1^2'))).toBe('2');
    });

    it('does NOT merge digits: 2*1^2 + 3 → 2 + 3 (no 21² + 3)', () => {
      const result = stripHtml(formatExpression('2*1^2 + 3'));
      expect(result).toBe('2 + 3');
    });

    it('converts remaining * to middle dot: 2*3 → 2·3', () => {
      const result = stripHtml(formatExpression('2*3'));
      expect(result).toBe('2·3');
    });
  });
});
