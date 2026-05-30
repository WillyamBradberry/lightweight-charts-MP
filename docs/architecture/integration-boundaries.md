# Integration Boundaries — MP Charts Toolkit ↔ Host Application

> Source analysis from: `plugin-architecture.md`, `subsystem-map.md`, `private-api-inventory.md`, `chart-controller.md`, `extraction-plan.md`, `theme-editor.md`, `alert-rendering-flow.md`, `drawing-style-map.md`

---

## 1. Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     HOST APPLICATION (Future)                       │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐                │
│  │ Theme Engine │  │ Alert Manager│  │ Data Service│                │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘                │
│         │                │                  │                        │
├─────────┼────────────────┼──────────────────┼───────────────────────┤
│         ▼                ▼                  ▼                        │
│                   INTEGRATION BOUNDARY                               │
│              (defined in this document)                              │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                     MP CHARTS TOOLKIT                                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  ChartController (stable public API)                         │   │
│  │  ├── Layer 1: Safe Shell API (no plugin dependency)          │   │
│  │  ├── Layer 2: Plugin Public API (safe)                       │   │
│  │  └── Layer 3: Plugin Private API → AlertAdapter (fragile)    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │
│  │ LineToolManager  │  │ PriceScaleTimer  │  │ line-tools.js   │   │
│  │ (plugin export)  │  │ (plugin export)  │  │ (60+ classes)   │   │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Allowed Integration Points

### 2.1 Props Interface (Host → Toolkit)

All props flow **downward** from Host → ChartGrid → ChartComponent. No context/DI framework.

```typescript
interface ChartComponentProps {
  // Data
  symbol: string;
  interval: string;
  chartType: 'candlestick' | 'bar' | 'line' | 'area' | 'baseline' | 'heikin-ashi';

  // Tools
  activeTool: string | null;           // From TOOL_MAP keys
  magnetMode: boolean;
  isDrawingsLocked: boolean;
  isDrawingsHidden: boolean;

  // Features
  indicators: { sma: boolean; ema: boolean };
  comparisonSymbols: Array<{ symbol: string; color: string }>;
  isLogScale: boolean;
  isAutoScale: boolean;
  isTimerVisible: boolean;

  // Appearance
  theme: 'dark' | 'light';

  // Callbacks
  onToolUsed: () => void;
  onAlertsSync: (chartId: number, symbol: string, alerts: Alert[]) => void;
  onAlertTriggered: (chartId: number, symbol: string, event: TriggerEvent) => void;
  onReplayModeChange: (chartId: number, isActive: boolean) => void;
}
```

### 2.2 Imperative Handle (Host → Toolkit, via ref)

```typescript
interface ChartImperativeHandle {
  // Layer 1: Safe (no plugin dependency)
  resetZoom(): void;
  getChartContainer(): HTMLElement;
  getCurrentPrice(): number | null;
  toggleTimer(): boolean;
  toggleReplay(): void;

  // Layer 2: Plugin public API
  undo(): void;
  redo(): void;
  clearTools(): void;

  // Layer 3: Plugin private API (needs AlertAdapter)
  addPriceAlert(alert: AlertInput): void;
  removePriceAlert(externalId: number): void;
  restartPriceAlert(price: number, condition: string): void;

  // ⚠️ DEPRECATED — leaks entire plugin
  getLineToolManager(): LineToolManager;
}
```

### 2.3 ChartController Service (Future Boundary)

The toolkit should expose a **ChartController** service that encapsulates all chart interactions:

```typescript
// Future: single entry point for host ↔ toolkit communication
interface IChartController {
  // Drawing tools
  tools: IToolController;
  // Price alerts
  alerts: IAlertController;
  // Chart view
  view: IChartViewController;
  // Timer
  timer: ITimerController;
  // Theme
  theme: IThemeController;       // future
  // Serialization
  state: IStateController;       // future
}
```

---

## 3. Forbidden Dependencies

### 3.1 Host → Toolkit (Forbidden)

