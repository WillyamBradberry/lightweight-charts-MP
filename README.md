# MP Charts Toolkit

**MP Charts Toolkit** is a modular React wrapper (Workstation Shell) designed for building professional trading workstations. Built on top of `lightweight-charts v5`, it provides extended functionality including multi-chart layouts, 40+ drawing tools, bar replay mode, price alert systems, and real-time data integration (Binance).

---

## 🚀 Features

- **Multi-Chart Architecture**: Support for up to 4 independent charts within a single layout.
- **Drawing Tools**: Seamless integration of `lightweight-charts-line-tools` (TrendLines, Fibonacci, Rectangles, etc.).
- **Replay Mode**: Strategy testing on historical data with speed control (fast-forward/rewind).
- **Real-time Data**: Adapter for Binance WebSocket/REST API.
- **Alert System**: Price alert management with `localStorage` persistence and chart synchronization.
- **Indicators**: Extensible indicator system (currently supports SMA, EMA).

---

## 🏗 Architecture

The project is divided into several layers to ensure scalability and maintainability:

```text
┌───────────────────────────────────────┐
│  WORKSTATION SHELL                    │
│  (App.jsx -> Layout, Topbar, Toolbar) │
├───────────────────────────────────────┤
│  ORCHESTRATOR                         │
│  (useMultiChart, useWatchlist, etc.)  │
├───────────────────────────────────────┤
│  CHART ENGINE                         │
│  (ChartComponent.jsx + Hooks)         │
├───────────────────────────────────────┤
│  PLUGIN LAYER                         │
│  (line-tools.js / PluginAdapter)      │
└───────────────────────────────────────┘
```

### Current Development Status (Refactoring Plan)
The project is currently in **Phase 1-2** of the refactoring roadmap:
1. Decomposing `App.jsx` and `ChartComponent.jsx` into focused React Hooks (`useToast`, `useReplayMode`, `useAlerts`).
2. Implementing a `PluginAdapter` to isolate access to private plugin properties.
3. Phase 0 (Utility extraction) is completed.

---

## 📦 Usage & Integration

The module integrates into the parent application via the `ChartGrid` component.

### Props Interface (`ChartComponentProps`)

| Prop | Type | Description |
|------|------|-------------|
| `symbol` | `string` | Asset ticker (e.g., 'BTCUSDT') |
| `interval` | `string` | Timeframe ('1m', '4h', etc.) |
| `chartType` | `string` | Chart type ('candlestick', 'area', etc.) |
| `theme` | `'dark' \| 'light'` | UI Theme |
| `indicators` | `object` | Indicator settings `{ sma: boolean, ema: boolean }` |
| `activeTool` | `string \| null` | Active drawing tool ID |
| `isDrawingsLocked` | `boolean` | Lock drawings from editing |
| `onAlertsSync` | `function` | Callback to sync alerts with the plugin layer |

### Imperative Handle

The component supports imperative calls via a `ref`:

```typescript
interface ChartImperativeHandle {
  undo(): void;
  redo(): void;
  clearTools(): void;
  addPriceAlert(alert): void;
  removePriceAlert(externalId): void;
  toggleReplay(): void;
  getCurrentPrice(): number | null;
}
```

---

## ⚠️ Dependencies & Known Risks

1. **Drawing Plugin (`line-tools.js`)**: 
   - The `lightweight-charts-line-tools@4.1.1` plugin is currently vendored (located in `src/plugins/`).
   - **Critical**: Do not install this via npm alongside the main package to avoid a conflict with the `fancy-canvas` version.
2. **Data Provider**: 
   - Currently hard-coded to Binance API (`services/binance.js`). An abstraction layer is planned for future phases to allow mocking or alternative data sources.

---

## 📂 Project Structure

- `src/components/` — UI elements (Topbar, Toolbar, Layout).
- `src/components/Chart/` — Core charting logic (`ChartComponent`, `ChartGrid`).
- `src/hooks/` — Extracted business logic (Refactoring in progress).
- `src/plugins/line-tools/` — Vendored drawing plugin.
- `src/utils/` — Utilities, indicator math, and helpers.
- `docs/` — Detailed architectural documentation and refactoring plans.

---

## Quick Start

1. **Clone the repo**:
   ```bash
   git clone https://github.com/crypt0inf0/lightweight-chart.git
   cd lightweight-chart
   ```

2. **Install dependencies**:
   ```bash
   npm install

## Quick start

- Clone the repo:

```bash
git clone https://github.com/WillyamBradberry/lightweight-charts-MP.git
```

- Change into the project directory:

```bash
cd lightweight-chart
```

- Install dependencies:

```bash
npm install
```

- Build for production:

```bash
npm run build
```

- Run the dev server:

```bash
npm run dev
```

You can also preview a production build locally with:

```bash
npm run preview
```

## Screenshot

![App screenshot](./chart.png)
## Credit 


## License

MIT
