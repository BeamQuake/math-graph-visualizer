import type { FunctionType, FunctionParams, FunctionPreset } from './types';

export function buildExpression(params: FunctionParams): string {
  switch (params.type) {
    case 'polynomial':
      return buildPolynomial(params);
    case 'exponential':
      return buildExponential(params);
    case 'logarithmic':
      return buildLogarithmic(params);
    case 'gaussian':
      return buildGaussian(params);
    case 'rational':
      return buildRational(params);
    case 'reciprocal':
      return buildReciprocal(params);
    case 'custom':
      return '';
  }
}

export function buildParamList(params: FunctionParams): string[] {
  switch (params.type) {
    case 'polynomial': {
      const order = params.order ?? 3;
      const labels: string[] = [];
      for (let i = order; i >= 0; i--) {
        labels.push(`a${i}`);
      }
      return labels;
    }
    case 'exponential':
    case 'logarithmic':
    case 'gaussian':
    case 'reciprocal':
      return ['a', 'b', 'c'];
    case 'rational':
      return ['n2', 'n1', 'n0', 'd2', 'd1', 'd0'];
    case 'custom':
      return [];
  }
}

export function buildDefaultParams(type: FunctionType): FunctionParams {
  switch (type) {
    case 'polynomial':
      return { type, order: 3, coeffs: [2, 0, -3, 1], extra: {} };
    case 'exponential':
      return { type, order: 0, coeffs: [2], extra: { a: 2, b: 0.5, c: -1 } };
    case 'logarithmic':
      return { type, order: 0, coeffs: [2], extra: { a: 2, b: 1, c: -1 } };
    case 'gaussian':
      return { type, order: 0, coeffs: [], extra: { a: 1, b: 0, c: 1 } };
    case 'rational':
      return { type, order: 0, coeffs: [], extra: { n2: 1, n1: 0, n0: -1, d2: 1, d1: 0, d0: 1 } };
    case 'reciprocal':
      return { type, order: 0, coeffs: [], extra: { a: 1, b: 1, c: 0 } };
    case 'custom':
      return { type, order: 0, coeffs: [], extra: {} };
  }
}

export function presetToParams(preset: FunctionPreset): FunctionParams {
  if (preset.type === 'polynomial') {
    const order = preset.params.order ?? 3;
    const coeffs: number[] = [];
    for (let i = order; i >= 0; i--) {
      coeffs.push(preset.params[`a${i}`] ?? 0);
    }
    return { type: preset.type, order, coeffs, extra: preset.params };
  }

  if (preset.type === 'rational') {
    return {
      type: preset.type,
      order: 0,
      coeffs: [],
      extra: { ...preset.params },
    };
  }

  return {
    type: preset.type,
    order: 0,
    coeffs: [],
    extra: { ...preset.params },
  };
}

// ─── Builders ───────────────────────────────────────────────────

function buildPolynomial(params: FunctionParams): string {
  const order = params.order ?? 3;
  const terms: string[] = [];
  for (let i = order; i >= 0; i--) {
    const coeff = params.coeffs[order - i] ?? 0;
    if (coeff === 0 && i > 0) continue;
    if (i === 0) {
      terms.push(String(coeff));
    } else if (i === 1) {
      terms.push(`${coeff}*x`);
    } else {
      terms.push(`${coeff}*x^${i}`);
    }
  }
  return terms.join(' + ').replace(/\+ -/g, '- ');
}

function buildExponential(params: FunctionParams): string {
  const { a = 1, b = 1, c = 0 } = params.extra;
  return `${a}*exp(${b}*x) + ${c}`;
}

function buildLogarithmic(params: FunctionParams): string {
  const { a = 1, b = 1, c = 0 } = params.extra;
  return `${a}*ln(${b}*x + ${c})`;
}

function buildReciprocal(params: FunctionParams): string {
  const { a = 1, b = 1, c = 0 } = params.extra;
  return `${a}/(x - ${b}) + ${c}`;
}

function buildGaussian(params: FunctionParams): string {
  const { a = 1, b = 0, c = 1 } = params.extra;
  return `${a}*exp(-(x-${b})^2/(2*${c}^2))`;
}

function buildRational(params: FunctionParams): string {
  const { n2 = 1, n1 = 0, n0 = 0, d2 = 1, d1 = 0, d0 = 1 } = params.extra;
  const num = `${n2}*x^2 + ${n1}*x + ${n0}`.replace(/\+ -/g, '- ');
  const den = `${d2}*x^2 + ${d1}*x + ${d0}`.replace(/\+ -/g, '- ');
  return `(${num})/(${den})`;
}