| Dependency | Reason | Risk |
|------------|--------|------|
| ❌ `manager._userPriceAlerts` | Private property, will break on plugin update | 🔴 HIGH |
| ❌ `manager._tools[]` | Private array, undocumented | 🔴 HIGH |
| ❌ `manager._historyManager` | Private, internal undo state | 🔴 HIGH |
| ❌ `manager._activeTool` | Private, internal tool state | 🟡 MEDIUM |
| ❌ `manager._selectedTool` | Private, internal selection | 🟡 MEDIUM |
| ❌ `window.lineToolManager` | Debug global, not stable API | 🟡 MEDIUM |
| ❌ `window.chartInstance` | Debug global, not stable API | 🟡 MEDIUM |
| ❌ `window.seriesInstance` | Debug global, not stable API | 🟡 MEDIUM |
| ❌ `chart._impl.model()` | LC internal, undocumented | 🔴 HIGH |
| ❌ Direct `document.createElement` in plugin DOM | Not accessible from host | 🟡 MEDIUM |

### 3.2 Toolkit → Host (Forbidden)

| Dependency | Reason | Risk |
|------------|--------|------|
| ❌ Direct React state access | Toolkit must not reach into host state | 🟡 MEDIUM |
| ❌ localStorage directly | Host controls persistence strategy | 🟡 MEDIUM |
| ❌ Binance API calls | Data layer belongs to host | 🟡 MEDIUM |
| ❌ DOM outside chart container | Toolkit renders only within its container | 🟢 LOW |
| ❌ CSS classes from host | Toolkit has its own styling | 🟢 LOW |

### 3.3 Toolkit → External Libraries (Forbidden)

| Dependency | Reason | Risk |
|------------|--------|------|
| ❌ React (inside line-tools.js) | Plugin is vanilla JS | 🟢 OK |
| ❌ Any host utility functions | Clean separation required | 🟡 MEDIUM |
| ❌ Host context providers | No React context dependency | 🟡 MEDIUM |

---

## 4. Public API Surface

### 4.1 Plugin Exports (line-tools.js)

```javascript
export {
  es as LineToolManager,    // Primary — drawing tool orchestrator
  is as PriceScaleTimer    // Timer primitive — candle countdown
};
```

**Only these two classes are public.** Everything else is internal.

### 4.2 LineToolManager Public Methods

| Category | Method | Signature | Notes |
|----------|--------|-----------|-------|
| **Tool Control** | `startTool(name)` | `(string) → void` | Activate drawing tool |
| **Drawing State** | `clearTools()` | `() → void` | Remove all drawings |
| **Undo/Redo** | `undo()` | `() → void` | Undo last action |
| **Undo/Redo** | `redo()` | `() → void` | Redo last undone action |
| **Lock** | `lockAllDrawings()` | `() → void` | Lock all from editing |
| **Lock** | `unlockAllDrawings()` | `() → void` | Unlock all |
| **Lock** | `areDrawingsLocked()` | `() → boolean` | Check lock state |
| **Visibility** | `hideAllDrawings()` | `() → void` | Hide all drawings |
| **Visibility** | `showAllDrawings()` | `() → void` | Show all drawings |
| **Visibility** | `areDrawingsHidden()` | `() → boolean` | Check visibility state |
| **View** | `setDefaultRange({from, to})` | `(Range) → void` | Set visible logical range |
| **Primitive** | `attached(ctx)` | `(PrimitiveContext) → void` | LC primitive lifecycle |
| **Primitive** | `detached()` | `() → void` | LC primitive lifecycle |
| **Primitive** | `paneViews()` | `() → PaneView[]` | LC primitive rendering |
| **Primitive** | `priceAxisPaneViews()` | `() → PaneView[]` | LC primitive rendering |
| **Primitive** | `hitTest(x, y)` | `(number, number) → HitResult \| null` | LC primitive hit test |

### 4.3 PriceScaleTimer Public Methods

| Method | Signature | Notes |
|--------|-----------|-------|
| `applyOptions(opts)` | `(TimerOptions) → void` | Update timer configuration |
| `setVisible(visible)` | `(boolean) → void` | Show/hide timer |
| `isVisible()` | `() → boolean` | Check visibility |
| `updateCandleData(open, close)` | `(number, number) → void` | Update candle OHLC |

---

## 5. Plugin Boundaries

