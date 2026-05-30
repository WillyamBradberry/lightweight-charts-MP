# Extraction Plan — MP Charts Toolkit

## Overview

Phased refactor plan for modularizing the MP Charts Toolkit. The plan prioritizes safety (low-risk, isolated extractions first) while identifying high-risk areas that require careful handling. All extractions preserve existing behavior — no functional changes.

---

## Phase 0: Immediate Low-Risk Extractions

**Goal:** Establish module boundaries without touching business logic.
**Risk:** Very Low
**Estimated effort:** 1–2 days

### 0.1 Extract Helper Functions → `src/utils/helpers.js`

Move pure utility functions from `App.jsx` module scope:

```javascript
// src/utils/helpers.js
export const VALID_INTERVAL_UNITS = new Set(['s', 'm', 'h', 'd', 'w', 'M']);

export const isValidIntervalValue = (value) => { ... };
export const sanitizeFavoriteIntervals = (raw) => { ... };
export const sanitizeCustomIntervals = (raw) => { ... };
export const safeParseJSON = (value, fallback) => { ... };
export const formatPrice = (value) => { ... };
export const ALERT_RETENTION_MS = 24 * 60 * 60 * 1000;
```

**Impact:** Removes ~60 lines from App.jsx. No runtime change — pure function relocation.

### 0.2 Extract TOOL_MAP → `src/constants/toolMap.js`

Move the 55-line tool mapping from ChartComponent:

```javascript
// src/constants/toolMap.js
export const TOOL_MAP = {
  'cursor': 'None',
  'eraser': 'Eraser',
  'trendline': 'TrendLine',
  // ... all 40+ mappings
};
```

**Impact:** Removes ~44 lines from ChartComponent. No runtime change.

### 0.3 Extract Chart Options Factory → `src/utils/chartOptions.js`

Centralize the theme-dependent configuration objects:

```javascript
// src/utils/chartOptions.js
export const getChartOptions = (theme, magnetMode) => ({ ... });
export const getThemeOptions = (theme) => ({ layout, grid, crosshair, ... });
export const CANDLESTICK_STYLES = { upColor, downColor, ... };
```

**Impact:** Removes ~80 lines of duplicated option objects from ChartComponent effects. Single source of truth for theme styling.

### 0.4 Extract Dropdown Position Utilities → `src/utils/dropdownPosition.js`

Move shared `calculatePosition()` and `calculateSnapshotPosition()` from Topbar:

```javascript
export const calculatePosition = (ref) => { ... };
export const calculateSnapshotPosition = (ref) => { ... };
```

**Impact:** Removes ~20 lines from Topbar. Reusable across all dropdown menus.

---

## Phase 1: App.jsx Hook Extractions

**Goal:** Decompose App.jsx into focused custom hooks.
**Risk:** Low–Medium
**Estimated effort:** 3–5 days

### 1.1 Extract `useToast()` → `src/hooks/useToast.js`

```javascript
export function useToast() {
  const [toast, setToast] = useState(null);
  const [snapshotToast, setSnapshotToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const snapshotToastTimeoutRef = useRef(null);

  const showToast = (message, type = 'error') => { ... };
  const showSnapshotToast = (message) => { ... };

  // Cleanup effect
  useEffect(() => { ... cleanup ... }, []);

  return { toast, snapshotToast, showToast, showSnapshotToast };
}
```

**Impact:** Removes ~40 lines from App.jsx. Self-contained, no dependency on other App state.

### 1.2 Extract `useMultiChart()` → `src/hooks/useMultiChart.js`

```javascript
export function useMultiChart() {
  const [layout, setLayout] = useState(() => { ... localStorage ... });
  const [activeChartId, setActiveChartId] = useState(1);
  const [charts, setCharts] = useState(() => { ... localStorage ... });
  const chartRefs = useRef({});

  const activeChart = charts.find(c => c.id === activeChartId) || charts[0];
  const currentSymbol = activeChart.symbol;
  const currentInterval = activeChart.interval;

  const handleLayoutChange = (newLayout) => { ... };
  const handleSaveLayout = () => { ... };
  const handleSymbolChange = (symbol) => { ... };
  const handleIntervalChange = (newInterval) => { ... };

  return { layout, activeChartId, charts, chartRefs, activeChart,
           currentSymbol, currentInterval, setActiveChartId, setCharts,
           handleLayoutChange, handleSaveLayout, handleSymbolChange, handleIntervalChange };
}
```

**Impact:** Removes ~70 lines from App.jsx. Cleans up multi-chart orchestration.

### 1.3 Extract `useIntervals()` → `src/hooks/useIntervals.js`

