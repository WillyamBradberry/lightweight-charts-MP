# Subsystem Map — MP Charts Toolkit

## Overview

The MP Charts Toolkit is an embeddable React-based charting subsystem built on top of `lightweight-charts`. It provides a full-featured trading chart UI including drawing tools, indicators, multi-chart layouts, replay mode, alerts, and watchlist management. This document maps the high-level module structure, subsystem responsibilities, and integration surfaces.

---

## 1. Chart Core

**Location:** `src/components/Chart/`

### Components

| Component | Lines | Responsibility |
|---|---|---|
| `ChartComponent.jsx` | 2182 | Core chart lifecycle: `lightweight-charts` bridge, data loading, real-time updates, indicator series, replay mode, line tool manager integration, theme, OHLC header, crosshair handling |
| `ChartGrid.jsx` | 56 | Multi-chart layout manager: distributes per-chart props across `ChartComponent` instances based on layout configuration |

### Subsystem Responsibilities

- Create/destroy `lightweight-charts` instances
- Manage series lifecycle (candlestick, bar, line, area, baseline, heikin-ashi)
- Transform OHLC data per chart type
- Coordinate space: logical/physical coordinate conversions
- Expose imperative handle via `useImperativeHandle` for parent orchestration

### Integration Surface

- Props interface: `symbol`, `interval`, `chartType`, `indicators`, `activeTool`, `theme`, `comparisonSymbols`, `isLogScale`, `isAutoScale`, `magnetMode`, `isDrawingsLocked`, `isDrawingsHidden`, `isTimerVisible`
- Callbacks: `onToolUsed`, `onAlertsSync`, `onAlertTriggered`, `onReplayModeChange`
- Imperative ref: `undo()`, `redo()`, `clearTools()`, `addPriceAlert()`, `removePriceAlert()`, `restartPriceAlert()`, `getCurrentPrice()`, `getChartContainer()`, `toggleTimer()`, `toggleReplay()`, `resetZoom()`

---

## 2. Rendering Pipeline

**Location:** `src/components/Chart/ChartComponent.jsx`

### Data Flow

```
Binance REST API ──> getKlines() ──> dataRef ──> transformData() ──> series.setData()
Binance WebSocket ──> subscribeToTicker() ──> real-time candle update ──> series.update()
```

### Key Mechanisms

- **Chart creation**: singleton `useEffect([], [])` — created once on mount
- **Series creation**: `useEffect` keyed on `[chartType, symbol]` — recreates main series when type changes
- **Data loading**: `useEffect` keyed on `[symbol, interval]` — fetches klines, sets up WS
- **Re-render triggers**: RAF loop for axis label, `ResizeObserver` for container resize, crosshair subscription
- **Replay mode**: alternative data pipeline using `fullDataRef` slice + `setData()` on each frame

---

## 3. Overlays (Drawing / Line Tools)

**Location:** `src/plugins/line-tools/`

### Files

| File | Lines | Responsibility |
|---|---|---|
| `line-tools.js` | unknown (bin) | Compiled plugin: drawing primitives library (TrendLine, Fibonacci, Rectangle, Text, etc.) |
| `line-tools.css` | unknown | Plugin styling |
| `line-tools.d.ts` | unknown | TypeScript declarations |

### Integration Points

- `LineToolManager` class wrapped by `ChartComponent` via `series.attachPrimitive()`
- Over 30 drawing tool types mapped in `TOOL_MAP`
- Alert bridge: `_userPriceAlerts` primitive exposes `alertsChanged()` and `alertTriggered()` subscriptions
- Window globals: `window.lineToolManager`, `window.chartInstance`, `window.seriesInstance`

### Subsystem Responsibilities

- Drawing tool activation/deactivation
- Undo/redo stack for drawings
- Lock/hide drawings toggle
- Price alert markers on chart

---

## 4. Indicators

**Location:** `src/utils/indicators/`

### Files

| File | Lines | Responsibility |
|---|---|---|
| `index.js` | 8 | Re-export barrel |
| `sma.js` | 27 | Simple Moving Average (20-period) |
| `ema.js` | 33 | Exponential Moving Average (20-period) |

### Current Limitations

- Only 2 indicators (SMA 20, EMA 20)
- Hard-coded periods
- No indicator configuration UI
- No custom indicators API
- Tightly coupled to `ChartComponent` — no independent indicator engine

