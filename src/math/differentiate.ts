import type { Expr, UnaryOp, BinaryOp } from './types';

export function differentiate(expr: Expr, variable: string = 'x'): Expr {
  switch (expr.kind) {
    case 'number':
      return { kind: 'number', value: 0 };

    case 'variable':
      return expr.name === variable
        ? { kind: 'number', value: 1 }
        : { kind: 'number', value: 0 };

    case 'constant':
      return { kind: 'number', value: 0 };

    case 'unary': {
      const inner = differentiate(expr.arg, variable);
      return { kind: 'unary', op: expr.op, arg: inner };
    }

    case 'binary': {
      switch (expr.op) {
        case '+':
        case '-':
          return {
            kind: 'binary',
            op: expr.op as BinaryOp,
            left: differentiate(expr.left, variable),
            right: differentiate(expr.right, variable),
          };

        case '*':
          return {
            kind: 'binary',
            op: '+',
            left: {
              kind: 'binary',
              op: '*',
              left: differentiate(expr.left, variable),
              right: expr.right,
            },
            right: {
              kind: 'binary',
              op: '*',
              left: expr.left,
              right: differentiate(expr.right, variable),
            },
          };

        case '/':
          return {
            kind: 'binary',
            op: '/',
            left: {
              kind: 'binary',
              op: '-',
              left: {
                kind: 'binary',
                op: '*',
                left: differentiate(expr.left, variable),
                right: expr.right,
              },
              right: {
                kind: 'binary',
                op: '*',
                left: expr.left,
                right: differentiate(expr.right, variable),
              },
            },
            right: {
              kind: 'binary',
              op: '^',
              left: expr.right,
              right: { kind: 'number', value: 2 },
            },
          };

        case '^': {
          const f = expr.left;
          const g = expr.right;

          // f^n (constant exponent): use power rule + chain rule: n * f^(n-1) * f'
          if (g.kind === 'number') {
            const n = g.value;
            if (n === 0) return { kind: 'number', value: 0 };
            if (n === 1) return differentiate(f, variable);
            if (f.kind === 'variable') {
              if (n === 2) {
                return {
                  kind: 'binary',
                  op: '*',
                  left: { kind: 'number', value: 2 },
                  right: f,
                };
              }
              return {
                kind: 'binary',
                op: '*',
                left: { kind: 'number', value: n },
                right: {
                  kind: 'binary',
                  op: '^',
                  left: f,
                  right: { kind: 'number', value: n - 1 },
                },
              };
            }
            // General base: n * f^(n-1) * df (avoids division by f — no NaN at zeros)
            return mul(
              { kind: 'number', value: n },
              mul(
                {
                  kind: 'binary',
                  op: '^',
                  left: f,
                  right: { kind: 'number', value: n - 1 },
                },
                differentiate(f, variable),
              ),
            );
          }

          // Special case: n^x (constant^n with variable exponent)
          // Use: n^x * ln(n)
          if (f.kind === 'number') {
            return {
              kind: 'binary',
              op: '*',
              left: expr,
              right: { kind: 'call', name: 'ln', args: [f] },
            };
          }

          // General case: f^g
          // f^g * (g' * ln(f) + g * f' / f)
          const df = differentiate(f, variable);
          const dg = differentiate(g, variable);

          const term1: Expr = {
            kind: 'binary',
            op: '*',
            left: dg,
            right: { kind: 'call', name: 'ln', args: [f] },
          };

          const term2: Expr = {
            kind: 'binary',
            op: '/',
            left: {
              kind: 'binary',
              op: '*',
              left: g,
              right: df,
            },
            right: f,
          };

          return {
            kind: 'binary',
            op: '*',
            left: expr,
            right: {
              kind: 'binary',
              op: '+',
              left: term1,
              right: term2,
            },
          };
        }
      }
    }

    case 'call': {
      return differentiateCall(expr, variable);
    }
  }
}

function differentiateCall(expr: Expr & { kind: 'call' }, variable: string): Expr {
  const { name, args } = expr;
  const f = args[0];
  const df = differentiate(f, variable);
  const zero = { kind: 'number' as const, value: 0 };
  const one = { kind: 'number' as const, value: 1 };

  switch (name) {
    case 'sin':
      return mul(call('cos', f), df);
    case 'cos':
      return mul(unary('-', call('sin', f)), df);
    case 'tan':
      return mul(div(one, pow(call('cos', f), 2)), df);
    case 'asin':
      return mul(df, div(one, call('sqrt', sub(one, pow(f, 2)))));
    case 'acos':
      return mul(unary('-', df), div(one, call('sqrt', sub(one, pow(f, 2)))));
    case 'atan':
      return mul(df, div(one, add(one, pow(f, 2))));
    case 'sinh':
      return mul(call('cosh', f), df);
    case 'cosh':
      return mul(call('sinh', f), df);
    case 'tanh':
      return mul(div(one, pow(call('cosh', f), 2)), df);
    case 'exp':
      return mul(call('exp', f), df);
    case 'ln':
    case 'log':
      return div(df, f);
    case 'log2':
      return div(df, mul(f, call('ln', { kind: 'number', value: 2 })));
    case 'log10':
      return div(df, mul(f, call('ln', { kind: 'number', value: 10 })));
    case 'sqrt':
      return div(df, mul({ kind: 'number', value: 2 }, call('sqrt', f)));
    case 'abs':
      return mul(df, call('sign', f));
    default:
      return zero;
  }
}

// ─── Helper constructors ────────────────────────────────────────

function call(name: string, ...args: Expr[]): Expr {
  return { kind: 'call', name, args };
}

function mul(left: Expr, right: Expr): Expr {
  return { kind: 'binary', op: '*', left, right };
}

function div(left: Expr, right: Expr): Expr {
  return { kind: 'binary', op: '/', left, right };
}

function add(left: Expr, right: Expr): Expr {
  return { kind: 'binary', op: '+', left, right };
}

function sub(left: Expr, right: Expr): Expr {
  return { kind: 'binary', op: '-', left, right };
}

function pow(base: Expr, exp: number): Expr {
  return { kind: 'binary', op: '^', left: base, right: { kind: 'number', value: exp } };
}

function unary(op: UnaryOp, arg: Expr): Expr {
  return { kind: 'unary', op, arg };
}