```javascript
export function useIntervals(currentInterval, onIntervalChange) {
  const [favoriteIntervals, setFavoriteIntervals] = useState(() => { ... });
  const [customIntervals, setCustomIntervals] = useState(() => { ... });
  const [lastNonFavoriteInterval, setLastNonFavoriteInterval] = useState(() => { ... });

  const handleToggleFavorite = (interval) => { ... };
  const handleAddCustomInterval = (value, unit) => { ... };
  const handleRemoveCustomInterval = (intervalValue) => { ... };

  // Persistence effects
  useEffect(() => { ... }, [favoriteIntervals]);
  useEffect(() => { ... }, [customIntervals]);
  useEffect(() => { ... }, [lastNonFavoriteInterval]);

  return { favoriteIntervals, customIntervals, lastNonFavoriteInterval,
           setFavoriteIntervals, handleToggleFavorite,
           handleAddCustomInterval, handleRemoveCustomInterval };
}
```

**Impact:** Removes ~120 lines from App.jsx. Cleanly isolated domain.

### 1.4 Extract `useDrawingTools()` → `src/hooks/useDrawingTools.js`

```javascript
export function useDrawingTools() {
  const [activeTool, setActiveTool] = useState(null);
  const [isMagnetMode, setIsMagnetMode] = useState(false);
  const [showDrawingToolbar, setShowDrawingToolbar] = useState(true);
  const [isDrawingsLocked, setIsDrawingsLocked] = useState(false);
  const [isDrawingsHidden, setIsDrawingsHidden] = useState(false);
  const [isTimerVisible, setIsTimerVisible] = useState(false);

  const handleToolChange = (tool, chartRefs, activeChartId) => { ... };

  return { activeTool, isMagnetMode, showDrawingToolbar,
           isDrawingsLocked, isDrawingsHidden, isTimerVisible,
           setActiveTool, setShowDrawingToolbar, handleToolChange };
}
```

**Caveat:** `handleToolChange` currently calls `chartRefs.current[id].method()` directly. The hook needs access to `chartRefs` and `activeChartId`. This creates a minor coupling that can be resolved by passing refs as arguments.

**Impact:** Removes ~50 lines + 2 dependencies from App.jsx.

### 1.5 Extract `useWatchlist()` → `src/hooks/useWatchlist.js`

**This is a higher-risk extraction due to WebSocket lifecycle management.**

```javascript
export function useWatchlist(showToast) {
  const [watchlistSymbols, setWatchlistSymbols] = useState(() => { ... });
  const [watchlistData, setWatchlistData] = useState([]);

  // Persist symbols
  useEffect(() => { ... }, [watchlistSymbols]);

  // Fetch + WebSocket subscription
  useEffect(() => {
    // REST fetch + subscribeToMultiTicker with cleanup
  }, [watchlistSymbols]);

  const handleWatchlistReorder = (newSymbols) => { ... };
  const handleRemoveFromWatchlist = (symbol) => { ... };

  return { watchlistSymbols, watchlistData, setWatchlistSymbols,
           handleWatchlistReorder, handleRemoveFromWatchlist };
}
```

**Risk:** Medium — WebSocket lifecycle must be preserved exactly. AbortController, mounted flag, and `initialDataLoaded` guard must be maintained.

**Impact:** Removes ~120 lines from App.jsx.

### 1.6 Extract `useAlerts()` → `src/hooks/useAlerts.js`

**Highest risk extraction in App.jsx.** The alert system has complex interactions:

- localStorage persistence with 24h retention
- WebSocket subscription for price monitoring
- Chart alert sync bridge via `onAlertsSync`
- Pause/resume mechanism with `skipNextSyncRef`
- Cross-reference with line-tools alerts (`_source === 'lineTools'`)
- `formatPrice()` dependency
- Chart ref access for `addPriceAlert()`, `removePriceAlert()`, `restartPriceAlert()`

```javascript
export function useAlerts({ currentSymbol, chartRefs, formatPrice }) {
  const [alerts, setAlerts] = useState(() => { ... });
  const [alertLogs, setAlertLogs] = useState(() => { ... });
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const alertsRef = useRef(alerts);
  const skipNextSyncRef = useRef(false);

  // Alert WebSocket polling (check every 1s for symbol changes)
  // Alert WebSocket subscription for price monitoring

  const handleSaveAlert = (alertData) => { ... };
  const handleRemoveAlert = (id) => { ... };
  const handleRestartAlert = (id) => { ... };
  const handlePauseAlert = (id) => { ... };
  const handleChartAlertsSync = (chartId, symbol, chartAlerts) => { ... };
  const handleChartAlertTriggered = (chartId, symbol, evt) => { ... };

  // Persistence effects with retention filtering

  return { alerts, alertLogs, unreadAlertCount, setUnreadAlertCount,
           handleSaveAlert, handleRemoveAlert, handleRestartAlert,
           handlePauseAlert, handleChartAlertsSync, handleChartAlertTriggered };
}
```

