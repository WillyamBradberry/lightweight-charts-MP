# Workstation Shell Architecture — MP Charts Toolkit

## Overview

This document analyzes the MP Charts Toolkit as a **TradingView-like chart workstation shell** — a UI shell that orchestrates workspaces, toolbars, panels, dialogs, and chart rendering into a cohesive desktop-grade trading interface. The shell provides the environment; the chart engine provides the rendering.

---

## 1. Shell vs Engine Separation

The architecture contains a natural but currently undocumented boundary between the **workstation shell** (UI orchestration layer) and the **chart engine** (rendering + data layer). Explicitly recognizing this boundary is the key to successful modularization.

### Shell (Workstation UI)

```
App.jsx                   → Workspace orchestrator
Layout.jsx                → Grid shell
Topbar.jsx                → Command bar
DrawingToolbar.jsx        → Tool palette
RightToolbar.jsx          → Panel switcher
Watchlist.jsx             → Symbol watchlist panel
AlertsPanel.jsx           → Alert management panel
BottomBar.jsx             → Status bar / time range
SymbolSearch.jsx          → Search modal
AlertDialog.jsx           → Alert creation dialog
Toast.jsx                 → Notification system
SnapshotToast.jsx         → Success notification
ReplayControls.jsx        → Replay mode controller
ReplaySlider.jsx          → Replay timeline slider
ErrorBoundary.jsx         → Error recovery shell
TemplateManager.js        → Drawing template manager
ChartGrid.jsx             → Multi-chart orchestrator (boundary)
```

### Engine (Chart Rendering)

```
ChartComponent.jsx        → lightweight-charts bridge (core engine)
src/plugins/line-tools/   → Drawing primitives (engine extension)
src/utils/indicators/     → Technical indicator calculations (engine)
src/utils/chartUtils.js   → Heikin-Ashi transform (engine)
src/utils/timeframes.js   → Interval conversion (engine)
src/services/binance.js   → Data provider (engine service)
src/utils/coordinateHelpers.js → Coordinate math (engine)
```

### Current Problem

The shell and engine are **merged in App.jsx and ChartComponent.jsx**:
- App.jsx mixes workspace orchestration with data fetching, WebSocket management, and alert business logic
- ChartComponent.jsx mixes chart rendering with replay mode orchestration, line tool state sync, and indicator lifecycle

---

## 2. Workspace Orchestration

### Multi-Chart Workspace Model

```
App.jsx (workspace state)
  ├── layout: '1' | '2' | '3' | '4'         → grid template selector
  ├── activeChartId: number                  → focused chart in multi-mode
  ├── charts: Array<{
  │     id, symbol, interval,
  │     indicators: { sma, ema },
  │     comparisonSymbols: []
  │   }>                                     → per-chart configuration
  └── chartRefs: Map<id, imperativeHandle>   → imperative control bridge
```

**UX Pattern:** TradingView's workspace model where each "chart tab" retains its own symbol, interval, indicators, and comparison symbols. The shell manages the array, the engine renders instances.

### Current Limitations

| Limitation | Impact |
|---|---|
| Flat chart array, no named workspaces | Cannot save/load multiple named workspaces |
| Layout change mutates chart array in place | Chart reconfiguration destroys and recreates instances |
| No undo for workspace operations | Layout changes are destructive (cannot undo split/merge) |
| No chart tab bar | Multi-chart navigation uses click-to-focus on grid cells only |

### Valuable Shell Pattern — Keep Stable

The **per-chart configuration model** (each chart has its own `{ symbol, interval, indicators, comparisonSymbols }`) is the correct abstraction. This is the shell's job — aggregating per-chart state and distributing it to engine instances.

The **`chartRefs` imperative bridge** pattern (`chartRefs.current[id].method()`) is a pragmatic shell-to-engine communication mechanism that should be preserved and formalized (not replaced).

---

## 3. Toolbar Systems

### Three-Toolbar Architecture

The shell implements a **three-toolbar layout** mimicking TradingView's workspace:

```
┌──────────────────────────────────────────────────────────────┐
│  Topbar (command bar)                                        │
├──────────┬───────────────────────────────────────────────────┤
│          │                                                   │
│ Drawing  │   Chart Area                                      │
│ Toolbar  │                                                   │
│ (left)   │                                                   │
│          │                                                   │
├──────────┴────────────────────────────────────────┬──────────┤
│  BottomBar (status bar)                           │ RightTB  │
└───────────────────────────────────────────────────┴──────────┘
```

### 3.1 Topbar — Command Bar (676 lines)

**Role:** Primary command interface — symbol entry, interval selection, chart type, indicators, layout, theme, undo/redo, alerts, replay, save, snapshot, fullscreen.

**UX Patterns:**
- **Button groups with separators** — visual grouping of related commands
- **Dropdown menus** — 5 independent dropdowns (timeframes, chart types, indicators, snapshot, layout) with consistent positioning via `getBoundingClientRect`
- **Favorite intervals row** — inline radio-button-like interval selector with overflow dropdown
- **Collapsible sections** — expandable/collapsible timeframe groups within dropdown
- **Custom interval adder** — inline form within dropdown (number + unit select)
- **Inline SVG icons** — hand-crafted TradingView-style icons

**Valuable Shell Architecture (Keep Stable):**
- The **scrollable overflow wrap** pattern (`overflowWrap` → `inner` → `wrapOverflow` → `scrollWrap` → `content`) handles responsive narrowing gracefully
- The **`calculatePosition()` + click-outside** dropdown pattern is reusable and consistent across all 5 menus
- **Collapsible sections** with caret icon + `expandedSections` state is a clean abstraction for large dropdowns

**Should Extract to Services:**
- Dropdown position calculations → `src/utils/dropdownPosition.js`
- Timeframe data definitions → `src/constants/timeframes.js`

### 3.2 Drawing Toolbar — Tool Palette (310 lines)

**Role:** Left sidebar containing all drawing/annotation tool selectors.

**UX Patterns:**
- **Grouped tool buttons** — 13 groups with semantic separation (cursor, lines, fibonacci, shapes, text, patterns, predictions, measure, zoom, timer, lock, visibility, delete)
- **Group popover** — secondary click (arrow button) opens a popover showing all tools in the group; primary click activates the last-selected tool
- **Toggle tools** — special tools (lock_all, hide_drawings, show_timer) show persistent active/highlighted state
- **Conditional zoom-out** — zoom-out button appears only when zoom mode is expanded, disappears when other tools are selected
- **Active tool persistence** — each group remembers the last selected tool via `groupActiveTools` state

**Valuable Shell Architecture (Keep Stable):**
- The **tool group + popover** pattern is the correct abstraction for palettes with many tools
- **`groupActiveTools`** state is essential UX — preserves user's tool preference per group
- **Separator indices** are explicit and maintainable in the declarative `toolGroups` array

**Keep Stable — Do Not Extract:**
- The toolbar is pure UI shell, not engine. Its value is in the UX patterns, not the logic.
- The only extraction needed is `TOOL_MAP` → shared constants file (already identified in extraction plan)

### 3.3 RightToolbar — Panel Switcher (35 lines)

**Role:** Vertical icon bar to toggle between Watchlist and Alerts panels.

**UX Pattern:**
- Toggle on click, toggle off if same panel is active
- **Badge count** for unread alerts
- Two-state icon display (active/inactive via CSS class)

**Valuable Shell Architecture:**
- Minimal and focused. This is the correct abstraction for panel switching.
- **Keep as-is** — no extraction needed.

### 3.4 BottomBar — Status Bar (76 lines)

**Role:** Time range presets + chart settings (log scale, auto scale, reset zoom) + timezone display.

**UX Pattern:**
- **Time range radio group** — preset buttons with active state
- **Separator-separated right section** — toggles for log/auto/reset

**Valuable Shell Architecture:**
- Simple presentational component. Minimal logic.
- **Keep as-is** — data flows through props, no state management.

