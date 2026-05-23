import type { Expr } from './types';

export function simplify(expr: Expr): Expr {
  const s = simplifyNode(expr);
  return s;
}

function simplifyNode(expr: Expr): Expr {
  switch (expr.kind) {
    case 'number':
    case 'variable':
    case 'constant':
      return expr;

    case 'unary': {
      const arg = simplifyNode(expr.arg);
      if (arg.kind === 'number') {
        return {
          kind: 'number',
          value: expr.op === '-' ? -arg.value : arg.value,
        };
      }
      return { kind: 'unary', op: expr.op, arg };
    }

    case 'binary': {
      const left = simplifyNode(expr.left);
      const right = simplifyNode(expr.right);

      // Both numbers: evaluate
      if (left.kind === 'number' && right.kind === 'number') {
        return evalBinary(expr.op, left.value, right.value);
      }

      // Identity: x + 0 = x, 0 + x = x
      if (expr.op === '+') {
        if (isZero(left)) return right;
        if (isZero(right)) return left;
      }

      // Identity: x - 0 = x, x - x = 0
      if (expr.op === '-') {
        if (isZero(right)) return left;
        if (isEqual(left, right)) return { kind: 'number', value: 0 };
      }

      // Identity: x * 1 = x, 1 * x = x, x * 0 = 0, 0 * x = 0
      if (expr.op === '*') {
        if (isZero(left) || isZero(right)) return { kind: 'number', value: 0 };
        if (isOne(left)) return right;
        if (isOne(right)) return left;
        if (isNegativeOne(left)) return { kind: 'unary', op: '-', arg: right };
        if (isNegativeOne(right)) return { kind: 'unary', op: '-', arg: left };
      }

      // Identity: x / 1 = x, 0 / x = 0, x / x = 1
      if (expr.op === '/') {
        if (isZero(left)) return { kind: 'number', value: 0 };
        if (isOne(right)) return left;
        if (isEqual(left, right)) return { kind: 'number', value: 1 };
      }

      // Identity: x ^ 0 = 1, x ^ 1 = x, 0 ^ x = 0, 1 ^ x = 1
      if (expr.op === '^') {
        if (isZero(right)) return { kind: 'number', value: 1 };
        if (isOne(right)) return left;
        if (isZero(left)) return { kind: 'number', value: 0 };
        if (isOne(left)) return { kind: 'number', value: 1 };
      }

      return { kind: 'binary', op: expr.op, left, right };
    }

    case 'call': {
      const args = expr.args.map(simplifyNode);
      return { kind: 'call', name: expr.name, args };
    }
  }
}

function evalBinary(op: string, a: number, b: number): Expr {
  switch (op) {
    case '+': return { kind: 'number', value: a + b };
    case '-': return { kind: 'number', value: a - b };
    case '*': return { kind: 'number', value: a * b };
    case '/': return { kind: 'number', value: a / b };
    case '^': return { kind: 'number', value: Math.pow(a, b) };
    default: return { kind: 'number', value: NaN };
  }
}

function isZero(expr: Expr): boolean {
  return expr.kind === 'number' && expr.value === 0;
}

function isOne(expr: Expr): boolean {
  return expr.kind === 'number' && expr.value === 1;
}

function isNegativeOne(expr: Expr): boolean {
  return expr.kind === 'number' && expr.value === -1;
}

function isEqual(a: Expr, b: Expr): boolean {
  if (a.kind !== b.kind) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export function exprToString(expr: Expr): string {
  switch (expr.kind) {
    case 'number':
      return String(expr.value);
    case 'variable':
      return expr.name;
    case 'constant':
      return expr.name;
    case 'unary':
      return `${expr.op}${exprToString(expr.arg)}`;
    case 'binary':
      return `(${exprToString(expr.left)} ${expr.op} ${exprToString(expr.right)})`;
    case 'call':
      return `${expr.name}(${expr.args.map(exprToString).join(', ')})`;
  }
}
