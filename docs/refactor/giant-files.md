# Giant Files Analysis — MP Charts Toolkit

This document identifies files larger than 800 LOC, classifies responsibilities, identifies mixed concerns, and suggests extraction boundaries while preserving behavior.

---

## Files Over 800 LOC

| File | Lines | Rank |
|---|---|---|
| `src/components/Chart/ChartComponent.jsx` | 1883 | 1 |
| `src/App.jsx` | 1041 | 2 |

---

## 1. ChartComponent.jsx (1883 lines)

### Current Responsibilities

| Category | Lines | Description |
|---|---|---|
| Chart lifecycle | ~100 | `createChart()`, `ResizeObserver`, context menu, cleanup |
| Series management | ~120 | `createSeries()` for 7 types, re-creation on type change |
| Data loading | ~170 | `getKlines()`, data transformation, indicator initialization, WebSocket setup |
| Real-time updates | ~100 | WebSocket callback, candle normalization, `series.setData()`, real-time indicator updates |
| Indicators | ~100 | `updateIndicators()`, `updateRealtimeIndicators()`, SMA/EMA series creation/destruction |
| Line tool integration | ~120 | `initializeLineTools()`, alert bridge, tool mapping, `TOOL_MAP` (44 lines) |
| Drawing tool state sync | ~110 | 5 `useEffect` blocks: active tool, lock, hide, timer, zoom |
| Replay mode | ~350 | `toggleReplay()`, `updateReplayData()`, `stopReplay()`, playback interval, click handlers, slider interaction, entry/exit logic |
| OHLC / axis label | ~80 | `updateAxisLabel()` RAF loop, `updateOhlcFromLatest()`, crosshair subscription |
| Comparison symbols | ~70 | Add/remove LineSeries per symbol, async data loading |
| Theme / magnet / time range | ~60 | 3 `useEffect` blocks for theme, magnet mode, time range presets |
| Visibility tracking | ~40 | `IntersectionObserver`, `document.visibilityState`, RAF optimization |
| Imperative handle | ~120 | `useImperativeHandle` exposing 12 methods |
| Refs and state | ~80 | ~20 `useRef`, ~15 `useState`, `useCallback`, `useMemo` declarations |
| Zoom support | ~40 | `zoomChart()`, zoom click event handlers |
| Template/JSX | ~80 | Return statement, OHLC header bar, replay controls, loading overlay |

### Mixed Concerns

1. **Replay mode is deeply embedded** (~350 lines within a single component). Replay state, playback logic, click handlers, slider coordination, and data slicing are all intertwined with chart rendering code. This is the single largest extraction opportunity.

2. **Data pipeline is coupled to chart rendering.** Data fetching (`getKlines`), transformation (`transformData`), and WebSocket subscription are inline within the component. Moving these to a separate data layer or hook would decouple data concerns from rendering.

3. **Line tool integration is fragmented** across 5 separate `useEffect` blocks and the imperative handle. The `TOOL_MAP`, `initializeLineTools()`, alert bridging, and state sync are spread across the file.

4. **Indicator management** is handled via direct series manipulation inside the component. Series creation/destruction for SMA/EMA, real-time updates, and toggle logic are inline rather than abstracted.

5. **Theme configuration** is duplicated raw option objects across multiple effects rather than centralized.

### Suggested Extraction Boundaries

| Extraction | Est. Lines | Priority | Risk |
|---|---|---|---|
| `useReplayMode()` hook | ~300 | High | Medium — replay is self-contained but tightly coupled to refs |
| `useChartData()` hook | ~250 | High | Medium — decouples REST + WS + dataRef from rendering |
| `useIndicators()` hook | ~100 | Medium | Low — clean extraction with clear interface |
| `useLineTools()` hook | ~150 | Medium | Low — wraps line tool initialization + state sync |
| `useChartTheme()` hook | ~60 | Low | Low — simple options extraction |
| `TOOL_MAP` to constants file | ~44 | Low | Very Low — pure mapping extract |
| Chart options factory | ~80 | Low | Low — centralize theme/grid/crosshair options |

### Preserving Behavior

All extractions must preserve:
- `chartRef.current`, `mainSeriesRef.current`, `seriesRefs` must remain accessible
- `useImperativeHandle` must compose from extracted hooks
- Event subscriptions (crosshair, click, visibility) must maintain same lifecycle
- WebSocket cleanup must remain synchronized with data loading lifecycle

---

## 2. App.jsx (1041 lines)

### Current Responsibilities

