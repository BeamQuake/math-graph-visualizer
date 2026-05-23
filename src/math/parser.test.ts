import { describe, it, expect } from 'vitest';
import { Parser, ParseError } from './parser';
import { evaluate } from './evaluator';

function parseAndEval(input: string, x: number): number {
  const expr = Parser.parse(input);
  return evaluate(expr, { x });
}

describe('Parser', () => {
  it('parses simple numbers', () => {
    expect(parseAndEval('42', 0)).toBe(42);
    expect(parseAndEval('3.14', 0)).toBe(3.14);
    expect(parseAndEval('0', 0)).toBe(0);
    expect(parseAndEval('-5', 0)).toBe(-5);
  });

  it('parses variables', () => {
    expect(parseAndEval('x', 5)).toBe(5);
    expect(parseAndEval('x', -3)).toBe(-3);
  });

  it('parses constants', () => {
    expect(parseAndEval('pi', 0)).toBe(Math.PI);
    expect(parseAndEval('e', 0)).toBe(Math.E);
  });

  it('parses basic arithmetic', () => {
    expect(parseAndEval('2 + 3', 0)).toBe(5);
    expect(parseAndEval('2 - 3', 0)).toBe(-1);
    expect(parseAndEval('2 * 3', 0)).toBe(6);
    expect(parseAndEval('6 / 2', 0)).toBe(3);
  });

  it('respects operator precedence', () => {
    expect(parseAndEval('2 + 3 * 4', 0)).toBe(14);
    expect(parseAndEval('(2 + 3) * 4', 0)).toBe(20);
    expect(parseAndEval('2 * 3 + 4', 0)).toBe(10);
  });

  it('handles powers', () => {
    expect(parseAndEval('2^3', 0)).toBe(8);
    expect(parseAndEval('2 + 3^2', 0)).toBe(11);
    expect(parseAndEval('(2+1)^2', 0)).toBe(9);
    expect(parseAndEval('x^2', 5)).toBe(25);
  });

  it('parses unary minus', () => {
    expect(parseAndEval('-x', 5)).toBe(-5);
    expect(parseAndEval('--x', 5)).toBe(5);
    expect(parseAndEval('x + -3', 5)).toBe(2);
  });

  it('parses function calls', () => {
    expect(parseAndEval('sin(0)', 0)).toBe(0);
    expect(parseAndEval('cos(0)', 0)).toBe(1);
    expect(parseAndEval('exp(0)', 0)).toBe(1);
    expect(parseAndEval('ln(1)', 0)).toBe(0);
    expect(parseAndEval('sqrt(4)', 0)).toBe(2);
    expect(parseAndEval('abs(-5)', 0)).toBe(5);
  });

  it('parses nested function calls', () => {
    expect(parseAndEval('sin(cos(0))', 0)).toBeCloseTo(Math.sin(1));
    expect(parseAndEval('exp(ln(5))', 0)).toBeCloseTo(5);
  });

  it('handles functions of x', () => {
    expect(parseAndEval('sin(x)', 0)).toBe(0);
    expect(parseAndEval('sin(x)', Math.PI / 2)).toBeCloseTo(1);
    expect(parseAndEval('2*sin(x)', Math.PI / 2)).toBeCloseTo(2);
  });

  it('parses polynomials', () => {
    expect(parseAndEval('x^3 - 3*x^2 + 2', 0)).toBe(2);
    expect(parseAndEval('x^3 - 3*x^2 + 2', 1)).toBe(0);
    expect(parseAndEval('x^3 - 3*x^2 + 2', 2)).toBe(-2);
    expect(parseAndEval('x^3 - 3*x^2 + 2', 3)).toBe(2);
  });

  it('throws on invalid input', () => {
    expect(() => Parser.parse('')).toThrow(ParseError);
    expect(() => Parser.parse('2 +')).toThrow(ParseError);
    expect(() => Parser.parse('(2 + 3')).toThrow(ParseError);
    expect(() => Parser.parse('2 + )')).toThrow(ParseError);
    // 'sin' alone is valid — parsed as variable name
  });

  it('handles ** for power', () => {
    expect(parseAndEval('2**3', 0)).toBe(8);
    expect(parseAndEval('x**2', 4)).toBe(16);
  });

  it('parses complex expressions', () => {
    expect(parseAndEval('(x+1)*(x-1)', 0)).toBe(-1);
    expect(parseAndEval('(x+1)*(x-1)', 1)).toBe(0);
    expect(parseAndEval('(x+1)*(x-1)', 2)).toBe(3);
  });
});