### 5.1 Rendering Boundary

```
┌──────────────────────────────────────────────┐
│            CHART CANVAS (shared)              │
│                                               │
│  Lightweight Charts renders:                  │
│    ├── Series data (candlesticks, etc.)       │
│    ├── Grid, axis labels, watermark           │
│    └── Crosshair                              │
│                                               │
│  Plugin primitives render (via paneViews()):  │
│    ├── Drawing tools (TrendLine, Fib, etc.)   │
│    ├── Alert lines + icons + labels           │
│    └── Selection anchors                      │
│                                               │
│  ⚠️ Both write to same canvas context         │
│  ⚠️ zOrder: plugin primitives use "top"       │
└──────────────────────────────────────────────┘
```

### 5.2 DOM Boundary

```
┌──────────────────────────────────────────────────────────┐
│                     DOM TREE                              │
│                                                           │
│  document                                                 │
│  ├── <head>                                               │
│  │   ├── <style id="alert-notification-styles">           │ ← Plugin injected (Hi)
│  │   ├── <style id="alert-edit-dialog-styles">            │ ← Plugin injected (Ei)
│  │   └── <style id="chart-navigation-styles">             │ ← Plugin injected (Oi)
│  │                                                        │
│  └── <body>                                               │
│      ├── <div class="alert-notifications-container">      │ ← Plugin (Hi)
│      └── <div class="alert-edit-dialog-overlay">          │ ← Plugin (Ei)
│                                                           │
│  #root                                                    │
│  └── <Layout>                                             │ ← React (host)
│      ├── <DrawingToolbar />                               │ ← React (host)
│      ├── <ChartComponent containerRef>                    │ ← React (host)
│      │   ├── <div ref={chartContainerRef}>                │ ← LC renders here
│      │   └── (LC internal DOM)                            │
│      ├── <AlertsPanel />                                  │ ← React (host)
│      └── <Topbar />                                       │ ← React (host)
└──────────────────────────────────────────────────────────┘
```

**Rule:** Plugin creates DOM **only** on `document.body` (notifications, dialogs). It does NOT create DOM inside React's virtual DOM tree. Host must not depend on plugin-created DOM elements.

### 5.3 State Boundary

```
┌─────────────────────────────────────────────────────┐
│                STATE OWNERSHIP                        │
│                                                      │
│  HOST OWNS:                                          │
│    ├── Active tool type (activeTool)                 │
│    ├── Drawing lock state (isDrawingsLocked)         │
│    ├── Drawing visibility (isDrawingsHidden)         │
│    ├── Alert list (app-level state + localStorage)   │
│    ├── Alert logs                                    │
│    ├── Theme preference                              │
│    ├── Symbol/interval/chartType                     │
│    ├── Indicator toggles                             │
│    ├── Timer visibility                              │
│    ├── Layout configuration                          │
│    └── Replay mode                                   │
│                                                      │
│  PLUGIN OWNS:                                        │
│    ├── Drawing tool instances (_tools[])             │
│    ├── Undo/redo history (_historyManager)           │
│    ├── Active drawing state (_isDrawing)             │
│    ├── Mouse interaction state                       │
│    ├── Alert primitives on chart (_userPriceAlerts)  │
│    ├── Selection state (_selectedTool)               │
│    └── Plugin-internal DOM (toolbar, dialogs)        │
│                                                      │
│  SHARED (bridge required):                           │
│    ├── Alert data (host state ↔ plugin primitive)    │
│    └── Tool activation (host activeTool → plugin)    │
└─────────────────────────────────────────────────────┘
```

---

## 6. Future Theme API Boundary

### 6.1 Problem

Visual styling is scattered across 6 layers:

| Layer | Location | Examples |
|-------|----------|----------|
| React CSS Modules | `*.module.css` | Toolbar, panels, dialogs |
| Plugin CSS | `line-tools.css` | Plugin toolbar |
| Injected CSS | `Ei._injectStyles()`, `Hi._injectStyles()` | Alert dialogs, notifications |
| Canvas renderers | `Ri`, `ce`, `fe`, `be`, `Ee`, `fi` | Lines, fills, labels |
| Chart options | `getChartOptions()` | Grid, crosshair, candle colors |
| JS constants | `_e`, `me`, `ye`, `Ce`, `Se`, `He`, `mi` | Tool default colors |

