# UI Composition — MP Charts Toolkit

## Overview

This document describes the UI component hierarchy, toolbar structure, panel layout, dialog system, icon system, and floating UI elements within the chart toolkit subsystem.

---

## 1. Component Hierarchy

```
ErrorBoundary
  └── App (root orchestrator)
        └── Layout
              ├── Left sidebar: DrawingToolbar
              ├── Topbar
              ├── Center area:
              │     ├── ChartGrid
              │     │     └── ChartComponent (1..N instances)
              │     └── BottomBar
              ├── Right panel: Watchlist | AlertsPanel (conditional)
              └── Right toolbar: RightToolbar
              │
              ├── Floating:
              │     ├── SymbolSearch (modal, overlays entire page)
              │     ├── AlertDialog (modal overlay)
              │     ├── Toast (fixed position, top-right)
              │     └── SnapshotToast (fixed position, bottom)
              └── [ChartComponent internal]:
                    ├── OHLC Header Bar (absolute positioned)
                    ├── ReplayControls (overlay)
                    └── ReplaySlider (overlay + fade overlay)
```

### Layout Grid Structure

```
┌──────────────────────────────────────────────────────────┐
│  Topbar                                                  │
├────────┬─────────────────────────────────────┬───────────┤
│        │                                     │           │
│Drawing │        ChartGrid / ChartComponent   │ Watchlist │
│Toolbar │                                     │ or Alerts │
│        │                                     │           │
│        ├─────────────────────────────────────┤           │
│        │  BottomBar                          │           │
├────────┴─────────────────────────────────────┼───────────┤
│  RightToolbar                                │           │
└──────────────────────────────────────────────┴───────────┘
```

### Left Toolbar (DrawingToolbar)

- Position: fixed left sidebar
- Width: ~48px
- Content: vertical stack of tool group buttons
- Features: each group has a main button (click to activate) and an arrow (click to open popover)
- Conditional: zoom-out button appears below zoom-in when zoom mode expanded
- Separators between logical groups

### Topbar

- Position: full-width horizontal bar at top
- Structure: scrollable inner content with left group + right group
- Left section: hamburger → symbol search + compare → timeframe selector → chart type → indicators → alert + replay → undo/redo
- Right section: layout selector → save → theme toggle → settings → fullscreen → snapshot
- Dropdowns: timeframes, chart types, indicators, snapshot menu, layout — position via `getBoundingClientRect`, close on outside click

### BottomBar

- Position: horizontal bar below chart
- Left section: time range preset buttons (1D through All)
- Right section: timezone display | log toggle | auto scale toggle | reset zoom

### Right Panel Area

- Toggle between Watchlist and AlertsPanel via RightToolbar
- RightToolbar: vertical icon bar with badge counts
- Panel slides in/out when toggled

---

## 2. Toolbar Structure (DrawingToolbar)

### Tool Group Definitions

The toolbar is declaratively defined as an array of groups:

```javascript
const toolGroups = [
  { id: 'cursor_group',  items: [{ id: 'cursor', icon: Icons.CursorIcon, label: 'Cross' }, ...] },
  { id: 'lines_group',   items: [8 line tools] },
  { id: 'fib_group',     items: [Fibonacci, Fib Extension] },
  { id: 'shapes_group',  items: [6 shape tools] },
  { id: 'text_group',    items: [Text, Callout, Price Label] },
  { id: 'patterns_group',items: [Elliott Impulse, Elliott Correction, Head & Shoulders] },
  { id: 'prediction_group', items: [Long, Short, Date Range, Price Range, Date & Price Range] },
  { id: 'measure_group', items: [Measure] },
  { id: 'zoom_group',    items: [Zoom In], hasZoomOut: true },
  { id: 'timer_group',   items: [Show Timer] },
  { id: 'lock_group',    items: [Lock All Drawings] },
  { id: 'visibility_group', items: [Hide All Drawings] },
  { id: 'delete_group',  items: [Remove Objects] },
]
```

### Group Rendering

Each group renders as:
- **Main button**: shows active tool icon, click to activate
- **Arrow button**: opens popover with all tools in group (if group has >1 items)
- **Active state**: based on `activeTool === item.id` or toggle state (for lock_all, hide_drawings, show_timer)
- **Separators**: between groups at indices 0, 1, 2, 3, 4, 5, 6, 8, 11

### Popover System

- Fixed-position popover, positioned relative to the triggering button via `getBoundingClientRect()`
- Closes on: scroll, outside click, arrow toggle
- Contains: vertical list of group items with icon + label, click to select + activate

### Toggle State Tracking

