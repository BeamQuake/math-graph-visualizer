# Math Graph Visualizer — Funktions-Explorer

Interactive math function graphing tool with symbolic differentiation, curve analysis, and integral visualization.

## Quick Start

```bash
pnpm install   # install dependencies (no runtime deps needed)
pnpm dev       # start dev server → http://localhost:5173
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Type-check + production build → `dist/` |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run all tests (Vitest) |
| `pnpm lint` / `pnpm typecheck` | TypeScript type-check only |
| `pnpm format` | Format code with Prettier |

## Usage

- **Function presets** — pick a function family from the left panel (polynomial, trigonometric, exponential, etc.)
- **Parameters** — adjust sliders to modify the function in real time
- **Analysis toggles** — show/hide 1st–3rd derivatives and the integral on the right panel
- **Interactive canvas** — pan by dragging, zoom with scroll, hover for coordinates
- **Zoom fit** — click the ◎ button to reset the view
- **Dark/light theme** — toggle via the moon/sun icon in the header
- **Curve discussion** — zeroes, extrema, and inflection points are computed and displayed automatically
