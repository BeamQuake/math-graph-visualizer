import './style/main.scss';

import { Parser, differentiate, simplify, analyzeFunction, buildExpression } from './math';
import type { Expr, DerivativeInfo, PointOfInterest, ThemeColors, ThemeMode, FunctionParams } from './math/types';

import { GraphCanvas } from './render/canvas';
import type { GraphConfig } from './render/canvas';

import { ThemeToggle } from './ui/theme-toggle';
import { DerivativeToggles } from './ui/derivative-toggles';
import { InfoPanel } from './ui/info-panel';
import { Controls } from './ui/controls';
import { PencilViz } from './ui/water-viz';

let fExpr: Expr | null = null;
let derivatives: DerivativeInfo[] = [
  { order: 1, visible: false, expr: null },
  { order: 2, visible: false, expr: null },
  { order: 3, visible: false, expr: null },
];
let points: PointOfInterest[] = [];
let currentTheme: ThemeMode = 'dark';
let showHelpers = false;
let showLabels = true;
let showIntegral = false;

function getThemeColors(mode: ThemeMode): ThemeColors {
  if (mode === 'dark') {
    return {
      bg: '#080c24',
      gridMajor: 'rgba(26,35,96,0.75)',
      gridMinor: 'rgba(18,26,69,0.65)',
      axes: 'rgba(74,111,165,0.65)',
      f: '#00ff88',
      f1: '#4a9eff',
      f2: '#ff6b9d',
      f3: '#ffb347',
      max: '#ff4757',
      min: '#2ed573',
      inflection: '#af7ac5',
      zero: '#747d8c',
      text: '#c8d0e0',
      textDim: 'rgba(200,208,224,0.5)',
    };
  }

  return {
    bg: '#f7f5f0',
    gridMajor: 'rgba(0,0,0,0.2)',
    gridMinor: 'rgba(0,0,0,0.12)',
    axes: 'rgba(26,35,50,0.65)',
    f: '#008751',
    f1: '#0047b3',
    f2: '#b3245a',
    f3: '#cc7700',
    max: '#c0392b',
    min: '#00855e',
    inflection: '#8e44ad',
    zero: '#555555',
    text: '#1a2332',
    textDim: 'rgba(26,35,50,0.55)',
  };
}

const canvas = document.getElementById('graph-canvas') as HTMLCanvasElement;
const graph = new GraphCanvas(canvas);

new ThemeToggle((mode) => {
  currentTheme = mode;
  updateGraph();
});

const derivToggles = new DerivativeToggles();
derivToggles.onChange((state) => {
  derivatives[0].visible = state[1];
  derivatives[1].visible = state[2];
  derivatives[2].visible = state[3];
  updateGraph();
});

derivToggles.onHelpersChange((on) => {
  showHelpers = on;
  updateGraph();
});

derivToggles.onLabelsChange((on) => {
  showLabels = on;
  updateGraph();
});

derivToggles.onIntegralChange((on) => {
  showIntegral = on;
  updateGraph();
});

const infoPanel = new InfoPanel();
let highlightedPoint = -1;
infoPanel.onHighlight((idx) => {
  highlightedPoint = idx ?? -1;
  updateGraph();
});
const controls = new Controls();
controls.onChange((state) => {
  onFunctionChanged(state.params);
});

function onFunctionChanged(params: FunctionParams): void {
  const state = controls.getState();
  const exprStr = state.type === 'custom' && state.customExpr
    ? state.customExpr
    : buildExpression(params);

  if (!exprStr) {
    fExpr = null;
    derivatives = derivatives.map((d) => ({ ...d, expr: null }));
    points = [];
    updateGraph();
    return;
  }

  try {
    fExpr = Parser.parse(exprStr);

    const f1 = simplify(differentiate(fExpr));
    const f2 = simplify(differentiate(f1));
    const f3 = simplify(differentiate(f2));

    derivatives = [
      { order: 1, visible: derivatives[0].visible, expr: f1 },
      { order: 2, visible: derivatives[1].visible, expr: f2 },
      { order: 3, visible: derivatives[2].visible, expr: f3 },
    ];

    const result = analyzeFunction(fExpr, f1, f2, f3, -200, 200);

    points = [...result.zeros, ...result.extrema, ...result.inflectionPoints];
    updateGraph();
  } catch (e) {
    console.warn('Failed to parse:', exprStr, e);
    fExpr = null;
    derivatives = derivatives.map((d) => ({ ...d, expr: null }));
    points = [];
    updateGraph();
  }
}

function updateGraph(): void {
  const colors = getThemeColors(currentTheme);

  const config: GraphConfig = {
    fExpr,
    derivatives,
    pointsOfInterest: points,
    showHelpers,
    showLabels,
    integralEnabled: showIntegral,
    colors,
    highlightedPoint,
  };

  graph.setConfig(config);
  infoPanel.update(points, colors);

  const zoomBtn = document.getElementById('btn-zoom-fit');
  if (zoomBtn) (zoomBtn as HTMLButtonElement).disabled = points.length === 0;
}

document.getElementById('btn-zoom-fit')?.addEventListener('click', () => {
  if (points.length > 0) graph.animateToFit(points);
});

graph.setInitialScale();
graph.start();

const initialState = controls.getState();
onFunctionChanged(initialState.params);

new PencilViz(document.getElementById('water-viz')!);