**Risk:** High — the alert system has multiple moving parts that interlock with chart refs, line tool primitives, and localStorage. The `skipNextSyncRef` mechanism is especially fragile.

**Mitigation:** Extract in a single atomic commit with parallel tests. Validate that pause/resume flow and chart sync bridge work identically.

**Impact:** Removes ~280 lines from App.jsx.

---

## Phase 2: ChartComponent Hook Extractions

**Goal:** Decompose the 1883-line ChartComponent into focused hooks.
**Risk:** Medium–High
**Estimated effort:** 5–8 days

### 2.1 Extract `useChartTheme()` → `src/hooks/useChartTheme.js`

```javascript
export function useChartTheme(chartRef, theme) {
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions(getThemeOptions(theme));
  }, [theme, chartRef]);
}
```

**Impact:** Removes ~60 lines + consolidates theme options into `chartOptions.js`.

### 2.2 Extract `useIndicators()` → `src/hooks/useIndicators.js`

```javascript
export function useIndicators(chartRef, mainSeriesRef, dataRef, indicators, chartReadyRef) {
  const smaSeriesRef = useRef(null);
  const emaSeriesRef = useRef(null);
  const emaLastValueRef = useRef(null);

  useEffect(() => { ... toggle indicators ... }, [indicators]);
  useEffect(() => {
    // Reset EMA last value when indicators change
  }, [indicators]);

  const updateIndicators = useCallback((data, indicatorsConfig) => { ... }, []);
  const updateRealtimeIndicators = useCallback((data) => { ... }, [indicators]);

  return { updateIndicators, updateRealtimeIndicators, emaLastValueRef };
}
```

**Impact:** Removes ~100 lines from ChartComponent. Clean separation of indicator series management.

### 2.3 Extract `useChartData()` → `src/hooks/useChartData.js`

**Medium risk — core data pipeline.**

```javascript
export function useChartData(chartRef, mainSeriesRef, chartTypeRef, symbol, interval,
                             indicatorsConfig, updateIndicators, updateRealtimeIndicators,
                             updateAxisLabel, updateOhlcFromLatest,
                             initializePriceScaleTimer, applyDefaultCandlePosition) {
  const dataRef = useRef([]);
  const wsRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const isActuallyLoadingRef = useRef(true);
  const chartReadyRef = useRef(false);

  useEffect(() => {
    // fetch + WS subscription with cleanup
  }, [symbol, interval]);

  return { dataRef, wsRef, isLoading, isActuallyLoadingRef, chartReadyRef };
}
```

**Risk:** Medium — this hook has many dependencies on ChartComponent's rendering functions (`updateIndicators`, `updateAxisLabel`, etc.). These can be passed as callbacks, but the dependency graph is complex.

**Alternative:** Consider keeping data loading in ChartComponent and only extracting the pure data transformation logic.

### 2.4 Extract `useLineTools()` → `src/hooks/useLineTools.js`

**Medium priority — wraps line tool initialization + state sync.**

```javascript
export function useLineTools(chartRef, mainSeriesRef, symbol, activeTool, onToolUsed,
                             isDrawingsLocked, isDrawingsHidden, isTimerVisible,
                             onAlertsSync, onAlertTriggered) {
  const lineToolManagerRef = useRef(null);
  const priceScaleTimerRef = useRef(null);

  const initializeLineTools = (series) => { ... };
  const initializePriceScaleTimer = (series, intervalSeconds) => { ... };

  // State sync effects
  useEffect(() => { ... active tool ... }, [activeTool]);
  useEffect(() => { ... drawings lock ... }, [isDrawingsLocked]);
  useEffect(() => { ... drawings hidden ... }, [isDrawingsHidden]);
  useEffect(() => { ... timer ... }, [isTimerVisible]);

  return { lineToolManagerRef, priceScaleTimerRef,
           initializeLineTools, initializePriceScaleTimer };
}
```

**Impact:** Removes ~150 lines from ChartComponent.

### 2.5 Extract `useReplayMode()` → `src/hooks/useReplayMode.js`

**Highest risk extraction in ChartComponent.** Replay mode (~350 lines) is the single largest embedded subsystem.