- `isZoomExpanded`: expands to show zoom-out when zoom tools are active or were recently active
- `isDrawingsLocked`, `isDrawingsHidden`, `isTimerVisible`: passed as props from App.jsx
- A special `isToggleActive` flag handles toggle tools that show active state differently

---

## 3. Panel System

### Watchlist Panel

```
┌─────────────────────────┐
│ Watchlist          [+]  │  ← header + add button
├─────────────────────────┤
│ Symbol │ Last│ Chg│Chg% │  ← sortable, resizable column headers
├────────┼─────┼────┼────┤
│ BTCUSDT│ ....│ ...│ ...│  ← draggable rows, click to select
│ ETHUSDT│ ....│ ...│ ...│  ← color-coded up/down
│ ...    │     │    │    │  ← X to remove
└────────┴─────┴────┴────┘
```

Features:
- Column resizing via mouse drag on resize handles
- Column sorting (asc/desc/none toggle per column)
- Row drag-and-drop reordering
- Real-time price updates via WebSocket `subscribeToMultiTicker`
- Remove button per row

### Alerts Panel

```
┌─────────────────────────┐
│ Alerts                  │
├─────────────────────────┤
│ [Alerts] [Log] (42)     │  ← tab bar with log count badge
├─────────────────────────┤
│ BTCUSDT    [Active]     │  ← symbol + status badge
│ Crossing 45000.00       │  ← condition display
│ 5/30/2026 ... [⏸][🗑]  │  ← timestamp + pause/delete
├─────────────────────────┤
│ ... (or empty state)    │
└─────────────────────────┘
```

Features:
- Two tabs: Alerts list + Log history
- Status: Active (can pause), Paused (can resume), Triggered (can resume, can delete)
- Actions per alert: PauseCircle (pause active), PlayCircle (resume paused/triggered), Trash2 (delete)
- Log tab: timestamped alert trigger history with symbol + message

### RightToolbar

```
┌─────┐
│ [≡] │ ← Watchlist toggle
├─────┤
│ [⏰] │ ← Alerts toggle (with badge count)
│  3  │
└─────┘
```

Features:
- Toggle active panel on click, toggle off if same panel clicked
- Badge shows unread alert count

---

## 4. Dialog System

### SymbolSearch (Full-Screen Modal)

```
┌─────────────────────────────────────────┐
│ 🔍 [______________]                [✕]  │
│ Symbol  │ Description  │ Exchange       │
├─────────┼──────────────┼───────────────┤
│ BTCUSDT │ Bitcoin/USDT │ BINANCE  [✓] │
│ ETHUSDT │ Ethereum/USDT│ BINANCE       │
│ ...     │              │               │
└─────────────────────────────────────────┘
```

