# Plugin Architecture — MP Charts Toolkit

## Overview

The MP Charts Toolkit integrates a pre-compiled drawing/annotation plugin (`line-tools`) that provides TradingView-class drawing primitives, price alert markers, and a candle countdown timer. This document analyzes the plugin's architecture, integration patterns, serialization model, lifecycle, and extraction opportunities.

---

## 1. Plugin Structure

### Source Files

```
src/plugins/line-tools/
├── line-tools.js        # 6495 lines — single-file compiled bundle
├── line-tools.css       # Plugin-specific styling
├── line-tools.d.ts      # 4464 lines — TypeScript declarations (re-exports lightweight-charts types)
├── line-tools.umd.cjs   # CommonJS bundle for legacy environments
└── package.json         # Package config (type: module, dual exports)
```

### Plugin Module Export

```javascript
export {
  es as LineToolManager,   // Primary class — drawing tool orchestrator
  is as PriceScaleTimer    // Timer primitive — candle countdown
};
```

Note: `es` and `is` are minified identifiers. The plugin is compiled from TypeScript source that is not included in the repository.

### Internal Architecture (Derived from Usage)

The plugin contains approximately **60+ classes** (minified, enumerated from `class \w+` matches). Key identifiable subsystems:

| Internal Class | Recognized Via | Role |
|---|---|---|
| `LineToolManager` | Export, `new LineToolManager()` | Drawing tool orchestrator, tool lifecycle, undo/redo, serialization |
| `PriceScaleTimer` | Export, `new PriceScaleTimer()` | Candle countdown timer rendered on price scale |
| `UserPriceAlerts` | `manager._userPriceAlerts`, `new Di()` | Price alert markers on chart, event bridge |
| Various tool classes | `TOOL_MAP` in ChartComponent | Individual drawing primitive implementations (TrendLine, Fibonacci, Rectangle, Text, etc.) |
| `HistoryManager` | `this._historyManager.clear()` | Undo/redo state stack |
| `Toolbar` (internal) | `this._toolbar?.showCollapsed()`, `.hide()`, `.destroy()` | Internal toolbar (not used — shell provides its own) |
| `AlertNotifications` | `new Hi(this)` | UI notifications for triggered alerts |
| `TextInputDialog` | `this._textInputDialog?.hide()` | Internal text input dialog |
| `TemplateManager` (`ot`) | `ot.loadTemplates()`, `ot.saveTemplate()` | Drawing template CRUD |
| `DrawingUtils` | `Gt` base class | Primitive base: `attached()`, `detached()`, `requestUpdate()` |

### Plugin Size

```
line-tools.js:    ~275 KB (minified + mangled)
line-tools.d.ts:  ~132 KB (mostly lightweight-charts type re-exports)
line-tools.css:   Unknown
```

---

## 2. LineToolManager Public API

Discovered from `ChartComponent.jsx` imperative handle and effects:

### Lifecycle Methods

| Method | Source | Purpose |
|---|---|---|
| `constructor()` | `new LineToolManager()` | Create manager instance |
| `series.attachPrimitive(manager)` | LC API | Attach as lightweight-charts primitive |
| `series.detachPrimitive(manager)` | LC API | Detach from series (cleanup) |

### Tool Control

| Method | Source | Purpose |
|---|---|---|
| `startTool(toolName)` | `TOOL_MAP` usage | Activate a drawing tool by internal name |
| `clearTools()` | `imperativeHandle.clearTools` | Remove all drawings |
| `undo()` | `imperativeHandle.undo` | Undo last drawing action |
| `redo()` | `imperativeHandle.redo` | Redo last undone action |

### Drawing State

| Method | Source | Purpose |
|---|---|---|
| `lockAllDrawings()` | `useEffect([isDrawingsLocked])` | Lock drawings from editing |
| `unlockAllDrawings()` | `useEffect([isDrawingsLocked])` | Unlock drawings |
| `areDrawingsLocked()` | `useEffect` sync guard | Check current lock state |
| `hideAllDrawings()` | `useEffect([isDrawingsHidden])` | Hide all drawings |
| `showAllDrawings()` | `useEffect([isDrawingsHidden])` | Show all drawings |
| `areDrawingsHidden()` | `useEffect` sync guard | Check current visibility state |

### Coordinate / View

| Method | Source | Purpose |
|---|---|---|
| `setDefaultRange({ from, to })` | `applyDefaultCandlePosition()` | Set the default visible logical range |