```javascript
export function useReplayMode(chartRef, mainSeriesRef, chartTypeRef, dataRef, indicators,
                              updateIndicators, updateAxisLabel, onReplayModeChange) {
  const [isReplayMode, setIsReplayMode] = useState(false);
  const isReplayModeRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [replayIndex, setReplayIndex] = useState(null);
  const [isSelectingReplayPoint, setIsSelectingReplayPoint] = useState(false);
  const fullDataRef = useRef([]);
  const fadedSeriesRef = useRef(null);
  const replayIndexRef = useRef(null);
  const isPlayingRef = useRef(false);

  const stopReplay = () => { ... };
  const updateReplayData = useCallback((index, hideFeature, preserveView) => { ... }, [...]);
  const handleReplayPlayPause = () => { ... };
  const handleReplayForward = () => { ... };
  const handleReplayJumpTo = () => { ... };
  const handleSliderChange = useCallback((index, hideFuture) => { ... }, [...]);

  // Playback effect
  useEffect(() => { ... setInterval ... }, [isPlaying, isReplayMode, replaySpeed]);

  // Chart click handler for replay navigation
  useEffect(() => { ... subscribeClick ... }, [isReplayMode, ...]);

  // Jump-to-bar click handler
  useEffect(() => { ... }, [isSelectingReplayPoint, ...]);

  // Update data ref for external access
  const setUpdateReplayDataRef = (ref) => { ... };

  return { isReplayMode, setIsReplayMode, isReplayModeRef,
           isPlaying, setIsPlaying, isPlayingRef,
           replaySpeed, setReplaySpeed,
           replayIndex, setReplayIndex, replayIndexRef,
           isSelectingReplayPoint, setIsSelectingReplayPoint,
           fullDataRef, fadedSeriesRef,
           stopReplay, updateReplayData,
           handleReplayPlayPause, handleReplayForward,
           handleReplayJumpTo, handleSliderChange,
           setUpdateReplayDataRef };
}
```

**Why high risk:**
- Replay mode interacts with every other system: data, series, indicators, chart click, imperative handle
- `updateReplayDataRef` is used in `useImperativeHandle` for `toggleReplay()`
- Playback interval must be cleaned up correctly
- Click handlers must be properly subscribed/unsubscribed
- Data slicing logic (`dataRef`, `fullDataRef`, `fadedSeriesRef`) must be exact

**Mitigation:**
- Extract in a separate branch with parallel verification
- Validate: enter/exit, play/pause, forward, jump-to-bar, slider drag, chart click, speed change, indicator updates during replay
- Ensure `useImperativeHandle` still calls the correct function via ref forwarding

**Impact:** Removes ~350 lines from ChartComponent.

---

## Phase 3: Subsystem Extraction Candidates

**Goal:** Extract reusable subsystems that could become public API targets.
**Risk:** Variable
**Estimated effort:** 5–10 days

### 3.1 Indicator Engine (Low Risk, High Value)

Create a proper indicator plugin system:

```
src/indicators/
├── index.js          # IndicatorEngine class
├── registry.js       # Built-in + custom indicator registry
├── base.js           # Base indicator class
├── sma.js            # SMA (refactored from utils/)
├── ema.js            # EMA (refactored from utils/)
└── api.js            # Public API for adding custom indicators
```

**Benefits:**
- Replace hardcoded SMA/EMA toggles with a registry
- Enable third-party indicator plugins
- Decouple indicator calculation from rendering

### 3.2 Data Provider Abstraction (Medium Risk, High Value)

Create an abstract data layer to decouple from Binance:

```
src/data/
├── index.js          # DataProvider interface
├── binance.js        # Binance implementation (refactored from services/)
├── mock.js           # Mock provider for development/testing
└── cache.js          # In-memory cache layer
```

**Benefits:**
- Swap Binance for any data source via adapter
- Enable local dev/testing without API keys
- Cache layer reduces redundant REST calls

### 3.3 Chart Facade (Medium Risk, Medium Value)

Create a simplified public API that wraps ChartComponent's imperative handle and props:

```javascript
// src/facade/ChartFacade.js
export class ChartFacade {
  constructor(container, options) {
    // Simplified initialization
  }

  setSymbol(symbol) { ... }
  setInterval(interval) { ... }
  setChartType(type) { ... }
  toggleIndicator(name) { ... }
  addDrawingTool(tool) { ... }
  setTheme(theme) { ... }
  destroy() { ... }
}
```

**Benefits:**
- Provides a clean public API for embedding in other apps
- Hides React internals from consumers
- Can be wrapped for non-React usage

---

## Phase 4: Topbar Decomposition

**Goal:** Split Topbar.jsx into manageable sub-components.
**Risk:** Low
**Estimated effort:** 2–3 days