- Full-screen overlay (not a small modal)
- Fetches symbol list from Binance exchangeInfo API on mount
- Local filtering with debounced search (base asset + symbol)
- Displays up to 50 results
- Modes: switch (default), compare (doesn't close on select), add (adds to watchlist)
- Checkmark indicator for already-added symbols in compare mode

### AlertDialog (Overlay Modal)

```
┌────────────────────────────────┐
│ Edit alert on                  │
│                         [✕]    │
├────────────────────────────────┤
│ Condition: [Crossing ▼]        │
│ Value:     [___________]       │
├────────────────────────────────┤
│ [Cancel]           [Save]      │
└────────────────────────────────┘
```

- Simple overlay with backdrop click to close
- Condition options: Crossing, Crossing Up, Crossing Down, Greater Than, Less Than
- Number input for price value (pre-filled with current price)
- Calls `onSave({ condition, value })` on save

---

## 5. Floating UI / Notifications

### Toast

```
┌──────────────────┐
│ ⚠️ [message]  [✕]│   ← top-right, auto-dismiss 5s
└──────────────────┘
```

- Types: error (red), success (green), info (blue)
- Managed by App.jsx: `showToast(message, type)`
- Automatic timeout on 5s, manual close via X button
- Previous toast cleared before showing new one (prevents stack buildup)

### SnapshotToast

```
┌──────────────────────┐
│ ✓ [message]     👍   │   ← bottom, auto-dismiss 3s
└──────────────────────┘
```

- Simpler success-only variant
- No close button, auto-dismiss after 3s
- Used for: "Layout saved successfully", "Link to the chart image copied to clipboard"

### Replay Overlays

```
┌─────────────────────────────────────────┐
│ Replay Mode     [✂]|[▶]|[⏭]|[1x▼]|[✕]│  ← ReplayControls
└─────────────────────────────────────────┘
                        │← slider handle
                        ▼
┌─────────────────────────────────────────┐
│ [|||||||||||||||||||||||||||||||||||||] │  ← ReplaySlider on chart
│                                         │
│               ┌─────────────────────────│  ← fade overlay
│               │                         │     (future candles dimming)
└───────────────┴─────────────────────────┘
```

- ReplayControls: positioned overlay within chart wrapper
  - Jump to bar (scissors), Play/Pause, Forward, Speed selector (0.1x–10x), Close
  - Speed popover menu
- ReplaySlider: visual handle on chart bottom
  - Follows mouse position when in chart bounds
  - Locked mode after click (hide slider)
  - Unlocked mode during playback (hide slider, candle data drives view)
  - Throttled drag updates (50ms)
  - Fade overlay: CSS-based dimming of future candles during preview
  - Time tooltip on handle hover/drag

### OHLC Header Bar

```
┌──────────────────────────────────────────────────────────────┐
│ BTCUSDT · 1D  ●  O: 12345.67  H: 12345.67  L: 12345.67    │
│                        C: 12345.67  +123.45 (+1.23%)        │
└──────────────────────────────────────────────────────────────┘
```

- Absolutely positioned inside chart wrapper
- Offset based on toolbar visibility (55px vs 10px)
- Updates on crosshair move (hover data) and on WebSocket tick (last candle)
- Color-coded change (up green, down red)

---

## 6. Icon System

### Source: Custom SVGs

**File:** `src/components/Toolbar/ToolIcons.jsx` (368 lines)

All icons are hand-crafted SVG components following TradingView icon style. Each is a React component accepting `size`, `color`, `className`, and `style` props via PropTypes.

### Icon Categories

| Category | Icons |
|---|---|
| Cursor | Cross, Eraser |
| Line tools | TrendLine, Arrow, Ray, ExtendedLine, HorizontalLine, HorizontalRay, VerticalLine, CrossLine |
| Fibonacci | FibRetracement, FibExtension |
| Shapes | Rectangle, Circle, Triangle, Path |
| Drawing | Brush, Highlighter |
| Text | Text, Callout |
| Patterns | ElliottWave, ElliottCorrection, ElliottImpulse, HeadAndShoulders |
| Predictions | LongPosition, ShortPosition |
| Ranges | DateRange, PriceRange, DatePriceRange |
| Actions | ZoomIn, ZoomOut, Measure, Timer, LockDrawings, HideDrawings, ClearAll |
| Alerts | PriceAlert |
| Misc | ParallelChannel |

### External Icon Libraries

- **lucide-react**: used selectively in Topbar (`Plus`, `Star`, `Trash2`, `X`), AlertsPanel (`X`, `Bell`, `Trash2`, `PlayCircle`, `PauseCircle`, `Clock`), BottomBar (`Settings`), etc.
- **classnames**: used throughout for conditional CSS class composition

---

## 7. Layout Components

### Layout.jsx (42 lines)

A pure presentational component that arranges children in a CSS grid:

```jsx
<Layout
  leftToolbar={<DrawingToolbar />}
  topbar={<Topbar />}
  chart={<ChartGrid />}
  bottomBar={<BottomBar />}
  watchlist={<Watchlist />}
  rightToolbar={<RightToolbar />}
/>
```

The layout handles visibility via CSS classes:
- `isLeftToolbarVisible` prop toggles `leftToolbarHidden` class
- Watchlist, optionsPanel, rightToolbar are conditionally rendered if provided

### ChartGrid.jsx (56 lines)

Renders N ChartComponent instances based on `charts` array and `layout` string:

- `layout='1'` → single chart (default)
- `layout='2'` → two-column grid
- `layout='3'` → three-column grid  
- `layout='4'` → 2x2 grid
- Active chart highlighted with border on click (when >1 chart)
- Distributes per-chart props (`symbol`, `interval`, `indicators`, `comparisonSymbols`)
- Wraps callbacks with chart.id context

---

## 8. CSS Architecture

### Styling Approach

- **CSS Modules** (`*.module.css`) for all components
- Each component imports its own module: `import styles from './Component.module.css'`
- Conditional classes via `classnames` library: `classNames(styles.base, { [styles.active]: condition })`
- Global styles in `src/index.css` and `src/App.css`
- Line-tools plugin CSS: `src/plugins/line-tools/line-tools.css`
- Theme applied via `data-theme` attribute on `<html>` element

### Theme Variables

Dark theme is default:
- Background: `#131722`
- Text: `#D1D4DC`
- Grid lines: `#2A2E39`
- Crosshair: `#758696`

Light theme:
- Background: `#ffffff`
- Text: `#131722`
- Grid lines: `#e0e3eb`
- Crosshair: `#9598a1`

Theme colors are passed directly as props to `lightweight-charts` options, not via CSS custom properties.