---

## 5. Toolbar System

**Location:** `src/components/Toolbar/`

### Components

| Component | Lines | Responsibility |
|---|---|---|
| `DrawingToolbar.jsx` | 310 | Left toolbar with grouped drawing tools: cursor, lines, fibonacci, shapes, text, patterns, predictions, zoom, timer, lock, visibility |
| `RightToolbar.jsx` | 40 | Right panel toggle: Watchlist / Alerts |
| `ToolGroup.jsx` | 93 | Reusable group component with popover sub-tool selector |
| `ToolIcons.jsx` | 368 | SVG icon set (28 drawing tool icons, TradingView-compatible style) |

### Tool Groups (DrawingToolbar)

| Group | Tools |
|---|---|
| cursor_group | Cross, Eraser |
| lines_group | Trend Line, Arrow, Ray, Extended Line, Horizontal Ray, Horizontal, Vertical, Cross Line |
| fib_group | Fib Retracement, Trend-Based Fib Extension |
| shapes_group | Brush, Highlighter, Rectangle, Circle, Triangle, Path |
| text_group | Text, Callout, Price Label |
| patterns_group | Elliott Impulse Wave, Elliott Correction Wave, Head & Shoulders |
| prediction_group | Long Position, Short Position, Date Range, Price Range, Date & Price Range |
| measure_group | Measure |
| zoom_group | Zoom In (+ conditional Zoom Out) |
| timer_group | Show Timer |
| lock_group | Lock All Drawings |
| visibility_group | Hide All Drawings |
| delete_group | Remove Objects |

---

## 6. Topbar

**Location:** `src/components/Topbar/Topbar.jsx` (725 lines)

### Sections

| Section | Responsibility |
|---|---|
| Hamburger Menu | Placeholder for app menu |
| Symbol Search | Current symbol display + Compare/Add button |
| Timeframe Selector | Favorite intervals row + dropdown with sections (Ticks/Seconds/Minutes/Hours/Days/Custom + custom interval adder) |
| Chart Type Selector | Candles, Bars, Hollow Candles, Line, Area, Baseline, Heikin Ashi |
| Indicators | SMA/EMA toggle dropdown |
| Alert | Create price alert trigger |
| Replay | Enter/exit bar replay mode |
| Undo/Redo | Drawing undo/redo |
| Layout | Single/2/3/4 chart layout selector |
| Save | Save layout to localStorage |
| Theme Toggle | Dark/Light theme |
| Snapshot | Download image / Copy image to clipboard |
| Fullscreen | Full-screen chart toggle |

---

## 7. Dialogs & Panels

### Dialogs

| Component | Lines | Responsibility |
|---|---|---|
| `AlertDialog.jsx` | 70 | Modal for creating price alerts with condition select + value input |
| `SymbolSearch.jsx` | 119 | Full-screen modal: fetches Binance exchange info, filters/search, supports switch/compare/add modes |

### Panels

| Component | Lines | Responsibility |
|---|---|---|
| `Watchlist.jsx` | 215 | Reorderable, sortable, resizable-column watchlist with real-time price updates |
| `AlertsPanel.jsx` | 114 | Tabs: Alerts list (pause/resume/delete) + Log view |
| `BottomBar.jsx` | 80 | Time range presets (1D/5D/1M/3M/6M/YTD/1Y/5Y/All), timezone, log/auto/reset toggles |

### Toast / Notification

| Component | Lines | Responsibility |
|---|---|---|
| `Toast.jsx` | 31 | Error/Success/Info toast notification |
| `SnapshotToast.jsx` | 25 | Success-only banner with checkmark |

---

## 8. Layout & Page Structure

**Location:** `src/components/Layout/`

| Component | Lines | Responsibility |
|---|---|---|
| `Layout.jsx` | 42 | Grid layout manager: left toolbar, chart area, bottom bar, watchlist panel, options panel, right toolbar slots |
| `App.jsx` | 1179 | Root orchestrator: state management, side effects, localStorage persistence, WebSocket lifecycle |

### App.jsx Responsibilities (Mixed — primary coupling hotspot)