### 4.1 Extract `TimeframeSelector` → `src/components/Topbar/TimeframeSelector.jsx`

Extract the timeframe dropdown (~200 lines):

- Interval favorite buttons row
- Dropdown with collapsible sections (Ticks/Seconds/Minutes/Hours/Days/Custom)
- Custom interval adder form
- Favorite toggle (star icon)
- Custom interval removal (trash icon)

### 4.2 Extract `SnapshotMenu` → `src/components/Topbar/SnapshotMenu.jsx`

Extract snapshot button + dropdown (~50 lines):
- "Download image" action
- "Copy image" action
- Dropdown position + click-outside handling

### 4.3 Extract `LayoutSelector` → `src/components/Topbar/LayoutSelector.jsx`

Extract layout button + dropdown (~40 lines):
- Single / 2 / 3 / 4 chart layout options
- Active state display

### 4.4 Extract `ChartTypeSelector` → `src/components/Topbar/ChartTypeSelector.jsx`

Extract chart type button + dropdown (~40 lines):
- 7 chart types with SVG icons
- Active state per type

---

## Phase 5: Facade Opportunities

### 5.1 Provider Pattern (Medium Priority)

Create React Context for shared state:

```jsx
// src/providers/ChartProvider.jsx
<ChartProvider>
  <ChartToolkit symbol="BTCUSDT" interval="1d" />
</ChartProvider>
```

This would replace prop-drilling through App → ChartGrid → ChartComponent for common props (theme, layout config, etc.).

### 5.2 Plugin Registration API (Low Priority)

```javascript
// src/api/plugins.js
registerIndicator(name, calculator);
registerDrawingTool(name, primitive);
registerDataSource(provider);
registerTheme(name, options);
```

This enables external extension without modifying core code.

### 5.3 Embeddable Widget API (Low Priority)

```html
<div id="chart"></div>
<script>
  const chart = new MPChartWidget('#chart', {
    symbol: 'BTCUSDT',
    interval: '1d',
    theme: 'dark'
  });
</script>
```

This would wrap the React app in a Web Component or standalone build.

---

## Risk Assessment Summary

| Extraction | Phase | Lines Removed | Risk | Complexity |
|---|---|---|---|---|
| Helper functions | 0 | ~60 | Very Low | Trivial |
| TOOL_MAP constant | 0 | ~44 | Very Low | Trivial |
| Chart options factory | 0 | ~80 | Very Low | Trivial |
| Dropdown position utils | 0 | ~20 | Very Low | Trivial |
| useToast() | 1 | ~40 | Very Low | Simple |
| useMultiChart() | 1 | ~70 | Low | Moderate |
| useIntervals() | 1 | ~120 | Low | Moderate |
| useDrawingTools() | 1 | ~50 | Low | Simple |
| useWatchlist() | 1 | ~120 | Medium | Complex (WS lifecycle) |
| useAlerts() | 1 | ~280 | High | Very Complex |
| useChartTheme() | 2 | ~60 | Low | Simple |
| useIndicators() | 2 | ~100 | Low | Simple |
| useChartData() | 2 | ~250 | Medium | Complex |
| useLineTools() | 2 | ~150 | Medium | Moderate |
| useReplayMode() | 2 | ~350 | High | Very Complex |
| Indicator engine | 3 | N/A | Low | Moderate |
| Data provider abstraction | 3 | N/A | Medium | Complex |
| Chart facade | 3 | N/A | Medium | Moderate |
| Topbar decomposition | 4 | ~400 | Low | Moderate |
| Provider pattern | 5 | N/A | Medium | Moderate |

---

## Recommended Order of Execution

```
Week 1: Phase 0 (all)
  → Safe, immediate wins. No behavioral changes.

Week 2: Phase 1 items 1.1–1.4
  → useToast, useMultiChart, useIntervals, useDrawingTools
  → Low risk, high impact on App.jsx readability.

Week 3: Phase 1 items 1.5 (useWatchlist)
  → Medium risk. Requires careful WebSocket lifecycle verification.

Week 4: Phase 2 items 2.1–2.2
  → useChartTheme, useIndicators
  → Low risk extractions from ChartComponent.

Week 5–6: Phase 1 item 1.6 (useAlerts)
  → HIGHEST RISK. Dedicate focused time. Write parallel verification tests.

Week 7–9: Phase 2 items 2.3–2.5
  → useChartData, useLineTools, useReplayMode
  → useReplayMode is the highest complexity extraction overall.

Week 10–12: Phase 3–5 (subsystem extraction)
  → Indicator engine, data provider, facade, topbar decomposition, provider pattern.

Total estimated effort: 10–12 weeks for complete refactor.