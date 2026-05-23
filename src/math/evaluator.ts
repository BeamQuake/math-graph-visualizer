import type { Expr } from './types';

export function evaluate(expr: Expr, vars: Record<string, number> = {}): number {
  switch (expr.kind) {
    case 'number':
      return expr.value;

    case 'variable': {
      if (expr.name in vars) return vars[expr.name];
      throw new Error(`Undefined variable: ${expr.name}`);
    }

    case 'constant':
      return expr.name === 'pi' ? Math.PI : Math.E;

    case 'unary': {
      const arg = evaluate(expr.arg, vars);
      return expr.op === '-' ? -arg : arg;
    }

    case 'binary': {
      const left = evaluate(expr.left, vars);
      const right = evaluate(expr.right, vars);

      switch (expr.op) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': {
          if (right === 0) return left > 0 ? Infinity : left < 0 ? -Infinity : NaN;
          return left / right;
        }
        case '^': {
          if (left < 0 && !Number.isInteger(right)) return NaN;
          return Math.pow(left, right);
        }
      }
    }

    case 'call': {
      const args = expr.args.map((a) => evaluate(a, vars));
      return evaluateCall(expr.name, args);
    }
  }
}

const callTable: Record<string, (...args: number[]) => number> = {
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  tan: (x) => Math.tan(x),
  asin: (x) => Math.asin(x),
  acos: (x) => Math.acos(x),
  atan: (x) => Math.atan(x),
  atan2: (y, x) => Math.atan2(y, x),
  sinh: (x) => Math.sinh(x),
  cosh: (x) => Math.cosh(x),
  tanh: (x) => Math.tanh(x),
  exp: (x) => Math.exp(x),
  ln: (x) => Math.log(x),
  log: (x) => Math.log10(x),
  log2: (x) => Math.log2(x),
  log10: (x) => Math.log10(x),
  sqrt: (x) => Math.sqrt(x),
  abs: (x) => Math.abs(x),
  ceil: (x) => Math.ceil(x),
  floor: (x) => Math.floor(x),
  round: (x) => Math.round(x),
  sign: (x) => Math.sign(x),
  max: (...args) => Math.max(...args),
  min: (...args) => Math.min(...args),
};

function evaluateCall(name: string, args: number[]): number {
  const fn = callTable[name];
  if (!fn) {
    throw new Error(`Unknown function: ${name}`);
  }
  return fn(...args);
}

export function isFiniteNumber(v: number): boolean {
  return Number.isFinite(v);
}