### 6.2 Proposed Theme API Boundary

```
┌──────────────────────────────────────────────────────┐
│                  HOST APPLICATION                      │
│                                                       │
│  ThemeProvider (React Context)                        │
│    ├── provides: ThemeDefinition                      │
│    ├── reads from: localStorage / API / defaults      │
│    └── switches: dark ↔ light ↔ custom                │
│                                                       │
├──────────────────────────────────────────────────────┤
│                  THEME API BOUNDARY                    │
│                                                       │
│  Host passes theme via:                               │
│    1. React props → ChartComponent                    │
│    2. ChartComponent → applyOptions({ layout: ... })  │
│    3. ChartComponent → tool.applyOptions({ color })   │
│    4. ChartComponent → alert style injection           │
│                                                       │
├──────────────────────────────────────────────────────┤
│                  MP CHARTS TOOLKIT                     │
│                                                       │
│  Accepts theme via:                                   │
│    ├── LC chart.applyOptions() → layout/grid/cross    │
│    ├── tool.applyOptions() → per-tool colors          │
│    ├── alert constant override → alert line/icon/bg   │
│    └── CSS custom properties (future) → DOM styling   │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### 6.3 Theme Injection Points

| Area | Mechanism | Code Location | Host-Controllable |
|------|-----------|---------------|-------------------|
| **Chart background** | `chart.applyOptions({ layout: { background } })` | ChartComponent | ✅ Via props |
| **Chart grid** | `chart.applyOptions({ grid: { ... } })` | ChartComponent | ✅ Via props |
| **Crosshair** | `chart.applyOptions({ crosshair: { ... } })` | ChartComponent | ✅ Via props |
| **Tool line color** | `tool.applyOptions({ lineColor })` | Host (future) | ✅ Via API |
| **Tool line width** | `tool.applyOptions({ width })` | Host (future) | ✅ Via API |
| **Tool defaults** | Modify `_e`, `me`, `ye`, etc. constants | Plugin (requires fork) | ❌ Currently |
| **Alert line color** | Hardcoded `"#131722"` in `Ri` | Plugin internal | ❌ Currently |
| **Alert icon badge** | Hardcoded `"#131722"` fill | Plugin internal | ❌ Currently |
| **Alert label bg** | Hardcoded `"#FFFFFF"` | Plugin internal | ❌ Currently |
| **Selection anchor** | Hardcoded `#2962FF` stroke | Plugin internal | ❌ Currently |
| **Injected CSS (dialogs)** | `Ei._injectStyles()` hardcoded | Plugin internal | ❌ Currently |
| **Injected CSS (notifications)** | `Hi._injectStyles()` hardcoded | Plugin internal | ❌ Currently |
| **Fib level colors** | `He.levels[i].color` | Plugin defaults | ✅ Via applyOptions |
| **React component CSS** | CSS Modules | Host components | ✅ Host controls |

### 6.4 Future Theme API Contract

```typescript
interface IThemeController {
  // Apply theme to chart
  applyChartTheme(theme: ChartTheme): void;

  // Apply theme to all drawing tools
  applyToolDefaults(toolTheme: ToolTheme): void;

  // Apply theme to alerts
  applyAlertTheme(alertTheme: AlertTheme): void;

  // Get current theme
  getCurrentTheme(): ThemeDefinition;
}

interface ThemeDefinition {
  name: string;
  chart: ChartTheme;
  tools: ToolTheme;
  alerts: AlertTheme;
  ui: UITheme;
}

interface AlertTheme {
  lineColor: string;         // "#131722"
  lineWidth: number;         // 1
  lineDash: number[];        // [4, 4]
  iconBadgeColor: string;    // "#131722"
  iconGlyphColor: string;    // "#FFFFFF"
  hoverLabelBg: string;      // "#FFFFFF"
  hoverLabelBorder: string;  // "#131722"
  hoverLabelText: string;    // "#131722"
  hoverLabelFont: string;    // "12px sans-serif"
  closeBtnBg: string;        // "#F0F3FA"
  closeBtnIcon: string;      // "#131722"
}

interface ToolTheme {
  trendLine: ToolStyle;
  horizontalLine: ToolStyle;
  ray: ToolStyle;
  rectangle: RectangleStyle;
  fibRetracement: FibStyle;
  fibExtension: FibStyle;
  // ... all tool types
}

interface ToolStyle {
  lineColor: string;
  width: number;
  lineStyle: number;         // 0-4
}
```