### Internal Properties (Accessed via underscore)

| Property | Source | Purpose |
|---|---|---|
| `manager._userPriceAlerts` | `addPriceAlert`, `removePriceAlert` | Access alert primitive |
| `manager._alertNotifications` | Detected in minified source | Alert notification controller |
| `manager._historyManager` | Detected in minified source | Undo/redo stack |
| `manager._tools` | Detected in minified source | Array of active drawing tool instances |
| `manager._activeTool` | Detected in minified source | Currently active tool type string |
| `manager._selectedTool` | Detected in minified source | Currently selected tool instance |

---

## 3. PriceScaleTimer Public API

### Construction

```javascript
const timer = new PriceScaleTimer({
  timeframeSeconds: intervalSeconds,
  visible: isTimerVisible,
  textColor: '#FFFFFF',
  yOffset: 19,
  textPadding: 0.95
});
```

### Methods Used

| Method | Source | Purpose |
|---|---|---|
| `applyOptions({ timeframeSeconds })` | Data loading effect | Update interval when symbol/interval changes |
| `setVisible(boolean)` | `useEffect([isTimerVisible])` | Show/hide timer |
| `isVisible()` | `imperativeHandle.toggleTimer` | Check current visibility |
| `updateCandleData(open, close)` | WS callback, replay update | Update timer color based on OHLC |
| `getLastOHLC()` | Detected in minified source | Get last open/close values |
| `updateAllViews()` | Internal — called on data change | Re-render timer view |

### Options Interface

| Option | Type | Description |
|---|---|---|
| `timeframeSeconds` | number | Full interval in seconds |
| `visible` | boolean | Initial visibility |
| `textColor` | string | Timer text color |
| `yOffset` | number | Vertical pixel offset |
| `textPadding` | number | Padding ratio |

---

## 4. UserPriceAlerts API (Private)

Accessed via `manager._userPriceAlerts`. Not part of the public export. This is a design smell — the integration relies on duck-typing private property access.

### Methods Used

| Method | Source | Purpose |
|---|---|---|
| `setSymbolName(symbol)` | `addPriceAlert()` | Set current symbol context |
| `addAlertWithCondition(price, condition)` | `addPriceAlert()` | Create alert without dialog |
| `openEditDialog(alertId, options)` | `addPriceAlert()` (fallback) | Open alert edit dialog |
| `removeAlert(externalId)` | `removePriceAlert()` | Remove alert by ID |
| `alerts()` | `initializeLineTools()` | Get current alerts array |
| `alertsChanged()` | `initializeLineTools()` | Subscribe to alert change events |
| `alertTriggered()` | `initializeLineTools()` | Subscribe to alert trigger events |
| `openToolAlertDialog(tool)` | Detected in minified source | Open alert dialog for a drawing tool |

### Alert Data Shape

From `handleChartAlertsSync` in App.jsx:

```javascript
// Chart alert object (from userAlerts.alerts())
{
  id: number,
  price: number,
  condition: 'crossing' | 'crossing_up' | 'crossing_down',
  type: 'price'
}

// Trigger event (from userAlerts.alertTriggered())
{
  alertId: number,
  alertPrice: number,
  timestamp: number,
  direction: string,
  condition: string
}
```

---

## 5. Tool Activation Chain

### Full Lifecycle

```
Shell Layer:
1. User clicks tool button in DrawingToolbar
2. DrawingToolbar.handleGroupClick() → App.handleToolChange(toolId)
3. App.jsx: setActiveTool(toolId)

Integration Layer:
4. ChartComponent.useEffect([activeTool, onToolUsed]) fires
5. TOOL_MAP[activeTool] maps UI tool ID → plugin tool name
   e.g. 'trendline' → 'TrendLine', 'fibonacci' → 'FibRetracement'
6. lineToolManagerRef.current.startTool(mappedTool)

Plugin Layer:
7. LineToolManager._selectTool(mappedTool)
8. Plugin sets _activeToolType, _isDrawing = false
9. Plugin updates internal toolbar state (if any)
10. Plugin disables chart scrolling/zooming during drawing
11. User draws on chart canvas (mouse events captured by plugin)

Completion:
12. Plugin detects drawing finished → call wrapped startTool with 'None'
13. Wrapped method detects tool → 'None' → triggers onToolUsed()
14. App.jsx: setActiveTool(null)
15. ChartComponent Effect: onToolUsed fires → activeTool = null

Cancellation:
16. User right-clicks → container contextmenu event → onToolUsed()
17. OR: User presses ESC → ChartComponent keydown → onToolUsed()
18. App.jsx: setActiveTool(null)
```