---

## 4. Floating Panels & Dialogs

### 4.1 SymbolSearch — Full-Screen Search Modal (109 lines)

**Role:** TradingView-style symbol lookup with search, filtering, and multi-mode selection.

**UX Patterns:**
- **Full-screen overlay** (not a small modal) — provides maximum context for symbol selection
- **Debounced search** — filters on both `symbol` and `baseAsset`
- **Multi-mode behavior**:
  - `switch` mode: select → close modal → change chart symbol
  - `compare` mode: select → stay open → add comparison symbol (multiple allowed)
  - `add` mode: select → close → add to watchlist
- **Checkmark indicator** — shows which symbols are already added (compare mode)
- **Column layout**: Symbol (base/quote split), Description (base/quote), Exchange (BINANCE)

**Valuable Shell Architecture (Keep Stable):**
- The **search mode abstraction** (`searchMode: 'switch' | 'compare' | 'add'`) is the correct pattern. This enables SymbolSearch to be used from multiple contexts.
- The **checkmark indicator** for already-selected items is essential UX.

**Should Extract:**
- Symbol data fetching → `src/services/exchangeInfo.js` (Binance-specific)
- Symbol filtering logic → `src/utils/symbolFilter.js`
- Interactive behavior stays in component

### 4.2 AlertDialog — Alert Creation Modal (65 lines)

**Role:** Modal for creating a price alert with condition and value.

**UX Patterns:**
- **Overlay with backdrop dismiss**
- **Pre-filled price value** from current chart price
- **Condition dropdown** (Crossing, Crossing Up, Crossing Down, Greater Than, Less Than)
- **Save/Cancel** buttons with callback pattern

**Valuable Shell Architecture:**
- Generic dialog pattern that could be reused
- **Keep stable** — extend condition options via props/template rather than hardcoding

### 4.3 Toast System — Notifications

**Dual-tier notification system:**

| Type | Component | Position | Duration | Icon | Close |
|---|---|---|---|---|---|
| Error/Success/Info | `Toast.jsx` | Top-right | 5s | AlertCircle/CheckCircle/Info | X button |
| Success-only | `SnapshotToast.jsx` | Bottom | 3s | Check + 👍 emoji | Auto-dismiss |

**UX Patterns:**
- **Singleton toast** — only one visible at a time (previous cleared before new)
- **Timeout management** — `useRef` for timeout IDs with cleanup on unmount
- **Type-based styling** — CSS class per type (error/success/info)

**Valuable Shell Architecture:**
- The **singleton pattern** is appropriate for a trading workstation (avoids toast pileup during rapid alert triggers)
- **Keep stable** — both components are correct for their roles

### 4.4 Replay Overlays

**Two-component replay system:**

| Component | Role | UX Pattern |
|---|---|---|
| `ReplayControls.jsx` | Control bar | Play/Pause, Forward, Jump-to-bar, Speed menu, Close |
| `ReplaySlider.jsx` | Timeline slider | Mouse-follow, drag-to-scrub, locked/auto modes, fade overlay, time tooltip |

**UX Patterns (ReplaySlider — 256 lines, notably complex):**
- **Three interaction modes:**
  1. **Playback mode** — slider hidden, data-driven updates
  2. **Preview mode** (mouse following) — slider visible, shows fade overlay, dims future candles
  3. **Locked mode** (after click) — slider hidden, position locked
- **Throttled drag updates** (50ms) for smooth performance during scrubbing
- **Dual update behavior**: drag = preview (show all with fade), release = commit (hide future)
- **Fade overlay** — CSS-based dimming of future candles during preview
- **Time tooltip** on handle hover/drag

**Valuable Shell Architecture:**
- The **mode-based slider behavior** (preview vs locked vs playing) is sophisticated UX that should be **preserved exactly**
- The **fade overlay** as a separate visual layer is the correct pattern

**Should Extract to Service:**
- Replay data logic (slicing, series updates) → `useReplayMode` hook (already in extraction plan)
- Slider visual behavior stays in component

