# GraphViz — Funktions-Explorer

Math function graphing + calculus analysis tool. Single-page app, German UI.

**Stack:** TypeScript 5, Vite 6, SCSS, HTML Canvas 2D. Zero runtime deps.

---

## 2. Directory Layout

```
src/
├── main.ts                         Entry: wires Controls → GraphCanvas → updateGraph()
├── math/
│   ├── types.ts                    Expr AST, FunctionType, FunctionPreset, FunctionParams
│   ├── parser.ts                   Recursive descent parser → Expr AST
│   ├── evaluator.ts                Expr eval with call table (sin, ln, exp, …)
│   ├── differentiate.ts            Symbolic differentiation (power, product, quotient, chain)
│   ├── simplify.ts                 Constant folding + identity elimination
│   ├── calculus.ts                 Zero/extrema/inflection via 4000-sample scan + Newton refine
│   ├── function-builder.ts         Builds computer-style expression string from FunctionParams
│   ├── presets.ts                  7 function presets
│   └── index.ts                    Barrel re-export
├── render/
│   ├── canvas.ts                   GraphCanvas: rAF loop, mouse/touch interaction, HUD
│   ├── camera.ts                   Pan/zoom/transform, world↔screen, smooth animateTo
│   ├── grid.ts                     Grid lines, axes, labels
│   ├── plot.ts                     FunctionPlotter: samples + draws polylines with glow
│   ├── markers.ts                  POI markers (max/min/inflection/zero)
│   └── animation.ts                Tweening utilities
├── ui/
│   ├── controls.ts                 Left panel: preset buttons, sliders, pro input, formula display
│   ├── derivative-toggles.ts       Right panel toggle switches for f1/f2/f3 + helpers/labels
│   ├── info-panel.ts               Point-of-interest list with hover highlight
│   └── theme-toggle.ts             Dark/light switch
└── style/
    ├── main.scss                   Entry, imports partials
    ├── _variables.scss             All design tokens (spacing, radii, fonts, theme colors)
    ├── _themes.scss                CSS custom properties via %theme-dark / %theme-light placeholders
    ├── _components.scss            All component styles
    └── _typography.scss            Base font, headings, mono
```

---

## 3. Data Flow

```
controls.ts onChange()
  → main.ts onFunctionChanged()
    → Parser.parse(exprStr) → Expr AST
    → differentiate(f) → f1/f2/f3 ASTs
    → analyzeFunction() → POI arrays
    → setConfig() on GraphCanvas
    → infoPanel.update()
  ← GraphCanvas renders every rAF frame
```

Camera resets (`resetCamera() + setInitialScale()`) every time controls fire `onChange`. Pro-tip: zoom/pan state is lost on param edit.

---

## 4. Key Systems

### 4.1 Function Display & Syntax Highlighting

**File:** `src/ui/controls.ts` — `formatExpression(raw: string): string`

Converts computer-style math (`1*x^3 + -3*x^2 + 0*x + 2`) to human-readable syntax-highlighted HTML (`x³ − 3x² + 2` with colored spans).

**Pipeline order (must stay this order):**

1. **HTML escape** — `&` `&lt;` `&gt;`
2. **Strip trivial coefficients** — `*1` before letters, `^1*` at start, `0*var`, `+ 0` terms
3. **Normalize signs** — `+ -` → `- `
4. **Implied multiplication** — `(\d)\*` → `$1`, `\*([a-zA-Zπ])` → `$1`, `)*` → `)`, `*(` → `(`, remaining `*` → `·` (middle dot)
5. **Humanise functions** — `exp(` → `e^(`, `\bpi\b` → `π`
6. **Superscripts** — `^(\d+)` → Unicode superscripts via `SUPERSCRIPT_MAP`
7. **Tokenize & colourise** — regex alternation matches functions → `math-fn`, numbers → `math-num`, letters(e/π) → `math-const`, letters(other) → `math-var`, operators → `math-op`, parens → `math-paren`, catch-all → raw text

**Token regex (in order):**
```
/(sin|cos|tan|ln|exp|sqrt|abs|log|sinh|cosh|tanh|arcsin|arccos|arctan|lg)\b
 |(\d+\.?\d*)
 |([a-zA-Zπ])
 |([+\-−^=×÷/·])
 |([()])
 |(.)/g
```

**CSS classes** (`_components.scss`):
```scss
.math-fn     { color: var(--accent);      font-weight: 600; }
.math-num    { color: var(--f2-color); }
.math-var    { color: var(--text-bright);  font-weight: 600; }
.math-op     { color: var(--text-dim); }
.math-paren  { color: var(--text-dim); }
.math-const  { color: var(--f-color);      font-weight: 600; }
.math-sup    { font-size: 0.7em; vertical-align: super; }
```

**Called from:** `Controls.updateFormulaDisplay()` — sets `formulaText.innerHTML` for both custom expr and built expressions.

### 4.2 Preset Buttons

**Data:** `src/math/presets.ts` — `PRESETS: FunctionPreset[]`