- Multi-chart state (layout, activeChartId, charts array)
- Watchlist data fetching + WebSocket subscription
- Alert CRUD + cross-reference with line-tools alerts
- Interval / timeframe management (favorites, custom intervals)
- Theme state + persistence
- Toast/snapshot state
- Drawing tool state (active tool, magnet mode, locking)
- Replay mode
- Layout save/load
- Image download/copy (html2canvas)
- Search mode (switch vs compare vs add)
- Scroll viewport visibility

---

## 9. State & Persistence

### React State

- **App.jsx**: centralized state via `useState` hooks — acts as orchestrator
- **ChartComponent.jsx**: local state for loading, OHLC data, axis label, replay mode
- **Component-level**: Watchlist sort, DrawingToolbar popover, Topbar dropdowns

### localStorage Keys

| Key | Purpose |
|---|---|
| `tv_interval` | Current interval |
| `tv_theme` | Dark/light |
| `tv_watchlist` | Symbol list |
| `tv_alerts` | Alert objects (24h retention) |
| `tv_alert_logs` | Alert history (24h retention) |
| `tv_fav_intervals_v2` | Favorite intervals |
| `tv_custom_intervals` | Custom intervals |
| `tv_last_nonfav_interval` | Last non-favorite interval |
| `tv_saved_layout` | Multi-chart layout config |
| `tv_drawing_templates` | Drawing templates |

---

## 10. Utilities

| File | Lines | Responsibility |
|---|---|---|
| `chartUtils.js` | 37 | Heikin-Ashi calculation |
| `coordinateHelpers.js` | 31 | Logical/physical coordinate conversion, anchor drawing |
| `TemplateManager.js` | 253 | Save/load/export/import drawing templates |
| `timeframes.js` | 27 | Interval string to seconds conversion |
| `indicators/sma.js` | 27 | SMA calculation |
| `indicators/ema.js` | 33 | EMA calculation |
| `indicators/index.js` | 8 | Barrel export |

---

## 11. Services (Data Integration)

| File | Lines | Responsibility |
|---|---|---|
| `binance.js` | 143 | REST API: `getKlines()`, `getTickerPrice()`; WebSocket: `subscribeToTicker()`, `subscribeToMultiTicker()`; Managed WebSocket with exponential backoff reconnection |

### Integration Surface

- Data provider is tightly coupled to Binance API
- No adapter/interface abstraction layer
- Hard-coded base URLs (`api.binance.com`, `stream.binance.com:9443`)
- No caching layer
- AbortController-based cancellation

---

## 12. Plugin System

**Location:** `src/plugins/line-tools/`

The line-tools plugin is a pre-compiled third-party or custom module providing:

- Drawing primitive rendering on lightweight-charts canvas
- `LineToolManager`: tool activation, undo/redo, locking, visibility
- `PriceScaleTimer`: candle countdown timer primitive
- `UserPriceAlerts`: inline price alert markers with alert trigger events

### Integration

- Loaded as a pre-built JS bundle (not source)
- Attached via `series.attachPrimitive(manager)`
- Accessed via `window.lineToolManager`, `window.chartInstance`, `window.seriesInstance` globals

---

## 13. Integration Points (Public API Candidates)

### Exposed Props Interface

All props flow **down** from App → ChartGrid → ChartComponent. No context/DI framework.

```
ChartComponentProps {
  symbol: string
  interval: string
  chartType: string
  indicators: { sma: boolean, ema: boolean }
  activeTool: string | null
  isLogScale: boolean
  isAutoScale: boolean
  magnetMode: boolean
  theme: 'dark' | 'light'
  comparisonSymbols: Array<{ symbol: string, color: string }>
  isToolbarVisible: boolean
  isDrawingsLocked: boolean
  isDrawingsHidden: boolean
  isTimerVisible: boolean
  onToolUsed: () => void
  onAlertsSync: (chartId, symbol, alerts) => void
  onAlertTriggered: (chartId, symbol, evt) => void
  onReplayModeChange: (chartId, isActive) => void
}
```

### Imperative Handle

```typescript
interface ChartImperativeHandle {
  undo(): void
  redo(): void
  clearTools(): void
  addPriceAlert(alert): void
  removePriceAlert(externalId): void
  restartPriceAlert(price, condition): void
  getCurrentPrice(): number | null
  getChartContainer(): HTMLElement
  toggleTimer(): boolean
  toggleReplay(): void
  resetZoom(): void
}