### 6.5 Theme Migration Path

| Phase | Action | Effort |
|-------|--------|--------|
| 1 | Extract hardcoded colors to named constants | 1 day |
| 2 | Create `ThemeDefinition` interface | 0.5 day |
| 3 | Implement `ThemeController` class | 2 days |
| 4 | Wire React CSS to CSS custom properties | 1 day |
| 5 | Add `applyOptions` calls to all tools | 1 day |
| 6 | Fork plugin to support alert theme injection | 3 days |

---

## 7. Future Alert API Boundary

### 7.1 Current Problem

The alert system spans 3 layers with **no shared interface**:

```
Host (App.jsx)          Toolkit (ChartComponent)     Plugin (line-tools.js)
    │                           │                           │
    │ state: alerts[]           │ ref: lineToolManager      │ Di extends Li
    │ state: alertLogs[]        │ ref: priceScaleTimer      │   _alerts Map
    │ localStorage: tv_alerts   │                           │   _alertAdded H()
    │                           │                           │   _alertRemoved H()
    │ ←── onAlertsSync ────────│←── alertsChanged() ──────│
    │ ←── onAlertTriggered ────│←── alertTriggered() ─────│
    │                           │                           │
    │ ──→ addPriceAlert() ─────│──→ _userPriceAlerts ─────│
    │ ──→ removePriceAlert() ──│──→ _userPriceAlerts ─────│
    │ ──→ restartPriceAlert() ─│──→ _userPriceAlerts ─────│
```

**13 private property accesses** across this bridge. No type safety. No interface contract.

### 7.2 Proposed Alert API Boundary

```
┌──────────────────────────────────────────────────────┐
│                  HOST APPLICATION                      │
│                                                       │
│  AlertManager (React state + localStorage)            │
│    ├── state: Alert[]                                 │
│    ├── CRUD operations                                │
│    ├── Persistence (localStorage, 24h retention)      │
│    └── UI: AlertsPanel, AlertDialog                   │
│                                                       │
├──────────────────── IAlertService ───────────────────┤
│                                                       │
│  interface IAlertService {                            │
│    create(price, condition): AlertId                  │
│    remove(id): void                                  │
│    getAll(): Alert[]                                  │
│    setSymbol(symbol): void                           │
│    onChange(callback): Unsubscribe                    │
│    onTrigger(callback): Unsubscribe                   │
│  }                                                    │
│                                                       │
├──────────────────────────────────────────────────────┤
│                  MP CHARTS TOOLKIT                     │
│                                                       │
│  AlertAdapter implements IAlertService                │
│    ├── wraps: _userPriceAlerts (private)              │
│    ├── provides: type-safe interface                  │
│    └── isolates: all 13 private accesses              │
│                                                       │
│  Rendered by:                                         │
│    ├── Ri renderer (alert lines, canvas)              │
│    ├── Ai renderer (price axis labels, canvas)        │
│    ├── Hi class (notification popups, DOM)            │
│    └── Ei class (edit dialog, DOM)                    │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### 7.3 Alert API Contract

```typescript
// Provided by toolkit to host
interface IAlertService {
  /**
   * Create a new price alert
   * @param price - Alert trigger price
   * @param condition - Trigger condition
   * @returns Alert ID (for subsequent operations)
   */
  create(price: number, condition: AlertCondition): AlertId;

  /**
   * Remove an alert by ID
   * @param id - Alert ID returned by create()
   */
  remove(id: AlertId): void;

  /**
   * Get all currently active alerts
   * @returns Array of alert objects
   */
  getAll(): AlertData[];

  /**
   * Set the symbol context for new alerts
   * @param symbol - Trading pair symbol
   */
  setSymbol(symbol: string): void;