```typescript
interface FunctionPreset {
  id: string;          // 'poly3' | 'poly4' | 'gaussian' | …
  label: string;       // 'x³ − 3x² + 2'
  type: FunctionType;  // 'polynomial' | 'exponential' | …
  params: Record<string, number>;
  paramOrder?: string[];
  expr: string;        // '1*x^3 + -3*x^2 + 0*x + 2' (raw computer form)
  description?: string; // 'Polynom 3. Grades — Klassiker'
}
```

**DOM structure** (created in `setupPresets()`):
```html
<button class="preset-btn" title="Polynom 3. Grades — Klassiker">
  <span class="preset-btn__dot preset-btn__dot--polynomial"></span>
  <span class="preset-btn__content">
    <span class="preset-btn__label">x³ − 3x² + 2</span>
    <span class="preset-btn__desc">Polynom 3. Grades — Klassiker</span>
  </span>
</button>
```

**Type dot color classes:**

| Type | Class | CSS var |
|------|-------|---------|
| polynomial | `--polynomial` | `--f-color` (green) |
| exponential | `--exponential` | `--accent` (blue) |
| logarithmic | `--logarithmic` | `--f3-color` (orange) |
| gaussian | `--gaussian` | `--math-cyan` ($06b6d4 / $0891b2) |
| rational | `--rational` | `--inflection-color` (amber) |
| reciprocal | `--reciprocal` | `--f2-color` (pink) |

**Active state:** `loadPreset()` adds `.preset-btn--active` to the clicked button and removes it from all others. Active state is cleared on pro-input apply via `clearPresetActive()`.

**Hover:** Border glows with accent + `box-shadow: 0 0 16px rgba(74,158,255,0.08)`. Label turns accent, description brightens to `--text`.

**Responsive:** Tablet (≤1024px) — grid layout 3 columns, buttons center-aligned. Phone (≤768px) — 2 columns.

**Important:** When a preset is clicked, `loadPreset()` rebuilds params — for non-polynomial types, `params.extra = { ...preset.params }` is set directly. The preset's `expr` string is only used if `type === 'custom'`. This means the label and the actual rendered function can differ if params don't match the label (e.g., logarithmic preset `c: -1` renders `ln(x-1)` but label says `ln(x+1)`).

### 4.3 Theme & Color System

**Architecture:**

1. **`_variables.scss`** — SCSS variables for ALL values. Two complete sets: `$dark-*` and `$light-*`. Also spacing, radii, fonts, layout dimensions, z-layers, transitions, breakpoints.

2. **`_themes.scss`** — Two placeholder selectors (`%theme-dark`, `%theme-light`) that map SCSS vars → CSS custom properties. Applied via `.theme-dark` / `.theme-light` classes. `:root` defaults to dark.

3. **`ThemeToggle`** flips `classList` on `<html>` between `theme-dark` ↔ `theme-light`.

**CSS custom property inventory:**

| Property | Dark value | Light value | Used for |
|----------|-----------|-------------|----------|
| `--bg` | `#080c24` | `#f7f5f0` | Canvas background |
| `--bg-panel` | `rgba(13,20,48,.88)` | `rgba(247,245,240,.92)` | Panel glass bg |
| `--bg-input` | `rgba(255,255,255,.06)` | `rgba(0,0,0,.06)` | Input/display bg |
| `--border` / `--border-hover` | Blue-tinted | Gray-tinted | All borders |
| `--text` | `#c8d0e0` | `#1a2332` | Body text |
| `--text-dim` | `rgba(200,208,224,.5)` | `rgba(26,35,50,.55)` | Dim text, operators |
| `--text-bright` | `#e8ecf4` | `#0d1117` | Variables, bright text |
| `--accent` | `#4a9eff` | `#0047b3` | Interactive accent, function names |
| `--f-color` | `#00ff88` | `#008751` | Main function curve, constants |
| `--f1-color` | `#4a9eff` | `#0047b3` | f′(x) derivative |
| `--f2-color` | `#ff6b9d` | `#b3245a` | f″(x) derivative, numbers in formula |
| `--f3-color` | `#ffb347` | `#cc7700` | f‴(x) derivative, log preset dot |
| `--max-color` | `#ff4757` | `#c0392b` | Maximum marker |
| `--min-color` | `#2ed573` | `#00855e` | Minimum marker |
| `--inflection-color` | `#ffa502` | `#cc5500` | Inflection marker, rational dot |
| `--zero-color` | `#747d8c` | `#555` | Zero marker |
| `--math-purple` | `#a855f7` | `#9333ea` | Damped preset dot |
| `--math-cyan` | `#06b6d4` | `#0891b2` | Gaussian preset dot |
| `--math-glow` | `0 0 12px rgba(0,255,136,.15)` | `0 0 12px rgba(0,135,81,.12)` | Formula glow |
| `--backdrop` | `blur(16px)` | `blur(16px)` | Glassmorphism |

**SCSS variable prefix convention:** `$dark-*` / `$light-*` for colors, `$space-*`, `$radius-*`, `$font-*`, `$bp-*`, `$z-*`, `$transition-*` for tokens.