### Tool Name Mapping

```javascript
// src/components/Chart/ChartComponent.jsx
const TOOL_MAP = {
  'cursor': 'None',
  'eraser': 'Eraser',
  'trendline': 'TrendLine',
  'arrow': 'Arrow',
  'ray': 'Ray',
  'extended_line': 'ExtendedLine',
  'horizontal': 'HorizontalLine',
  'horizontal_ray': 'HorizontalRay',
  'vertical': 'VerticalLine',
  'cross_line': 'CrossLine',
  'parallel_channel': 'ParallelChannel',
  'fibonacci': 'FibRetracement',
  'fib_extension': 'FibExtension',
  'pitchfork': 'Pitchfork',
  'brush': 'Brush',
  'highlighter': 'Highlighter',
  'rectangle': 'Rectangle',
  'circle': 'Circle',
  'path': 'Path',
  'text': 'Text',
  'callout': 'Callout',
  'price_label': 'PriceLabel',
  'pattern': 'Pattern',
  'triangle': 'Triangle',
  'abcd': 'ABCD',
  'xabcd': 'XABCD',
  'elliott_impulse': 'ElliottImpulseWave',
  'elliott_correction': 'ElliottCorrectionWave',
  'head_and_shoulders': 'HeadAndShoulders',
  'prediction': 'LongPosition',
  'prediction_short': 'ShortPosition',
  'date_range': 'DateRange',
  'price_range': 'PriceRange',
  'date_price_range': 'DatePriceRange',
  'measure': 'Measure',
  'zoom_in': 'None',      // Handled separately
  'zoom_out': 'None',     // Handled separately
  'remove': 'None'
};
```

### Special Tool Behaviors

| Tool ID | Plugin Name | Behavior |
|---|---|---|
| `cursor` | `None` | Default mode, no drawing |
| `eraser` | `Eraser` | Deletes drawings on click (plugin handles deletion) |
| `zoom_in` / `zoom_out` | `None` | Zoom handled by ChartComponent click handler, not plugin |
| `lock_all` | N/A | Calls `manager.lockAllDrawings()` |
| `hide_drawings` | N/A | Calls `manager.hideAllDrawings()` |
| `clear_all` | N/A | Calls `manager.clearTools()` |
| `show_timer` | N/A | Toggles `priceScaleTimerRef.current.setVisible()` |
| `undo` / `redo` | N/A | Calls `manager.undo()` / `manager.redo()` |

These "action tools" **do not pass through `startTool`** — they are handled directly through other methods.

---

## 6. Drawing Lifecycle

### Drawing Creation

```
1. startTool('TrendLine') → plugin enters drawing mode
2. Plugin disables chart scroll/scale
3. Mouse events captured:
   - mousedown: record first point
   - mousemove: preview line
   - mouseup: finalize line
4. Plugin creates tool instance → adds to _tools array
5. Plugin enables chart scroll/scale
6. Plugin creates history snapshot for undo
7. Plugin calls _requestUpdate → lightweight-charts re-renders
8. Wrapped startTool detects completion → onToolUsed()
```

### Drawing Deletion

```
Clear All Drawings:
  App.handleToolChange('clear_all')
    → chartRef.clearTools()
    → lineToolManager.clearTools()

Single Eraser:
  startTool('Eraser') → user clicks on drawing
    → plugin detects hit → tool.detachPrimitive()
    → removes from _tools array
    → requestUpdate()
    → back to cursor mode
```

### Undo/Redo

```
Undo:
  App.handleToolChange('undo')
    → chartRef.undo()
    → lineToolManager.undo()
    → _historyManager reverses last action
    → requestUpdate()

Redo:
  Same chain with redo()
```

### Lock/Visibility

```
Lock All:
  isDrawingsLocked → true → manager.lockAllDrawings()
  Effect: drawings become non-interactive (no drag, no select)
  Guard: manager.areDrawingsLocked() prevents redundant calls

Hide All:
  isDrawingsHidden → true → manager.hideAllDrawings()
  Effect: drawings not rendered (invisible)
  Guard: manager.areDrawingsHidden() prevents redundant calls
```

---

## 7. Alert Bridge Architecture

The alert system bridges three layers:

```
App.jsx (Alert State Management)
  │
  ├── handleSaveAlert() → chartRef.addPriceAlert() → userAlerts.addAlertWithCondition()
  │
  ├── handleChartAlertsSync() ← userAlerts.alertsChanged().subscribe()
  │     When user creates alert via plugin UI
  │
  ├── handleChartAlertTriggered() ← userAlerts.alertTriggered().subscribe()
  │     When price crosses alert level
  │
  ├── handleRemoveAlert(id)
  │     If _source === 'lineTools' → chartRef.removePriceAlert(externalId)
  │
  ├── handlePauseAlert(id)
  │     chartRef.removePriceAlert(externalId)
  │     Sets status to 'Paused' (preserves alert in state)
  │
  └── handleRestartAlert(id)
        chartRef.restartPriceAlert(price, condition)
        Sets status to 'Active'
```

### Alert Data Flow

```
Creating an alert:

Shell (App.jsx)                 Plugin (line-tools)
  │                                    │
  │  handleSaveAlert()                 │
  │    → addPriceAlert()               │
  │      → userAlerts.addAlertWithCondition()
  │      → alert created on chart      │
  │                                    │
  │  ← alertsChanged() fires           │
  │  ← handleChartAlertsSync()         │
  │    → syncs to AlertsPanel          │
  │                                    │
  │  (or user creates alert            │
  │   via plugin's internal dialog)    │
  │    → alertsChanged() fires         │
  │  ← handleChartAlertsSync()         │
  │    → creates new alert in state    │
```

### Alert State Shape

```javascript
// App-level alert (stored in state + localStorage)
{
  id: 'lt-1-12345',              // Composite ID: `lt-${chartId}-${externalId}`
  externalId: 12345,             // Plugin's alert ID
  symbol: 'BTCUSDT',
  price: '45000.00',             // Display-formatted
  condition: 'Crossing 45000.00', // Human-readable
  status: 'Active',              // 'Active' | 'Paused' | 'Triggered'
  created_at: '2026-05-30T...',  // ISO timestamp
  _source: 'lineTools',          // Origin marker
  chartId: 1                     // Chart instance ID
}

// Plugin-level alert (inside line-tools)
{
  id: 12345,
  price: 45000,
  condition: 'crossing',
  type: 'price'
}
```

### Alert Lifecycle States

```
        ┌──────────┐
        │  Active  │ ← initial state
        └────┬─────┘
             │
    ┌────────┴────────┐
    │                  │
    ▼                  ▼
┌────────┐     ┌───────────┐
│ Paused │     │ Triggered │ ← automated or manual
└────────┘     └─────┬─────┘
    │                  │
    └────┬─────────────┘
         │ (restart)
         ▼
      ┌──────────┐
      │  Active  │
      └──────────┘
```

---

## 8. Serialization & Persistence

### Current State

The line-tools plugin **does NOT expose serialization methods** through its public API. There is no `export()`, `import()`, `serialize()`, `getToolsData()`, or `setToolsData()` method called from the shell.

**Implication:** Drawing tool data is **not persisted across sessions**. When the page reloads, all drawings are lost.

### What IS Persisted (Shell-level)

| Data | Mechanism | Persistence |
|---|---|---|
| Chart type, symbol, interval | localStorage `tv_interval`, `tv_saved_layout` | ✅ Per-session |
| Theme | localStorage `tv_theme` | ✅ Per-session |
| Favorite intervals | localStorage `tv_fav_intervals_v2` | ✅ Per-session |
| Custom intervals | localStorage `tv_custom_intervals` | ✅ Per-session |
| Watchlist | localStorage `tv_watchlist` | ✅ Per-session |
| Alerts (app-level) | localStorage `tv_alerts`, `tv_alert_logs` | ✅ 24h retention |
| Drawing templates | localStorage `tv_drawing_templates` | ✅ Per-session |
| **Drawing annotations** | **NOT persisted** | ❌ Lost on reload |

### Drawing Templates (Plugin-level)

The plugin has an internal `TemplateManager` (`ot` class) that saves/loads drawing templates from localStorage (`key 'tv-drawing-templates'`). This is separate from the shell's `TemplateManager.js`.

```javascript
// Plugin's static TemplateManager API
TemplateManager.loadTemplates()    // Load all from localStorage
TemplateManager.saveTemplate(name, data)  // Save template
TemplateManager.deleteTemplate(id)  // Delete template
TemplateManager.getTemplate(id)    // Get by ID
```