  /**
   * Subscribe to alert list changes
   * @param callback - Called when alerts are added/removed/changed
   * @returns Unsubscribe function
   */
  onChange(callback: (alerts: AlertData[]) => void): () => void;

  /**
   * Subscribe to alert trigger events
   * @param callback - Called when price crosses alert level
   * @returns Unsubscribe function
   */
  onTrigger(callback: (event: AlertTriggerEvent) => void): () => void;
}

// Data types
type AlertId = string | number;

type AlertCondition =
  | 'crossing'
  | 'crossing_up'
  | 'crossing_down'
  | 'entering'
  | 'exiting'
  | 'inside'
  | 'outside';

interface AlertData {
  id: AlertId;
  price: number;
  condition: AlertCondition;
  type: 'price' | 'tool';
}

interface AlertTriggerEvent {
  alertId: AlertId;
  alertPrice: number;
  crossingPrice: number;
  direction: 'up' | 'down';
  condition: AlertCondition;
  timestamp: number;
}
```

### 7.4 Alert Data Flow (After Boundary)

```
Host AlertManager                    Toolkit AlertAdapter
       │                                    │
       │  create(price, condition)          │
       │ ─────────────────────────────────► │
       │                                    │ → _userPriceAlerts.addAlertWithCondition()
       │                                    │ → alert fires _alertAdded
       │                                    │ → chart re-renders (line + icon visible)
       │                                    │
       │  ← onChange(alerts)                │
       │    (alertsChanged fires)           │
       │                                    │
       │  update host state                 │
       │  persist to localStorage           │
       │                                    │
       │                                    │ (price crosses alert)
       │                                    │ → _onAlertTriggered fires
       │  ← onTrigger(event)                │
       │                                    │
       │  update alert status               │
       │  show notification toast           │
       │  add to alertLogs                  │
```

### 7.5 Alert Migration Path

| Phase | Action | Files Changed | Effort |
|-------|--------|---------------|--------|
| 1 | Define `IAlertService` interface | New: `types/alert.ts` | 0.5 day |
| 2 | Create `AlertAdapter` class | New: `plugins/adapter/AlertAdapter.js` | 1 day |
| 3 | Replace 13 private accesses in ChartComponent | `ChartComponent.jsx` | 0.5 day |
| 4 | Extract alert state from App.jsx | New: `hooks/useAlerts.js` | 1 day |
| 5 | Formalize alert persistence | `hooks/useAlerts.js` | 0.5 day |
| 6 | Add TypeScript types for alert shapes | `types/alert.ts` | 0.5 day |

---

## 8. Serialization Boundary (Future)

### 8.1 Current State

| Data | Persisted | Owner | Mechanism |
|------|-----------|-------|-----------|
| Drawing annotations | ❌ NO | Plugin | Lost on reload |
| Drawing templates | ✅ YES | Plugin | localStorage `lineTool_templates` |
| Alert state | ✅ YES | Host | localStorage `tv_alerts` |
| Alert logs | ✅ YES | Host | localStorage `tv_alert_logs` |
| Chart theme | ✅ YES | Host | localStorage `tv_theme` |
| Layout config | ✅ YES | Host | localStorage `tv_saved_layout` |

### 8.2 Proposed Serialization API

```typescript
interface IStateController {
  /**
   * Export all chart state (drawings, alerts, view)
   */
  exportState(): ChartState;

  /**
   * Import chart state (restore drawings, alerts, view)
   */
  importState(state: ChartState): void;

  /**
   * Auto-save to host-provided storage
   */
  autoSave(storage: IStorageAdapter): void;
}

interface ChartState {
  version: 1;
  drawings: SerializedDrawing[];    // future: from plugin._tools
  alerts: AlertData[];
  view: {
    logicalFrom: number;
    logicalTo: number;
  };
  timestamp: number;
}