| Category | Lines | Description |
|---|---|---|
| Multi-chart state | ~50 | `layout`, `activeChartId`, `charts` array with localStorage persistence |
| Interval management | ~120 | `favoriteIntervals`, `customIntervals`, `lastNonFavoriteInterval`, CRUD operations, sanitization |
| Watchlist | ~120 | State, REST fetch + WebSocket subscription (`subscribeToMultiTicker`), persistence, reordering |
| Alert system | ~280 | State, WebSocket monitoring, CRUD, chart alert sync (`handleChartAlertsSync`), trigger detection, pause/resume, log management, persistence with 24h retention |
| Drawing tool state | ~50 | `activeTool`, `magnetMode`, drawing toolbar visibility, lock/hide/timer states |
| Theme | ~20 | Toggle + localStorage persistence |
| Toast / Snapshot | ~40 | Show/hide with auto-dismiss, timeout management |
| Image operations | ~70 | `handleDownloadImage()`, `handleCopyImage()` using `html2canvas` |
| Fullscreen | ~20 | Fullscreen API wrapper |
| Layout management | ~50 | Save/load layout, layout change (add/remove charts) |
| Search mode | ~30 | Switch/Compare/Add mode state |
| Scroll/visibility | ~20 | Scroll viewport visibility (for topbar dropdowns) |
| Replay mode | ~10 | Replay mode tracking for topbar toggle |
| Helper functions | ~50 | `isValidIntervalValue()`, `sanitize*()`, `safeParseJSON()`, `formatPrice()` |
| JSX Render | ~30 | Component composition in return statement |

### Mixed Concerns

1. **Alert system dominates the file** (~280 lines, 27% of total). Alert CRUD, WebSocket monitoring, chart sync bridge, trigger detection, pause/resume logic, and 24h retention are all inline. This is the single largest extraction opportunity in App.jsx.

2. **Watchlist data management** (~120 lines) is split between REST fetch, WebSocket subscription, state management, reordering, and persistence. This is a complete data layer coupled to the App component.

3. **Interval management** (~120 lines) with favorites, custom intervals, sanitization, and persistence is a self-contained domain that doesn't need to be in the root component.

4. **Image download/copy** (~70 lines) using `html2canvas` is a utility operation that is unrelated to chart state management.

5. **Helper functions** (`isValidIntervalValue`, `sanitize*`, `safeParseJSON`, `formatPrice`) are defined at module level but belong in a utilities module.

6. **No context or composition layer** — all state flows through App.jsx with no separation between data concerns and UI rendering.

### Suggested Extraction Boundaries

| Extraction | Est. Lines | Priority | Risk |
|---|---|---|---|
| `useAlerts()` hook | ~280 | High | Medium — complex state with WebSocket + chart bridge + persistence |
| `useWatchlist()` hook | ~120 | High | Low — well-defined boundary (symbol list + WS data) |
| `useIntervals()` hook | ~120 | Medium | Low — self-contained with localStorage |
| `useMultiChart()` hook | ~70 | Medium | Low — layout + charts array state |
| `useDrawingTools()` hook | ~50 | Medium | Low — simple state wrapper |
| `useToast()` hook | ~40 | Low | Low — trivial extraction |
| `helpers` utilities module | ~60 | Low | Very Low — pure function extraction |
| `binanceHelpers` module | ~20 | Low | Very Low — `formatPrice`, `getTickerPrice` variants |

### Preserving Behavior

All extractions must preserve:
- Alert sync with chart refs via `chartRefs.current[id].method()`
- WebSocket lifecycle synchronized with watchlist/alert changes
- localStorage persistence side effects
- `skipNextSyncRef` mechanism for alert pause/resume flow
- Chart refs access for undo/redo/clear tools
- Active chart tracking for single-source-of-truth

---

## Files Near Threshold (676 lines)

### Topbar.jsx (676 lines)

Not over 800 LOC but notable as the 3rd largest file.

**Responsibilities:**
- Symbol display + compare button
- Timeframe selector with favorites, collapsible sections, custom interval adder
- Chart type selector with icon preview
- Indicator toggles (SMA/EMA)
- Alert + Replay buttons
- Undo/Redo
- Layout selector
- Theme toggle
- Snapshot menu (download/copy)
- Fullscreen toggle
- 5 dropdown menus with click-outside detection and repositioning on scroll/resize

**Extraction suggestions:**
- `TimeframeSelector` sub-component (~200 lines of dropdown logic)
- `SnapshotMenu` sub-component (~50 lines)
- `LayoutSelector` sub-component (~40 lines)
- Dropdown position calculation utilities (~60 lines shared across 5 menus)

---

## Summary

| File | Lines | Extraction Priority | Key Concern |
|---|---|---|---|
| ChartComponent.jsx | 1883 | Highest | Replay mode (~350 lines), data pipeline (~250 lines) |
| App.jsx | 1041 | Highest | Alert system (~280 lines), watchlist (~120 lines) |
| Topbar.jsx | 676 | Lower | Timeframe selector, dropdown management |