### Shell's TemplateManager vs Plugin's TemplateManager

| Aspect | Shell (`src/utils/TemplateManager.js`) | Plugin (internal) |
|---|---|---|
| Persistence key | `tv_drawing_templates` | `tv-drawing-templates` (likely) |
| Scope | Drawing configurations (color, line width, tool type) | Drawing configurations |
| Integration | Uses `tool` + `options` → sets defaults for new drawings | Used by plugin's internal toolbar |
| Current usage | Not actively called from ChartComponent or App | Plugin-internal |
| Activation | Manual through toolbar templates | Via plugin's internal context menu |

**Note:** The shell's TemplateManager is **not connected to the plugin**. It exists as a standalone utility that could theoretically drive the plugin's template system but currently has no integration pathway.

---

## 9. Chart Integration Points Summary

### Mount Sequence

```
ChartComponent mount
  │
  1. createChart() → lightweight-charts instance
  2. createSeries() → main series (Candlestick/Bar/Line/etc.)
  3. initializeLineTools(series):
       a. new LineToolManager()
       b. Wrap manager.startTool to detect completion → onToolUsed
       c. series.attachPrimitive(manager)
       d. Bridge alerts:
            - userAlerts.setSymbolName(symbol)
            - userAlerts.alertsChanged().subscribe() → onAlertsSync
            - userAlerts.alertTriggered().subscribe() → onAlertTriggered
       e. Assign window globals:
            window.lineToolManager = manager
            window.chartInstance = chartRef.current
            window.seriesInstance = series
  4. initializePriceScaleTimer(series, intervalSeconds):
       a. new PriceScaleTimer({ options })
       b. series.attachPrimitive(timer)
  5. loadData() → fetch klines → setData → setup WebSocket
```

### Cleanup Sequence

```
ChartComponent unmount
  │
  1. Clear window globals: lineToolManager = null, etc.
  2. unsubscribeVisibleLogicalRangeChange
  3. Disconnect ResizeObserver
  4. Close WebSocket
  5. chart.remove() → destroys all primitives including LineToolManager and PriceScaleTimer
```

### Series Re-creation

When chart type changes:
```
useEffect([chartType, symbol]):
  1. Create new series
  2. initializeLineTools(newSeries)  ← creates NEW LineToolManager
  3. Re-attach timer primitive to new series
  4. Cleanup function:
       - lineToolManager.clearTools()
       - mainSeriesRef.current.detachPrimitive(lineToolManagerRef.current)
       - chart.removeSeries(mainSeriesRef.current)
```

**Warning:** Series re-creation destroys all drawings (new LineToolManager = empty state). There is no mechanism to preserve drawings across chart type changes.

---

## 10. Window Globals (Debug/Dev Interface)

The integration exposes the plugin internals to the global scope:

```javascript
window.lineToolManager = manager;    // Full line tool access
window.chartInstance = chartRef.current;  // LC chart instance
window.seriesInstance = series;      // LC series instance
```

These are set during `initializeLineTools()` and cleared during cleanup. They provide a debug interface for development but also indicate tight coupling between the shell and plugin internals.

---

