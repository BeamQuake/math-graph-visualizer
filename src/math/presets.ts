import type { FunctionPreset } from './types';

export const PRESETS: FunctionPreset[] = [
  {
    id: 'poly3',
    label: 'x³ − 3x² + 2',
    type: 'polynomial',
    params: { order: 3, a3: 1, a2: -3, a1: 0, a0: 2 },
    paramOrder: ['a3', 'a2', 'a1', 'a0'],
    expr: '1*x^3 + -3*x^2 + 0*x + 2',
    description: 'Polynom 3. Grades — Klassiker',
  },
  {
    id: 'poly4',
    label: 'x⁴ − 4x² + 1',
    type: 'polynomial',
    params: { order: 4, a4: 1, a3: 0, a2: -4, a1: 0, a0: 1 },
    paramOrder: ['a4', 'a3', 'a2', 'a1', 'a0'],
    expr: '1*x^4 + 0*x^3 + -4*x^2 + 0*x + 1',
    description: 'Polynom 4. Grades — Doppelter Extrempunkt',
  },
  {
    id: 'exponential',
    label: '2·e^(0.5x) − 1',
    type: 'exponential',
    params: { a: 2, b: 0.5, c: -1 },
    paramOrder: ['a', 'b', 'c'],
    expr: '2*exp(0.5*x) + -1',
    description: 'Exponentialfunktion — Wachstum',
  },
  {
    id: 'logarithmic',
    label: '2·ln(x+1) − 1',
    type: 'logarithmic',
    params: { a: 2, b: 1, c: -1 },
    paramOrder: ['a', 'b', 'c'],
    expr: '2*ln(x+1) + -1',
    description: 'Logarithmus — Sättigung',
  },
  {
    id: 'gaussian',
    label: 'e^(−x²)',
    type: 'gaussian',
    params: { a: 1, b: 0, c: 1 },
    paramOrder: ['a', 'b', 'c'],
    expr: 'exp(-x^2/2)',
    description: 'Gauß-Glocke — Statistik',
  },
  {
    id: 'rational',
    label: '(x²−1)/(x²+1)',
    type: 'rational',
    params: { n2: 1, n1: 0, n0: -1, d2: 1, d1: 0, d0: 1 },
    paramOrder: ['n2', 'n1', 'n0', 'd2', 'd1', 'd0'],
    expr: '(1*x^2 + 0*x + -1)/(1*x^2 + 0*x + 1)',
    description: 'Gebrochen rational — Asymptoten!',
  },
  {
    id: 'reciprocal',
    label: '1/(x − 1)',
    type: 'reciprocal',
    params: { a: 1, b: 1, c: 0 },
    paramOrder: ['a', 'b', 'c'],
    expr: '1/(x - 1) + 0',
    description: 'Reziprok — Asymptote!',
  },
];

export function getParamDisplay(label: string): string {
  const map: Record<string, string> = {
    a: 'a', b: 'b', c: 'c',
    order: 'n',
    a3: 'a₃', a2: 'a₂', a1: 'a₁', a0: 'a₀',
    a4: 'a₄',
    n2: 'n₂', n1: 'n₁', n0: 'n₀',
    d2: 'd₂', d1: 'd₁', d0: 'd₀',
  };
  return map[label] ?? label;
}
