# Math Graph Visualizer — Funktions-Explorer

Interactive math function graphing tool with symbolic differentiation, curve analysis, and integral visualization.

## Quick Start

```bash
npm install   # install dependencies (no runtime deps needed)
npm run dev   # start dev server → http://localhost:5173
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm test` | Run all tests (Vitest) |
| `npm run lint` / `npm run typecheck` | TypeScript type-check only |
| `npm run format` | Format code with Prettier |

## Usage

- **Function presets** — pick a function family from the left panel (polynomial, trigonometric, exponential, etc.)
- **Parameters** — adjust sliders to modify the function in real time
- **Analysis toggles** — show/hide 1st–3rd derivatives and the integral on the right panel
- **Interactive canvas** — pan by dragging, zoom with scroll, hover for coordinates
- **Zoom fit** — click the ◎ button to reset the view
- **Dark/light theme** — toggle via the moon/sun icon in the header
- **Curve discussion** — zeroes, extrema, and inflection points are computed and displayed automatically
