# Current State — MP Charts Toolkit

**Scope:** Consolidated view of the subsystem.
**Purpose:** Single entry point for architects and maintainers.
**See also:** `subsystem-map.md`, `rendering-pipeline.md`, `ui-composition.md`, `workstation-shell.md`, `plugin-architecture.md`, `compatibility-analysis.md`, `giant-files.md`, `extraction-plan.md`.

---

## 1. System Overview

The MP Charts Toolkit is a React 19 chart workstation shell built on `lightweight-charts v5.0.9`. It renders multi-chart workspaces (1–4 charts), provides 40+ drawing tools via a vendored plugin, manages real-time Binance data, supports bar replay mode, and maintains a persistent alert system.

```
Source:  26 JS/JSX files
Total:   ~8,500 lines of application code
Plugin:  ~6,500 minified lines (lightweight-charts-line-tools@4.1.1 vendored)
API:     16 lightweight-charts API calls from host
State:   10 localStorage keys, ~15 useState hooks in App.jsx
```

---

## 2. Major Subsystems

| Subsystem | Files | LOC | Maturity |
|---|---|---|---|
| Chart Rendering Engine | `ChartComponent.jsx` | 1,883 | 🟡 Works, but carries replay + indicators + line tools inline |
| Workspace Orchestrator | `App.jsx` | 1,041 | 🟡 15 responsibilities, alert system is 27% of file |
| Drawing Plugin | `line-tools.js` (vendored) | 6,495 (minified) | 🔴 No public alert API, no serialization, fancy-canvas mismatch |
| Shell UI | Layout, Topbar, DrawingToolbar, Watchlist, etc. | ~2,200 | 🟢 Well-composed, slot-based layout, consistent patterns |
| Data Provider | `services/binance.js` | 129 | 🟡 Tightly coupled to Binance, no abstraction layer |
| Indicators | `utils/indicators/*` | 60 | 🔴 Only SMA/EMA, hardcoded periods, no extension API |

---

## 3. Critical Dependencies

### Runtime