---

## 5. Chart Layout Composition

### 5.1 Layout.jsx — Grid Shell (40 lines)

**Role:** Pure presentational CSS grid that arranges all shell regions.

**UX Pattern:**
- **Slot-based composition**: `leftToolbar`, `topbar`, `chart`, `bottomBar`, `watchlist`, `optionsPanel`, `rightToolbar` slots
- **Conditional rendering** of right-side panels (watchlist, optionsPanel, rightToolbar)
- **CSS visibility toggle** for left toolbar (via `isLeftToolbarVisible`)

**Valuable Shell Architecture (Keep Stable):**
- The **slot-based layout** is the correct grid shell abstraction
- Adding/removing regions does not require layout component changes
- **Preserve the slot interface** — this is the public facade for workspace layout

### 5.2 ChartGrid.jsx — Multi-Chart Orchestrator (53 lines)

**Role:** Renders N `ChartComponent` instances based on layout configuration.

**UX Patterns:**
- **Dynamic grid classes** — `grid1` through `grid4` CSS classes drive the grid template
- **Active chart highlighting** — visual border on focused chart in multi-mode
- **Per-chart prop distribution** — each chart gets its own `symbol`, `interval`, `indicators`, `comparisonSymbols`
- **Callback wrapping** — wraps per-chart callbacks with `chart.id` context

**Valuable Shell Architecture (Keep Stable):**
- This is the **engine factory** — it instantiates and configures engine instances
- The **callback wrapping pattern** (`onAlertsSync → (alerts) => onAlertsSync(chart.id, chart.symbol, alerts)`) is essential for maintaining context
- **Preserve the factory interface** — it cleanly separates shell (grid management) from engine (chart instances)

---

## 6. Watchlist Panel — Data Grid (192 lines)

**Role:** Reorderable, sortable, resizable data grid with real-time price updates.

**UX Patterns:**
- **Column resizing** — mouse drag on resize handles between columns, min width enforcement
- **Column sorting** — click header to cycle through: asc → desc → unsorted (null)
- **Row drag-and-drop** — `draggable`, `onDragStart`, `onDragOver`, `onDrop` with visual dragging state
- **Real-time updates** — WebSocket push updates color-coded cell values (up/down)
- **Column-width persistence** — widths stored in local state (not localStorage)
- **Remove button** — per-row X button with stop-propagation

**Valuable UX Patterns:**
- The **tri-state sorting** (asc → desc → none) is TradingView-standard behavior
- **Drag-and-drop reorder** with `draggable` attribute (no external library) is lightweight and correct

**Should Extract:**
- Column resize logic → `src/hooks/useColumnResize.js` (reusable for other tables)
- Row sorting logic → `src/utils/sortUtils.js` (generic array sorting)
- Watch remains a pure shell component

---

## 7. Interaction Ergonomics

### 7.1 Keyboard & Gesture Patterns

| Pattern | Implementation | Location |
|---|---|---|
| Right-click cancel | `container.addEventListener('contextmenu')` → cancel active tool | ChartComponent |
| ESC to cancel zoom | Window `keydown` listener → `onToolUsed()` | ChartComponent |
| Scroll to close popover | Window `scroll` listener → `setOpenPopoverId(null)` | DrawingToolbar |
| Click-outside to close | Document `mousedown` listeners on 5 dropdown refs | Topbar, DrawingToolbar |
| Stop-propagation on nested scroll | `e.stopPropagation()` on dropdown click | Topbar, DrawingToolbar |
| IntersectionObserver visibility | Pauses RAF when chart not visible | ChartComponent |
| Document visibility change | Pauses RAF when tab hidden | ChartComponent |

### 7.2 Consistent Dropdown Pattern

All 5 dropdowns (timeframes, chart types, indicators, snapshot, layout) follow the same pattern:

```javascript
// 1. Position calculation on open
const calculatePosition = (ref) => {
  const rect = ref.current.getBoundingClientRect();
  return { top: rect.bottom + 4, left: rect.left };
};

// 2. Toggle: close others on open
const toggleMenu = () => {
  setPos(calculatePosition(ref));
  setOpen(!open);
  setOtherMenus(false); // close siblings
};

// 3. Click-outside detection
useEffect(() => {
  const handleClickOutside = (event) => {
    if (ref.current && !ref.current.contains(event.target)) {
      setOpen(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

// 4. Reposition on scroll/resize while open
useEffect(() => {
  if (!open) return;
  const handleUpdate = () => setPos(calculatePosition(ref));
  window.addEventListener('scroll', handleUpdate, true);
  window.addEventListener('resize', handleUpdate);
  return () => { ... };
}, [open]);
```

**Valuable Shell Architecture (Keep Stable):**
- This pattern is **consistent and correct**. It should be extracted into a `useDropdown()` hook and reused across all menus.
- The pattern should be **preserved exactly** — don't change behavior, just reduce duplication.

### 7.3 Tool Activation Pattern

```
1. User clicks tool in DrawingToolbar
2. DrawingToolbar.handleGroupClick() → onToolChange(toolId)
3. App.handleToolChange() → setActiveTool(toolId)
4. ChartComponent.useEffect([activeTool]) → TOOL_MAP[toolId] → lineToolManager.startTool(mappedTool)
5. User draws on chart
6. LineToolManager detects tool finished → wrapped startTool → onToolUsed()
7. App.handleToolUsed() → setActiveTool(null)
```

**Valuable Shell Architecture:**
- The **tool activation chain** (Toolbar → App → ChartComponent → LineToolManager) is a clean event propagation pattern
- The **`onToolUsed` callback** mechanism for auto-reset to cursor is correct UX
- **Preserve the chain** — it separates UI (toolbar selection) from command (tool activation) from engine (primitive rendering)

---

## 8. UX Patterns Summary

### Patterns to Preserve (Valuable Shell Architecture)

| Pattern | Location | Why Valuable |
|---|---|---|
| Slot-based layout | `Layout.jsx` | Clean composition, easy to add/remove regions |
| Per-chart config model | `App.jsx` | Each chart retains independent state |
| Tool group + popover | `DrawingToolbar.jsx` | Scalable palette for 30+ tools |
| Consistent dropdown pattern | `Topbar.jsx` | Reusable, predictable UX |
| Tri-state sorting | `Watchlist.jsx` | TradingView standard |
| Column resize via mouse drag | `Watchlist.jsx` | No library dependency |
| Singleton toast | `App.jsx` | Prevents notification pileup |
| Multi-mode search | `SymbolSearch.jsx` | Switch/Compare/Add from one component |
| Replay slider modes | `ReplaySlider.jsx` | Preview/locked/playback states |
| Imperative handle bridge | `ChartComponent.jsx` | Clean shell-to-engine control |

### Patterns to Extract to Services/Runtime

| Pattern | Extract To | Rationale |
|---|---|---|
| Dropdown positioning | `useDropdown()` hook | Reused 5×, identical code |
| Column resize | `useColumnResize()` hook | Reusable for any data grid |
| Table sorting | `sortUtils.js` | Pure function, generic |
| Alert data model | `useAlerts()` hook | 280 lines of business logic mixed with shell |
| Watchlist data model | `useWatchlist()` hook | 120 lines of data fetching in shell |
| Symbol fetching | `exchangeInfo.js` | Binance-specific, not shell logic |
| Timeframe definitions | `timeframes.js` constants | Data, not behavior |
| Tool name mapping | `toolMap.js` constants | Data, not behavior |

---

## 9. Shell Stability Map

### Red Zone — Highest Value, Keep Stable

These parts of the shell should be **preserved as-is** with minimal changes:

```
Layout.jsx (slot interface)
ChartGrid.jsx (engine factory)
DrawingToolbar.jsx (tool groups + popover architecture)
RightToolbar.jsx (panel switch pattern)
Toast.jsx / SnapshotToast.jsx (notification model)
ReplaySlider.jsx (interaction modes)
ReplayControls.jsx (control bar layout)
ErrorBoundary.jsx (recovery shell)
```

