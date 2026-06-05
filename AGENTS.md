# AGENTS.md — Quick Reference

**Project:** GraphViz — Math Function Graphing Tool (German UI)
**Stack:** TypeScript 5, Vite 6, Vitest 3, SCSS, HTML Canvas 2D
**Runtime Dependencies:** None

---

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm test` | Run all tests (Vitest) |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm build` | Type check + build |
| `pnpm lint` / `pnpm typecheck` | TypeScript type check only |
| `pnpm dev` | Start dev server |
| `pnpm format` | Prettier format |

---

## Test Coverage Status (as of May 2026)

| File | Status | Test File |
|------|--------|-----------|
| `parser.ts` | ✅ Full | `parser.test.ts` (15 tests) |
| `differentiate.ts` | ✅ Full | `differentiate.test.ts` (38 tests) |
| `calculus.ts` | ✅ Full | `calculus.test.ts` (36 tests) |
| `simplify.ts` | ✅ NEW | `simplify.test.ts` (56 tests) |
| `evaluator.ts` | ✅ NEW | `evaluator.test.ts` (45 tests) |
| `function-builder.ts` | ✅ NEW | `function-builder.test.ts` (26 tests) |
| `animation.ts` | ✅ NEW | `animation.test.ts` (22 tests) |
| `format.ts` | ✅ Extended | `format.test.ts` (28 tests) |
| `presets.ts` | ⚠️ Partial | Tested via function-builder |
| `render/*` | ⚠️ No tests | DOM/Canvas dependent |
| `ui/*.ts (except format.ts)` | ⚠️ No tests | DOM dependent |

**Total:** 264+ tests across 8 test files

---

## Test Writing Patterns

### Standard Helper Pattern
```typescript
import { describe, it, expect } from 'vitest';
import { Parser } from './parser';
import { evaluate } from './evaluator';

function evalAt(input: string, x: number): number {
  const expr = Parser.parse(input);
  return evaluate(expr, { x });
}

describe('ModuleName', () => {
  it('description', () => {
    expect(evalAt('x^2', 3)).toBe(9);
  });
});
```

### Floating Point Comparison
```typescript
expect(result).toBeCloseTo(expected);  // default precision
expect(result).toBeCloseTo(expected, 5);  // 5 decimal places
```

### When to Skip / Be Careful
- Functions that call `performance.now()` (TweenController)
- DOM/Canvas dependent code
- Logarithmic/reciprocal at x values outside domain

---

## Priority Order for Changes

1. **Math Engine (Highest Priority)**
   - `src/math/parser.ts` — recursive descent parser
   - `src/math/differentiate.ts` — symbolic differentiation
   - `src/math/simplify.ts` — constant folding + identities
   - `src/math/evaluator.ts` — AST evaluation
   - `src/math/calculus.ts` — zero/extrema/inflection finding

2. **Pure UI Utilities**
   - `src/ui/format.ts` — formula formatting
   - `src/render/animation.ts` — easing functions

3. **DOM/Canvas Dependent (Lowest)**
   - Everything in `src/render/` except animation.ts
   - `src/ui/controls.ts`, `theme-toggle.ts`, etc.

---

## Known Edge Cases to Test

**Simplifier Identities (already covered):**
- x + 0, 0 + x, x - 0, x - x
- x * 0, 0 * x, x * 1, 1 * x, x * -1, -1 * x
- x / 1, 0 / x, x / x
- x ^ 0, x ^ 1, 0 ^ x, 1 ^ x

**Evaluator Edge Cases (already covered):**
- 5 / 0 = Infinity, -5 / 0 = -Infinity, 0 / 0 = NaN
- (-2) ^ 0.5 = NaN (negative ^ non-integer)
- All 22 call table functions (sin, cos, tan, atan2, etc.)

**Differentiator Edge Cases (already covered):**
- Quotient rule: d/dx [f/g]
- Chain rule: d/dx [f^g] general case
- Constant^x: d/dx [2^x] = 2^x * ln(2)
- All function derivatives (asin, acos, atan, sinh, cosh, tanh, log2, log10, sqrt, abs)
- Differentiation wrt variables other than x

---

## Key Gotchas (from opencode.md)

1. `formatExpression` step order: `exp(` → `e^(` BEFORE `^` digits → superscripts
2. NaN path breaks + `lineCap`: glow uses `'butt'` not `'round'` to avoid asymptote flicker
3. Camera resets on every param change
4. Token regex: short function names after longer ones OR use word boundary `\b`

---

## File Structure Quick Reference

```
src/
├── math/           # PURE LOGIC — ALWAYS TEST THESE FIRST
│   ├── parser.ts
│   ├── evaluator.ts
│   ├── differentiate.ts
│   ├── simplify.ts
│   ├── calculus.ts
│   ├── function-builder.ts
│   └── presets.ts
├── render/
│   ├── animation.ts  # PURE — testable
│   ├── camera.ts     # uses performance.now()
│   ├── grid.ts       # Canvas-dependent
│   ├── plot.ts       # Canvas-dependent
│   ├── markers.ts    # Canvas-dependent
│   └── canvas.ts     # Main class
└── ui/
    ├── format.ts     # PURE — testable
    └── *.ts          # DOM-dependent
```

---

## When Adding Tests

1. **Create test file** with same name: `foo.ts` → `foo.test.ts`
2. **Put it in same directory** as the source
3. **Use existing patterns** from nearby test files
4. **Run `pnpm test`** before committing
5. **Run `pnpm lint`** (type check) before committing

---

## Bugs Discovered During Test Writing

**Differentiator bug (tan/tanh):** `pow(f, 2)` evaluates as `cos(x^2)` not `cos^2(x)`

In `differentiate.ts`:
```typescript
// Current (BUG: cos applied first, then squared)
case 'tan':
  return mul(div(one, call('cos', pow(f, 2))), df);
// Should be: cos(f) squared, not cos(f squared)
// Should: call('cos', f) then pow that result by 2
```

This affects `tan(x)` and `tanh(x)` derivatives. Tests skipped for these.