### 4.4 Plot Rendering

**File:** `src/render/plot.ts` — `FunctionPlotter`

**Sampling:**
```
numSamples = Math.ceil(canvasWidth / SAMPLE_RESOLUTION)   // SAMPLE_RESOLUTION = 2
step = (xMax - xMin) / numSamples
```

Samples every 2 pixels across the visible x-range. For a 1000px canvas → 500 samples.

**NaN / Infinity handling:**
- `!Number.isFinite(y)` → pushes NaN marker (if points exist) to break the path, then `continue`
- `evaluate()` throws → same NaN marker logic
- Historical: removed `Math.abs(y) > 1e6` check — canvas clips naturally, and asymptote values like ln(1e-200) ≈ -460 should be drawn

**drawPath()** — rewritten with while-loops for robust segment isolation:
```typescript
while (i < points.length) {
  while (i < points.length && !isFinite(points[i].y)) i++;  // skip NaNs
  if (i >= points.length) break;
  moveTo(points[i].x, points[i].y);                          // start new subpath
  i++;
  while (i < points.length && isFinite(points[i].y)) {
    lineTo(points[i].x, points[i].y);                        // draw valid segment
    i++;
  }
}
```

**Glow effect:**
- Drawn FIRST, below the main line
- `globalAlpha = 0.2`, `lineWidth = 6px / camera.scale`, `lineJoin = 'round'`, `lineCap = 'butt'`
- `lineCap: 'butt'` is deliberate: with `'round'`, each NaN path break creates a 6px glow dot that wobbles during zoom (asymptote flicker fix)

**Main line:**
- `lineWidth = 2.5px / camera.scale`, `lineJoin = 'round'`, `lineCap = 'round'`
- Optional `dash` array for derivatives: f1=`[8,4]`, f2=`[2,6]`, f3=`[8,4,2,4]`

**Camera transform:**
```
ctx.transform(scale, 0, 0, -scale, w/2 - offsetX*scale, h/2 + offsetY*scale)
```
All points are in world coordinates; transform handles screen mapping.

**Derivative rendering:** Same plotter, same options except dashed style and lower opacity (0.85).

### 4.5 Math Engine

**Parser** (`parser.ts`): Recursive descent. Tokens: numbers, identifiers (`sin` etc.), operators (`+ - * / ^`), parens, constants (`pi`, `e`). Throws `ParseError` on invalid input.

**Evaluator** (`evaluator.ts`): Walks Expr AST with variable map. Call table maps string names to JS functions. Division by zero returns ±Infinity or NaN. Negative base ^ non-integer = NaN.

**Differentiator** (`differentiate.ts`): Symbolic. Handles power rule, product rule, quotient rule, chain rule, derivatives of all trig/hyperbolic/exp/log. Returns new Expr AST.

**Simplifier** (`simplify.ts`): Constant folding (both operands are numbers → eval), identity elimination (x+0=x, x*1=x, x^0=1, x^1=x, 0/x=0, x/x=1, etc.).

**Calculus** (`calculus.ts`):
- 4000 sample points across domain +10% pad
- Zero: detect sign change → bisection (80 iters) → Newton refinement (30 iters, tol 1e-10)
- Extrema: find critical points via f1 sign change → 2nd derivative test
- Inflection: find f2 sign change → verify f3 ≠ 0

**Function builders** (`function-builder.ts`):
- `buildExpression(params)` → computer-style string (e.g., `2*ln(1*x + -1)`)
- Separate builder per type: `buildPolynomial`, `buildExponential`, `buildLogarithmic`, etc.
- `buildDefaultParams(type)` returns initial slider state
- `buildParamList(params)` returns parameter label array for slider UI

---

## 5. Key Gotchas

- **`formatExpression` step order matters:** replace `exp(` → `e^(` BEFORE `^` digits → superscripts. Otherwise `exp(2)` becomes `e` + `^(2)` and the `^2` gets converted to superscript inside the paren expression.
- **Logarithmic preset params vs label:** preset `c: -1` produces `ln(x-1)` but label says `ln(x+1)`. The label is decorative; the actual expression comes from `buildLogarithmic(params)`.
- **NaN path breaks + `lineCap`:** With `lineCap: 'round'`, every NaN break creates a visible round cap dot. The glow uses `'butt'` to avoid a 6px wobbling dot at asymptotes. Main line keeps `'round'` (2.5px, barely visible).
- **Camera resets on every param change:** `controls.onChange` → `graph.resetCamera()` + `setInitialScale()`. Zoom/pan state is lost whenever sliders or type select change.
- **Token regex alternation order:** Short function names (`sin`) must come after longer ones (`sinh`) to avoid partial matches. Current order is safe because `\b` word-boundary prevents `sin` from matching inside `sinh`.
- **No `isFinite` on x in drawPath:** Only `y` is checked. `x` is always finite (derived from linear interpolation of finite xMin/xMax).
- **Server-side rendering note:** `formatExpression` produces HTML with `.math-*` classes. These must be accompanied by the corresponding CSS. The function does NOT handle fractions or matrix notation.
