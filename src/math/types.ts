export type BinaryOp = '+' | '-' | '*' | '/' | '^';
export type UnaryOp = '+' | '-';

export type Expr =
  | { kind: 'number'; value: number }
  | { kind: 'variable'; name: string }
  | { kind: 'constant'; name: 'pi' | 'e' }
  | { kind: 'unary'; op: UnaryOp; arg: Expr }
  | { kind: 'binary'; op: BinaryOp; left: Expr; right: Expr }
  | { kind: 'call'; name: string; args: Expr[] };

export type FunctionType =
  | 'polynomial'
  | 'exponential'
  | 'logarithmic'
  | 'gaussian'
  | 'rational'
  | 'reciprocal'
  | 'custom';

export interface FunctionPreset {
  id: string;
  label: string;
  type: FunctionType;
  params: Record<string, number>;
  paramOrder?: string[];
  expr: string;
  description?: string;
}

export interface FunctionParams {
  type: FunctionType;
  order?: number;
  coeffs: number[];
  extra: Record<string, number>;
}

export interface PointOfInterest {
  kind: 'maximum' | 'minimum' | 'inflection' | 'zero';
  x: number;
  y: number;
}

export interface DerivativeInfo {
  order: 1 | 2 | 3;
  visible: boolean;
  expr: Expr | null;
}

export interface CameraState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface ThemeColors {
  bg: string;
  gridMajor: string;
  gridMinor: string;
  axes: string;
  f: string;
  f1: string;
  f2: string;
  f3: string;
  max: string;
  min: string;
  inflection: string;
  zero: string;
  text: string;
  textDim: string;
}

export type ThemeMode = 'dark' | 'light';