## 11. Plugin Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         SHELL LAYER                              │
│                                                                  │
│  DrawingToolbar    Topbar          App.jsx          AlertsPanel  │
│  (tool palette)  (timer btn)   (activeTool state)   (alerts)    │
│       │              │              │                   ▲       │
│       ▼              ▼              ▼                   │       │
│  ┌──────────────────────────────────────────────────────┘       │
│  │  ChartComponent.jsx  (bridge orchestration)                  │
│  │                                                              │
│  │  ┌──────────────────────────────────────────────────────┐    │
│  │  │  TOOL_MAP → startTool()    useImperativeHandle()    │    │
│  │  │  useEffects: [activeTool, isDrawingsLocked, ...]    │    │
│  │  │  alert bridge: subscribe → callback                 │    │
│  │  │  timer bridge: applyOptions, setVisible              │    │
│  │  └──────────────────┬───────────────────────────────────┘    │
│  └─────────────────────┼────────────────────────────────────────┘
│                        │
├────────────────────────┼────────────────────────────────────────┤
│                   PLUGIN LAYER                                   │
│                        │                                         │
│          ┌─────────────▼──────────────┐                          │
│          │    LineToolManager         │                          │
│          │                            │                          │
│          │  ┌──────────────────────┐  │                          │
│          │  │  _tools[]            │  │  ← active drawing instances│
│          │  │  _activeTool         │  │  ← current tool type    │
│          │  │  _historyManager     │  │  ← undo/redo stack      │
│          │  │  _userPriceAlerts    │  │  ← alert primitive      │
│          │  └──────────────────────┘  │                          │
│          │                            │                          │
│          │  ┌──────────────────────┐  │                          │
│          │  │  attachPrimitive()   │──┼──► lightweight-charts   │
│          │  │  requestUpdate()     │  │    primitive API         │
│          │  └──────────────────────┘  │                          │
│          └──────────┬─────────────────┘                          │
│                     │                                            │
│          ┌──────────▼─────────────────┐                          │
│          │    PriceScaleTimer         │                          │
│          │    (attached primitive)     │                          │
│          └────────────────────────────┘                          │
│                                                                  │
│          Drawing Tools (60+ internal classes)                    │
│          ┌──────────────────────────────────────────────────┐    │
│          │ TrendLine  │ Arrow     │ Fibonacci  │ Rectangle  │    │
│          │ Ray        │ Ellipse   │ Text       │ Callout    │    │
│          │ Path       │ Brush     │ Highlighter│ Measure    │    │
│          │ ... (40+ drawing primitives)                       │    │
│          └──────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 12. Identified Architectural Issues

### 1. Private Property Access (High Risk)

```javascript
manager._userPriceAlerts          // Access to private primitive
manager._userPriceAlerts.setSymbolName()
manager._userPriceAlerts.addAlertWithCondition()
manager._userPriceAlerts.removeAlert()
manager._userPriceAlerts.alertsChanged()
manager._userPriceAlerts.alertTriggered()
manager._userPriceAlerts.alerts()
```

The alert bridge relies entirely on underscore-prefixed private properties. If the plugin is updated/rebuilt, these access patterns may break. There is no public API for alerts.

**Impact:** Critical — the entire alert system breaks if plugin internals change.

### 2. No Drawing Serialization (Medium Risk)

The plugin does not expose `export()` / `import()` or any serialization interface. Drawings are:
- Lost on page reload
- Lost on chart type change (series re-creation)
- Lost on multi-chart layout reconfiguration
- Not shareable between users

**Impact:** Medium — users cannot save their analysis.

### 3. Window Globals (Low Risk, Code Smell)

```javascript
window.lineToolManager = manager;
window.chartInstance = chartRef.current;
window.seriesInstance = series;
```

These globals are a development convenience but create implicit coupling. They should be isolated to dev mode or removed.

### 4. No Plugin Versioning (Low Risk)

The plugin is loaded as a static bundle with no version information. There is no way to verify compatibility between the shell integration code (ChartComponent) and the plugin version.

### 5. Dual TemplateManagers (Low Risk, Confusion)

The shell has `src/utils/TemplateManager.js` and the plugin has its own internal `TemplateManager`. Both manage drawing templates but they are not connected. This creates confusion about which one to use.

### 6. Series Re-creation Destroys Plugin State (Medium Risk)

When chart type changes, the entire series is destroyed and re-created. This:
- Destroys all drawings (new LineToolManager instance)
- Destroys alert markers (new UserPriceAlerts instance)
- Destroys timer (may be re-attached but with reset state)
- There is no snapshot/restore mechanism

---

## 13. Future Extraction Opportunities

### 13.1 Plugin Adapter Layer (High Priority)

Create a facade/adapter that wraps `LineToolManager` and provides a stable public API:

```javascript
// src/plugins/adapter/LineToolsAdapter.js
class LineToolsAdapter {
  constructor(series) {
    this._manager = new LineToolManager();
    series.attachPrimitive(this._manager);
  }

  // Public API — stable, versioned
  activateTool(toolName) { ... }
  deactivateTool() { ... }
  clearAll() { ... }
  undo() { ... }
  redo() { ... }
  lockDrawings() { ... }
  unlockDrawings() { ... }
  hideDrawings() { ... }
  showDrawings() { ... }

  // Alert API — replaces private property access
  createAlert(price, condition) { ... }
  removeAlert(externalId) { ... }
  onAlertsChanged(callback) { ... }
  onAlertTriggered(callback) { ... }
  getAlerts() { ... }

  // Serialization API — enables persistence
  exportDrawings() { ... }
  importDrawings(data) { ... }

  // Lifecycle
  destroy() { ... }
}
```