interface IStorageAdapter {
  save(key: string, data: unknown): void;
  load(key: string): unknown | null;
  remove(key: string): void;
}
```

---

## 9. File Responsibility Matrix

### 9.1 Who Owns What

| File | Owns | Must NOT depend on |
|------|------|--------------------|
| `App.jsx` | State management, orchestration, persistence | Plugin internals |
| `ChartComponent.jsx` | Chart lifecycle, bridge to plugin | Direct `_userPriceAlerts` (→ use AlertAdapter) |
| `ChartGrid.jsx` | Multi-chart layout distribution | Plugin, direct state |
| `DrawingToolbar.jsx` | Tool UI, group/popover | Plugin (only tool name strings) |
| `Topbar.jsx` | Symbol, interval, chart type UI | Plugin |
| `AlertsPanel.jsx` | Alert list display, CRUD UI | Plugin (only through host state) |
| `AlertDialog.jsx` | Alert creation form | Plugin (only through host callbacks) |
| `Watchlist.jsx` | Watchlist display, sorting | Plugin, chart |
| `line-tools.js` | Drawing rendering, alert rendering, undo/redo | Host state, React, host CSS |
| `binance.js` | Data fetching, WebSocket | Plugin, chart, React |

### 9.2 Adapter Files (New)

| File | Owns | Depends on |
|------|------|------------|
| `plugins/adapter/AlertAdapter.js` | All `_userPriceAlerts` access | Plugin private API |
| `plugins/adapter/ToolAdapter.js` (future) | All `LineToolManager` method calls | Plugin public API |
| `plugins/adapter/TimerAdapter.js` (future) | All `PriceScaleTimer` calls | Plugin public API |
| `services/ThemeController.js` (future) | Theme definition + injection | Chart options, tool defaults |
| `services/AlertService.js` (future) | Alert orchestration | AlertAdapter, host state |

---

## 10. Dependency Rules

### 10.1 Import Rules

```
ALLOWED IMPORTS:

  App.jsx
    ├── → ChartGrid.jsx
    ├── → DrawingToolbar.jsx
    ├── → Topbar.jsx
    ├── → AlertsPanel.jsx
    ├── → AlertDialog.jsx
    ├── → Toast.jsx
    ├── → SnapshotToast.jsx
    ├── → BottomBar.jsx
    ├── → Watchlist.jsx
    ├── → binance.js
    ├── → helpers.js
    └── → constants/*

  ChartComponent.jsx
    ├── → plugins/line-tools/line-tools.js (import { LineToolManager, PriceScaleTimer })
    ├── → plugins/adapter/AlertAdapter.js
    ├── → constants/toolMap.js
    ├── → utils/chartOptions.js
    └── → utils/indicators/*

  AlertAdapter.js
    └── → plugins/line-tools/line-tools.js (internal access via manager._userPriceAlerts)

  DrawingToolbar.jsx
    └── → components/ToolIcons.jsx

FORBIDDEN IMPORTS:

  line-tools.js
    └── ✗ Any file from src/components/ or src/hooks/ or src/services/

  App.jsx
    └── ✗ plugins/line-tools/line-tools.js (must go through ChartComponent ref)

  DrawingToolbar.jsx
    └── ✗ plugins/line-tools/line-tools.js

  AlertsPanel.jsx
    └── ✗ plugins/line-tools/line-tools.js

  binance.js
    └── ✗ Any React component or chart code
```

### 10.2 Data Flow Rules

```
RULE 1: Props flow DOWN only
  App → ChartGrid → ChartComponent → plugin primitives

RULE 2: Refs flow UP only
  ChartComponent → useImperativeHandle → App chartRefs[id]

RULE 3: Callbacks flow UP only
  ChartComponent → onToolUsed/onAlertsSync/onAlertTriggered → App

RULE 4: No bidirectional state
  ✗ App reading plugin._tools directly
  ✗ Plugin reading App state directly
  ✓ Bridge through adapter pattern

RULE 5: No shared mutable state
  ✗ Plugin modifying host alert array
  ✗ Host modifying plugin drawing array
  ✓ Each side owns its state, communicates via events
```

---

## 11. Risk Matrix

| Boundary Violation | Current Occurrences | Risk | Priority |
|--------------------|--------------------:|------|----------|
| Host → `_userPriceAlerts` (private) | 13 accesses | 🔴 HIGH | 1 |
| Host → `window.lineToolManager` (global) | 3 assignments | 🟡 MEDIUM | 2 |
| Plugin → `chart._impl` (LC internal) | 1 access | 🔴 HIGH | 3 |
| No serialization interface | N/A (missing) | 🟡 MEDIUM | 4 |
| Dual TemplateManagers | 2 implementations | 🟢 LOW | 5 |
| No theme injection point | N/A (missing) | 🟡 MEDIUM | 6 |
| Alert data shapes undocumented | 2 shapes | 🟡 MEDIUM | 7 |

---

## 12. Migration Roadmap

### Phase 1: Establish Boundaries (1-2 weeks)

| Step | Action | Creates |
|------|--------|---------|
| 1.1 | Define `IAlertService` interface | `types/alert.ts` |
| 1.2 | Create `AlertAdapter` class | `plugins/adapter/AlertAdapter.js` |
| 1.3 | Replace 13 private accesses | Modified `ChartComponent.jsx` |
| 1.4 | Gate window globals behind `__DEV__` | Modified `ChartComponent.jsx` |
| 1.5 | Define `TOOL_MAP` as external constant | `constants/toolMap.js` |

### Phase 2: Theme Infrastructure (2-3 weeks)

| Step | Action | Creates |
|------|--------|---------|
| 2.1 | Define `ThemeDefinition` interface | `types/theme.ts` |
| 2.2 | Extract hardcoded colors to constants | `constants/colors.js` |
| 2.3 | Create `ThemeController` class | `services/ThemeController.js` |
| 2.4 | Wire React CSS to CSS custom properties | Modified `*.module.css` |
| 2.5 | Add `applyOptions` to all tool defaults | Modified `drawing-style-map.md` targets |

### Phase 3: State Separation (2-3 weeks)

| Step | Action | Creates |
|------|--------|---------|
| 3.1 | Extract alert hooks from App.jsx | `hooks/useAlerts.js` |
| 3.2 | Extract tool state from App.jsx | `hooks/useDrawingTools.js` |
| 3.3 | Create `ToolAdapter` wrapping public API | `plugins/adapter/ToolAdapter.js` |
| 3.4 | Create `TimerAdapter` wrapping timer API | `plugins/adapter/TimerAdapter.js` |

### Phase 4: Serialization (3-4 weeks)

| Step | Action | Creates |
|------|--------|---------|
| 4.1 | Define `IStateController` interface | `types/state.ts` |
| 4.2 | Implement drawing snapshot (from `_tools[]`) | `services/DrawingSerializer.js` |
| 4.3 | Implement state restore | `services/StateRestorer.js` |
| 4.4 | Add auto-save on tool completion | Modified `ChartComponent.jsx` |
| 4.5 | Add auto-restore on chart init | Modified `ChartComponent.jsx` |

---

## 13. Quick Reference: What Can Host Do?

| Operation | Currently Possible | After Boundary Fix |
|-----------|-------------------|-------------------|
| Activate drawing tool | ✅ Via `startTool()` | ✅ Via `ToolAdapter.activate()` |
| Undo/redo drawings | ✅ Via `undo()`/`redo()` | ✅ Via `ToolAdapter.undo()`/`redo()` |
| Lock/hide drawings | ✅ Via public methods | ✅ Via `ToolAdapter.lock()` |
| Create price alert | ⚠️ Via private `_userPriceAlerts` | ✅ Via `AlertAdapter.create()` |
| Remove price alert | ⚠️ Via private `_userPriceAlerts` | ✅ Via `AlertAdapter.remove()` |
| Subscribe to alerts | ⚠️ Via private `.subscribe()` | ✅ Via `AlertAdapter.onChange()` |
| Get all alerts | ⚠️ Via private `.alerts()` | ✅ Via `AlertAdapter.getAll()` |
| Change alert line color | ❌ Hardcoded | 🔮 Via ThemeController |
| Change tool defaults | ✅ Via `applyOptions()` | ✅ Via `ToolAdapter.setStyle()` |
| Persist drawings | ❌ Not implemented | 🔮 Via StateController |
| Restore drawings | ❌ Not implemented | 🔮 Via StateController |
| Change chart theme | ✅ Via props | ✅ Via ThemeController |