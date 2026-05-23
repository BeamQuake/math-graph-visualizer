import { describe, it, expect } from 'vitest';
import { formatExpression, renderEToThe } from './format';

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

describe('formatExpression edge cases', () => {
  it('returns dash for empty string', () => {
    expect(formatExpression('')).toContain('math-op');
    expect(formatExpression('')).toContain('—');
  });

  it('returns empty set symbol for input that simplifies to nothing', () => {
    const result = formatExpression('0*x + 0');
    expect(result).toContain('∅');
  });

  it('handles leading + sign: + 5', () => {
    const result = formatExpression('+ 5');
    expect(stripHtml(result)).toBe('5');
  });

  it('handles leading - sign: - 5', () => {
    const result = formatExpression('- 5');
    expect(stripHtml(result)).toBe('-5');
  });

  it('removes trivial multiplication: 1*x → x', () => {
    expect(stripHtml(formatExpression('1*x'))).toBe('x');
  });

  it('removes zero*var: 0*x', () => {
    expect(stripHtml(formatExpression('0*x + 5'))).toBe('5');
  });

  it('removes + 0 terms: x + 0', () => {
    expect(stripHtml(formatExpression('x + 0'))).toBe('x');
  });

  it('replaces x^1 with x', () => {
    expect(stripHtml(formatExpression('x^1 + 5'))).toBe('x + 5');
  });

  it('handles expressions with constants', () => {
    const result = formatExpression('2*x + 5');
    expect(stripHtml(result)).toBe('2x + 5');
  });

  it('converts exp( to e^(', () => {
    const result = formatExpression('exp(x)');
    expect(result).toContain('e');
  });

  it('handles nested parentheses with exp: exp((x+1)*2)', () => {
    const result = formatExpression('exp((x+1)*2)');
    expect(result).toContain('math-sup');
  });

  it('handles unbalanced parentheses in exp gracefully', () => {
    const result = formatExpression('exp(x+1');
    expect(stripHtml(result)).toBeTruthy();
  });
});

describe('renderEToThe', () => {
  it('renders e^(x) with span classes', () => {
    const result = renderEToThe('e^(x)');
    expect(result).toContain('<span class="math-const">e</span>');
    expect(result).toContain('<span class="math-sup">(x)</span>');
  });

  it('renders multiple e^ expressions', () => {
    const result = renderEToThe('e^(x) + e^(2*x)');
    expect(result.match(/math-const/g)?.length).toBe(2);
    expect(result.match(/math-sup/g)?.length).toBe(2);
  });

  it('leaves non-e^ text unchanged', () => {
    const result = renderEToThe('x + 5');
    expect(result).toBe('x + 5');
  });

  it('handles empty string', () => {
    expect(renderEToThe('')).toBe('');
  });

  it('handles nested parens in exponent: e^((x+1)*(x-1))', () => {
    const result = renderEToThe('e^((x+1)*(x-1))');
    expect(result).toContain('(x+1)*(x-1)');
    expect(result).toContain('math-sup');
  });

  it('handles unbalanced e^( gracefully', () => {
    const result = renderEToThe('e^(x+1');
    expect(result).toBe('e^(x+1');
  });
});