| Dependency | Version | Role | Status |
|---|---|---|---|
| `lightweight-charts` | 5.0.9 | Chart rendering library | 🟢 30+ API calls, all stable |
| `lightweight-charts-line-tools` | 4.1.1 | Drawing tools plugin | 🔴 Vendored, no npm tracking, fancy-canvas mismatch |
| `fancy-canvas` | 2.1.0 (from LC) vs 0.2.2 (plugin's declared) | Canvas abstraction | 🔴 Dual-version risk — currently works because plugin is NOT installed via npm |
| `react` / `react-dom` | 19.2.0 | UI framework | 🟢 |
| `html2canvas` | 1.4.1 | Screenshot capture | 🟢 Isolated in 2 handler functions |
| `lucide-react` | 0.555.0 | Icon library | 🟢 Minimal usage in 4 components |

### Critical Findings

**The plugin (`line-tools/`) is `lightweight-charts-line-tools@4.1.1` by `difurious`**, identified via npm registry. It is vendored without:
- `package.json` dependency entry in host
- Version lock with LC v5.0.9
- Dependency resolution of its own `fancy-canvas@0.2.2` requirement
- Any upgrade strategy

**If this plugin were ever added to `package.json` via `npm install`, the dual `fancy-canvas` versions would crash the canvas rendering pipeline.** The only reason it works today is the vendoring isolates it from npm resolution.

---

## 4. Coupling Hotspots

### Hotspot 1: ChartComponent.jsx (1,883 lines)

**Root cause:** 15 responsibilities in one file. Replay mode (~350 lines) and the data pipeline (~250 lines) are the largest embedded subsystems.

**Dependency graph:**
```
ChartComponent
  ├── lightweight-charts (16 API calls)
  ├── LineToolManager (6 public methods + 8 private property accesses)
  ├── PriceScaleTimer (4 method calls)
  ├── services/binance.js (getKlines, subscribeToTicker)
  ├── utils/indicators (calculateSMA, calculateEMA)
  ├── utils/chartUtils (calculateHeikinAshi)
  ├── utils/timeframes (intervalToSeconds)
  ├── ReplayControls, ReplaySlider (child components)
  └── App.jsx via imperativeHandle (12 exposed methods)
```

### Hotspot 2: App.jsx (1,041 lines)

**Root cause:** No separation between workspace orchestration and business logic. Alert system (280 lines) and watchlist data fetching (120 lines) are embedded.

**Dependency graph:**
```
App.jsx
  ├── 10 child components (Layout, Topbar, DrawingToolbar, ChartGrid, etc.)
  ├── services/binance.js (getTickerPrice, subscribeToMultiTicker)
  ├── html2canvas (2 screenshot handlers)
  ├── localStorage (10 keys for state persistence)
  └── chartRefs.current[id].method() (imperative bridge to ChartComponent)
```

### Hotspot 3: Alert Bridge

**Root cause:** Plugin exposes no public alert API. All alert integration goes through `manager._userPriceAlerts` — an underscore-prefixed private property.

**Coupling chain:**
```
App.jsx (alert state) ← callbacks → ChartComponent ← `_userPriceAlerts` → vendored plugin
     5 handlers                   2 subscriptions + 5 imperative methods     private property
```

**If the plugin is rebuilt or updated, this entire chain breaks silently.**

---

## 5. Architectural Risks

| Risk | Severity | Likelihood | Impact |
|---|---|---|---|
| Plugin update breaks `_userPriceAlerts` | Critical | Medium | Alert system, marker rendering, pause/resume all fail |
| Plugin installed via npm (dual fancy-canvas) | Critical | Low | Canvas rendering crashes on any drawing tool use |
| Series re-creation destroys drawings | High | Always | Chart type switch = all drawings lost |
| No drawing persistence | High | Always | Page reload = all analysis lost |
| Alert subscription memory leak | Medium | Always | Stale closures on chart type switch, accumulating over time |
| Type safety bypass (plugin re-declares LC types) | Medium | Always | No compile-time detection of LC API drift |
| Window globals in production | Low | Always | Debug surface exposed, implicit dependency |

---

## 6. Safe Extension Points

### Existing Extension Points (Can Add Without Refactoring)

| Point | Mechanism | What Can Be Added |
|---|---|---|
| DrawingToolbar tool groups | Declarative array `toolGroups` in component | New tool buttons, new groups |
| Topbar button groups | JSX button groups with separators | New commands, dropdowns |
| Symbol search modes | `searchMode` prop + `onSelect` callback | New search behaviors |
| Alert condition options | `AlertDialog` select options | New condition types |
| BottomBar time ranges | Array `timeRanges` | New preset ranges |
| Layout grid classes | CSS class `grid1`–`grid4` | More complex layouts |
| localStorage keys | Flat key-value in `safeParseJSON` | New persisted state |

### Future Extension Points (Require Extraction First)

| Point | Requires | Benefit |
|---|---|---|
| PluginAdapter wrapping `_userPriceAlerts` | Extraction of alert bridge | Stable alert API regardless of plugin internals |
| Data provider abstraction | Extraction of `binance.js` | Swap Binance for any data source |
| Indicator registry | Extraction of indicator logic | Add custom indicators without modifying rendering |
| Chart component hooks | Extraction of replay, data, line tools | Reuse chart behaviors independently |
| Drawing serialization API | Extraction of plugin adapter | Save/load/share drawings across sessions |

---

## 7. Plugin Boundaries

```
                     SHELL BOUNDARY
┌───────────────────────────────────────────────────────────────┐
│  DrawingToolbar      Topbar (timer)     App.jsx               │
│  (tool IDs)          (timer toggle)     (activeTool state)    │
│       │                   │                    │              │
│       └───────────────────┴────────────────────┘              │
│                            │                                  │
│                    ┌───────▼──────────────┐                   │
│                    │  ChartComponent.jsx  │    SHELL           │
│                    │  (bridge)            │    CODE            │
│                    └───────┬──────────────┘                   │
├────────────────────────────┼──────────────────────────────────┤
│                    ┌───────▼──────────────┐                   │
│                    │  LineToolManager     │    PLUGIN          │
│                    │                      │    LAYER           │
│                    │  ┌────────────────┐  │                   │
│                    │  │ startTool()    │  │  public            │
│                    │  │ undo()/redo()  │  │  public            │
│                    │  │ clearTools()   │  │  public            │
│                    │  │ lockAll()      │  │  public            │
│                    │  │ hideAll()      │  │  public            │
│                    │  ├────────────────┤  │                   │
│                    │  │ _userPriceAlerts│  │  PRIVATE (risk!)  │
│                    │  │ _tools[]       │  │  PRIVATE          │
│                    │  │ _historyManager│  │  PRIVATE          │
│                    │  └────────────────┘  │                   │
│                    └──────────────────────┘                   │
│                                                               │
│  Drawing primitives (TrendLine, Fibonacci, Rectangle, ...    ) │
│  PriceScaleTimer (candle countdown)                           │
└───────────────────────────────────────────────────────────────┘
```

**Boundary rule:** Shell code should never access `_`-prefixed plugin properties. The shell currently violates this in 8 locations. A PluginAdapter must be the only bridge.

---

## 8. Integration Boundaries

### Layer Separation

| Layer | Inbound Interface | Outbound Interface | Files |
|---|---|---|---|
| Shell UI | Props from parent | Callbacks to parent | Layout, Topbar, DrawingToolbar, Watchlist, etc. |
| Workspace Orchestrator | User interaction events | Props to children + imperative calls to chart refs | App.jsx |
| Engine Factory | Chart config objects | Prop distribution to engine instances | ChartGrid.jsx |
| Chart Engine | Props + imperative commands | Callbacks + primitive subscriptions | ChartComponent.jsx |
| Plugin | `attachPrimitive()` + startTool() | Undo/redo stacks, rendering | line-tools.js |
| Data Service | Data provider method calls | REST/WebSocket responses | binance.js |

### Current Violations

| Layer | Violation | Fix |
|---|---|---|
| Workspace → Engine | App.jsx calls `chartRefs.current[id].addPriceAlert()` directly | Route through PluginAdapter |
| Engine → Plugin | ChartComponent accesses `_userPriceAlerts` directly | Create PluginAdapter |
| Engine → Service | ChartComponent calls `getKlines()` directly | Abstract behind data provider |
| Workspace → Service | App.jsx calls `getTickerPrice()` and `subscribeToMultiTicker()` directly | Abstract behind data provider |
| Engine → Utility | ChartComponent imports `calculateSMA` directly | Extract to indicator engine |

---

## 9. Recommended Refactor Order

```
WEEK 1                                       (Phase 0 - Low Risk)
├── Extract helper functions → src/utils/helpers.js
├── Extract TOOL_MAP → src/constants/toolMap.js
├── Extract chart options → src/utils/chartOptions.js
├── Extract dropdown positions → src/utils/dropdownPosition.js
└── Track plugin version in package.json as file: dependency

WEEK 2                                       (Phase 1 - Low Medium)
├── Extract useToast() hook
├── Extract useMultiChart() hook
├── Extract useIntervals() hook
├── Extract useDrawingTools() hook
└── Create PluginAdapter (wraps _userPriceAlerts)

WEEKS 3-6                                    (Phase 1-2 - Medium)
├── Extract useWatchlist() hook
├── Extract useChartTheme() + useIndicators() hooks
├── Add drawing serialization through PluginAdapter
├── Fix stale subscription memory leak
└── Extract useAlerts() hook                  (HIGHEST RISK)

WEEKS 7-10                                   (Phase 2 - High)
├── Extract useChartData() hook
├── Extract useLineTools() hook
├── Extract useReplayMode() hook               (MOST COMPLEX)
├── Fork plugin source, fix fancy-canvas to 2.1.0
├── Add public alert API to forked plugin
└── Replace vendored plugin with npm git dependency

WEEKS 11-14                                  (Phase 3-5)
├── Create data provider abstraction
├── Create indicator engine with registry
├── Create ChartFacade for embedding
├── Decompose Topbar (TimeframeSelector, SnapshotMenu, etc.)
├── Create Provider pattern (ChartContext)
└── Create widget API for non-React embedding
```

---

## 10. Future Target Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    WORKSTATION SHELL                          │
│  (independent of chart library)                              │
│                                                              │
│  Layout  Topbar  DrawingToolbar  BottomBar  RightToolbar     │
│  Watchlist  AlertsPanel  SymbolSearch  AlertDialog           │
│  Toast  ReplayControls  ReplaySlider                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Workspace Orchestrator (useMultiChart + hooks)         │ │
│  └────────────────────────┬───────────────────────────────┘ │
├───────────────────────────┼─────────────────────────────────┤
│                    ┌──────▼──────┐                          │
│                    │  ChartGrid  │                          │
│                    └──────┬──────┘                          │
├───────────────────────────┼─────────────────────────────────┤
│                    ┌──────▼──────────────────────┐          │
│                    │  ChartEngine (refactored)    │          │
│                    │                              │          │
│                    │  ┌──────────────────────┐    │          │
│                    │  │ useChartData() hook  │    │          │
│                    │  │ useIndicators() hook │    │          │
│                    │  │ useLineTools hook    │────┼────► PluginAdapter
│                    │  │ useReplayMode hook   │    │          │
│                    │  └──────────────────────┘    │          │
│                    └──────┬───────────────────────┘          │
├───────────────────────────┼─────────────────────────────────┤
│                    ┌──────▼──────────────────────┐          │
│                    │  Data Provider (abstracted)  │          │
│                    │  ├── BinanceAdapter          │          │
│                    │  ├── MockProvider            │          │
│                    │  └── Cache layer             │          │
│                    └──────────────────────────────┘          │
│                                                              │
│                    ┌──────────────────────────────┐          │
│                    │  Plugin (forked, public API)  │          │
│                    │  ├── LineToolManager          │          │
│                    │  ├── AlertAPI (public)        │          │
│                    │  ├── SerializationAPI         │          │
│                    │  └── PriceScaleTimer          │          │
│                    └──────────────────────────────┘          │
│                                                              │
│                    ┌──────────────────────────────┐          │
│                    │  Indicator Engine            │          │
│                    │  ├── SMA, EMA (built-in)     │          │
│                    │  └── Registry for custom      │          │
│                    └──────────────────────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

### Key Changes from Current State

| Aspect | Current | Target |
|---|---|---|
| ChartComponent | 1,883 lines, 15 concerns | ~400 lines, 5 extracted hooks |
| App.jsx | 1,041 lines, 15 concerns | ~200 lines, 6 extracted hooks |
| Plugin access | 8 private property accesses | 1 PluginAdapter interface |
| Data provider | Hard-coded Binance | Abstracted with adapter pattern |
| Indicators | 2 hard-coded, no extension | Registry-based, custom indicators |
| Drawing persistence | None | localStorage via serialization API |
| State management | Prop drilling through App | Provider pattern with Context |
| Error recovery | ErrorBoundary only | Graceful degradation per subsystem |