### Yellow Zone — Refactor Interface, Keep Behavior

These parts need modularization but the UX behavior must be preserved:

```
App.jsx → extract hooks (useAlerts, useWatchlist, useIntervals, useMultiChart)
Topbar.jsx → extract sub-components (TimeframeSelector, SnapshotMenu, etc.)
DrawingToolbar.jsx → extract TOOL_MAP to constants
Watchlist.jsx → extract useColumnResize, sortUtils
SymbolSearch.jsx → extract data fetching service
AlertDialog.jsx → extract condition options to template/props
```

### Green Zone — Extract to Engine/Services

These are **not shell concerns** and should be extracted:

```
ChartComponent.jsx data pipeline → useChartData hook
ChartComponent.jsx indicators → useIndicators hook / indicator engine
ChartComponent.jsx replay logic → useReplayMode hook
ChartComponent.jsx line tools → useLineTools hook
services/binance.js → data provider abstraction
utils/indicators/* → indicator engine
utils/TemplateManager.js → lightweight service (keep as-is)
```

---

## 10. Shell Runtime Architecture (Target State)

```
┌──────────────────────────────────────────────────────────────┐
│                    WORKSTATION SHELL                          │
│                                                              │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐   │
│  │ Topbar  │  │ Drawing  │  │ BottomBar │  │ RightTB   │   │
│  │ (cmd)   │  │ (palette)│  │ (status)  │  │ (switch)  │   │
│  └────┬────┘  └────┬─────┘  └─────┬─────┘  └─────┬─────┘   │
│       │            │              │               │         │
│       └────────────┴──────┬───────┴───────────────┘         │
│                           │                                 │
│                    ┌──────▼──────┐                          │
│                    │  Layout.jsx │  ← slot composition       │
│                    │  (grid)     │                          │
│                    └──────┬──────┘                          │
│                           │                                 │
│                    ┌──────▼──────┐                          │
│                    │  ChartGrid  │  ← engine factory         │
│                    │  (factory)  │                          │
│                    └──────┬──────┘                          │
│                           │                                 │
├───────────────────────────┼─────────────────────────────────┤
│                    ┌──────▼──────┐                          │
│                    │ ChartEngine │  ← rendering core         │
│                    │ (instance)  │                          │
│                    └──────┬──────┘                          │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Data Provider │  ← abstracted service
                    │  (Binance)     │
                    └────────────────┘
```

The shell and engine communicate through:
1. **Props** (downward): `symbol`, `interval`, `chartType`, `indicators`, `activeTool`, `theme`, etc.
2. **Callbacks** (upward): `onToolUsed`, `onAlertsSync`, `onAlertTriggered`, `onReplayModeChange`
3. **Imperative handle** (shell → engine): `undo()`, `redo()`, `addPriceAlert()`, `toggleReplay()`, etc.
4. **Ref bridge** (shell orchestrates engines): `chartRefs.current[id].method()`

---

## 11. Key Architectural Insight

The MP Charts Toolkit's most valuable architectural contribution is **not the chart engine** (which wraps a third-party library) but the **workstation shell** — the orchestration layer that provides:

1. **Multi-chart workspace** with per-chart state isolation
2. **Three-toolbar command system** (command bar, tool palette, panel switcher)
3. **Consistent interaction patterns** (dropdowns, popovers, click-outside, ESC cancel)
4. **Notification tiering** (toast + snapshot toast for different severity levels)
5. **Replay mode** with sophisticated preview/playback/locked states
6. **Alert system** with chart-side visual markers and app-side management
7. **Panel system** with toggleable side panels (watchlist, alerts)
8. **Layout grid** with multi-chart orchestration

These shell patterns are **independent of the chart library** and could theoretically wrap any charting engine. The extraction plan should prioritize preserving these shell patterns while extracting engine-specific logic into services and hooks.