**Benefits:**
- Single point of change when plugin updates
- Stable public API for shell integration
- Can implement serialization by preserving drawing data
- Version-checkable

### 13.2 Drawing Serialization (Medium Priority)

If the plugin's internal drawing data structure can be captured (via `_tools` array), implement a serialization layer:

```javascript
// Proposed API
adapter.exportDrawings()
// → JSON string of all drawing data (tool type, points, options, style)

adapter.importDrawings(jsonString)
// → Restores all drawings from serialized data

// Persistence strategy:
// auto-save on tool completion
// auto-restore on chart init
// localStorage key: tv_drawings_v2
```

**Alternative:** If `_tools` is not accessible, the plugin may need to be rebuilt from source with serialization support added.

### 13.3 Plugin Source Recovery (High Priority, If Possible)

The plugin is currently a minified bundle. If the original TypeScript source is available:

1. Fork or maintain the source separately
2. Add missing public APIs (serialization, alert API)
3. Add versioning
4. Build as a proper ES module
5. Type the public API surfaces

### 13.4 Alert Bridge Formalization (High Priority)

Replace the five separate callbacks (`onAlertsSync`, `onAlertTriggered`, `addPriceAlert`, `removePriceAlert`, `restartPriceAlert`) with a unified alert service:

```javascript
// src/services/AlertBridge.js
class AlertBridge {
  constructor(adapter) {
    this._adapter = adapter;
  }

  // Unified subscription
  onAlertCreated(callback) { ... }
  onAlertTriggered(callback) { ... }

  // Unified commands
  createAlert(symbol, price, condition) { ... }
  removeAlert(id) { ... }
  pauseAlert(id) { ... }
  resumeAlert(id, price, condition) { ... }
}
```

### 13.5 Timer Service (Low Priority)

Extract `PriceScaleTimer` integration from ChartComponent into a small service:

```javascript
// src/plugins/adapter/TimerAdapter.js
class TimerAdapter {
  constructor(series, options) {
    this._timer = new PriceScaleTimer(options);
    series.attachPrimitive(this._timer);
  }

  setVisible(visible) { ... }
  updateInterval(seconds) { ... }
  updateCandle(open, close) { ... }
  destroy() { ... }
}
```

---

## 14. Recommendations

| Priority | Action | Reason |
|---|---|---|
| 🔴 Critical | Create PluginAdapter layer to encapsulate `_userPriceAlerts` access | Private property access is fragile — will break on plugin update |
| 🔴 Critical | Add drawing serialization (export/import) | Users cannot save their work — worst UX gap |
| 🟡 High | Recover or rebuild plugin source with public API | Current minified bundle is unmaintainable |
| 🟡 High | Remove window globals or gate behind `__DEV__` flag | Implicit coupling, production security concern |
| 🟢 Medium | Formalize alert bridge into a service | Separate alert orchestration from ChartComponent |
| 🟢 Medium | Implement snapshot/restore across series changes | Prevent drawing loss on chart type switch |
| 🔵 Low | Extract TimerAdapter | Minor cleanup |
| 🔵 Low | Consolidate dual TemplateManagers | Remove confusion |

---

## 15. Plugin vs Shell Responsibility Matrix

| Concern | Current Owner | Should Be | Notes |
|---|---|---|---|
| Drawing tool activation | Shell + Plugin | Plugin | Through adapter |
| Drawing rendering | Plugin | Plugin | Core plugin job |
| Undo/redo stack | Plugin | Plugin | Internal, works |
| Lock/hide drawings | Plugin | Plugin | Through adapter |
| Price alert markers | Plugin (private) | Plugin (public) | Needs API exposure |
| Alert state management | Shell (App.jsx) | Shell | Should stay |
| Alert persistence | Shell (localStorage) | Shell | Should stay |
| Drawing persistence | MISSING | Plugin + Shell | Plugin exports, Shell stores |
| Drawing templates | Plugin (internal) + Shell (dead code) | Plugin | Consolidate to Plugin only |
| Timer countdown | Plugin | Plugin | Through adapter |
| Tool icons | Shell (ToolIcons.jsx) | Shell | UI concern |
| Tool grouping | Shell (DrawingToolbar) | Shell | UI concern |
| Coordinate math | Plugin | Plugin | `coordinateHelpers.js` in shell is unused |
| Chart type change | Shell (ChartComponent) | Shell | Must signal plugin to snapshot/restore |