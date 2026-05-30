# Private API Inventory — MP Charts Toolkit

## Overview

Comprehensive inventory of all private API usage across the MP Charts Toolkit: underscore-prefixed plugin properties, undocumented plugin methods, window globals, direct DOM mutations, and lightweight-charts internal API access. Each item is classified by risk level with migration recommendations.

**Scope:** All files in `src/` excluding `node_modules` and `dist/`.

---

## 1. Plugin Private Properties (`_`-prefixed)

These access internal properties of the vendored `lightweight-charts-line-tools` package that are **not part of the public API**.

### 1.1 `manager._userPriceAlerts` (HIGH RISK)

| # | File | Line | Code | Risk | Migration |
|---|---|---|---|---|---|
| 1 | ChartComponent.jsx | 179 | `manager._userPriceAlerts` | 🔴 HIGH | Wrap in AlertAdapter |
| 2 | ChartComponent.jsx | 208 | `manager._userPriceAlerts` | 🔴 HIGH | Wrap in AlertAdapter |
| 3 | ChartComponent.jsx | 221 | `manager._userPriceAlerts` | 🔴 HIGH | Wrap in AlertAdapter |
| 4 | ChartComponent.jsx | 787 | `manager._userPriceAlerts` | 🔴 HIGH | Wrap in AlertAdapter |

**Undocumented methods called on `_userPriceAlerts`:**

| Method | Called from | Count | Risk | Migration |
|---|---|---|---|---|
| `setSymbolName(symbol)` | addPriceAlert (182), initializeLineTools (788) | 2 | 🔴 | AlertAdapter.setSymbol() |
| `addAlertWithCondition(price, cond)` | addPriceAlert (191), restartPriceAlert (227) | 2 | 🔴 | AlertAdapter.create() |
| `openEditDialog(id, opts)` | addPriceAlert (196) — fallback | 1 | 🔴 | AlertAdapter.create() |
| `removeAlert(externalId)` | removePriceAlert (211) | 1 | 🔴 | AlertAdapter.remove() |
| `alertsChanged().subscribe(cb)` | initializeLineTools (795) | 1 | 🔴 | AlertAdapter.onChange() |
| `alertTriggered().subscribe(cb)` | initializeLineTools (813) | 1 | 🔴 | AlertAdapter.onTrigger() |
| `alerts()` | initializeLineTools (797) | 1 | 🔴 | AlertAdapter.getAll() |
| `openToolAlertDialog(tool)` | plugin internal (line-tools.js:5534) | 0 (not called) | 🟡 | Not used by shell |

### 1.2 Plugin Internal Properties (access inside line-tools.js)

The plugin itself uses extensive `_`-prefixed internal state. Since the plugin is a minified bundle, these are not directly accessible from shell code. Notable internal state:

| Property Pattern | Example | Risk |
|---|---|---|
| `this._tools[]` | Array of active drawing tool instances | 🟡 Not accessed externally |
| `this._historyManager` | Undo/redo stack | 🟡 Not accessed externally |
| `this._activeTool` | Currently active tool type | 🟡 Not accessed externally |
| `this._selectedTool` | Currently selected tool instance | 🟡 Not accessed externally |
| `this._chart` | LC chart reference | 🟡 Internal to plugin |
| `this._series` | LC series reference | 🟡 Internal to plugin |
| `this._activeToolType` | Tool type string | 🟡 Not accessed externally |
| `this._isDragging` | Drag state | 🟡 Not accessed externally |
| `this._dragState` | Current drag operation | 🟡 Not accessed externally |
| `this._lastPixelPoint` | Last mouse position | 🟡 Not accessed externally |
| `this._requestUpdate` | LC update request callback | 🟡 Internal |
| `this._paneViews` | Cached pane view array | 🟡 Internal |
| `this._chartControls` | Navigation toolbar | 🟡 Internal |
| `this._toolbar` | Floating toolbar DOM | 🟡 Internal |
| `this._alertNotifications` | Alert notification UI | 🟡 Internal |
| `this._alertSubscription` | Alert subscription handle | 🟡 Internal |
| `this._textInputDialog` | Text editing dialog | 🟡 Internal |
| `this._scrollInterval` | Scroll interval timer | 🟡 Internal |
| `this._hideTimeout` | Toolbar hide timeout | 🟡 Internal |
| `this._isDestroyed` | Destruction flag | 🟡 Internal |
| `this._mouseDownHandler` | Event handler ref | 🟡 Internal |
| `this._savedPosition` | Floating toolbar position | 🟡 Internal |

**Total plugin internal `_`-prefixed properties:** ~50+. None should be accessed from shell code.

---

## 2. Window Globals

| # | File | Line | Code | Risk | Migration |
|---|---|---|---|---|---|
| 1 | ChartComponent.jsx | 832 | `window.lineToolManager = manager;` | 🟡 MEDIUM | Remove or gate with `if (__DEV__)` |
| 2 | ChartComponent.jsx | 833 | `window.chartInstance = chartRef.current;` | 🟡 MEDIUM | Remove or gate with `if (__DEV__)` |
| 3 | ChartComponent.jsx | 834 | `window.seriesInstance = series;` | 🟡 MEDIUM | Remove or gate with `if (__DEV__)` |
| 4 | ChartComponent.jsx | 964 | `window.lineToolManager = null;` | 🟢 LOW | Cleanup — keep |
| 5 | ChartComponent.jsx | 965 | `window.chartInstance = null;` | 🟢 LOW | Cleanup — keep |
| 6 | ChartComponent.jsx | 966 | `window.seriesInstance = null;` | 🟢 LOW | Cleanup — keep |
| 7 | DrawingToolbar.jsx | 183 | `window.addEventListener('scroll', handleScroll, true);` | 🟢 LOW | Standard event listener |
| 8 | DrawingToolbar.jsx | 184 | `window.removeEventListener('scroll', handleScroll, true);` | 🟢 LOW | Standard cleanup |
| 9 | Topbar.jsx | 279-282 | `window.addEventListener('scroll', ...)` / `window.addEventListener('resize', ...)` | 🟢 LOW | Standard event listeners |
| 10 | ChartComponent.jsx | 530 | `document.addEventListener('visibilitychange', ...)` | 🟢 LOW | Standard event listener |
| 11 | line-tools.js | multiple | `window.addEventListener('mousemove', this._rawMouseMoveHandler)` | 🟢 LOW | Plugin internal — standard pattern |
| 12 | line-tools.js | multiple | `window.AudioContext \|\| window.webkitAudioContext` | 🟢 LOW | Audio API feature detection |
| 13 | line-tools.js | multiple | `window.innerWidth` / `window.innerHeight` / `window.devicePixelRatio` | 🟢 LOW | Standard browser APIs |
| 14 | line-tools.js | multiple | `window.clearTimeout` / `window.clearInterval` / `window.setTimeout` / `window.setInterval` | 🟢 LOW | Standard timer APIs |

### Application-level window globals (items 1-3)

These are the **only concerning globals**. They expose the entire LineToolManager, LC chart instance, and LC series instance to the global scope. Currently used for debugging only, but any script on the page could access them.

**Recommendation:** Gate behind `if (process.env.NODE_ENV === 'development')` or `if (window.__DEV__)`.

---

## 3. Direct DOM Mutations

### 3.1 Shell Code (App.jsx + ChartComponent)

| # | File | Line | Code | Risk | Migration |
|---|---|---|---|---|---|
| 1 | ChartComponent.jsx | 499 | `container.style.cursor = isZoomIn ? 'zoom-in' : 'zoom-out';` | 🟢 LOW | Acceptable — cursor UX |
| 2 | ChartComponent.jsx | 504 | `container.style.cursor = '';` | 🟢 LOW | Cleanup |
| 3 | ChartComponent.jsx | 1766 | `chartContainerRef.current.style.cursor = 'crosshair';` | 🟢 LOW | Replay mode cursor |
| 4 | ChartComponent.jsx | 2039 | `chartContainerRef.current.style.cursor = 'default';` | 🟢 LOW | Replay mode cleanup |
| 5 | App.jsx | 148 | `document.documentElement.setAttribute('data-theme', theme);` | 🟢 LOW | Theme — standard pattern |

**Total shell DOM mutations:** 5 — all low risk, used for UI state (cursor changes, theme).

### 3.2 Plugin Internal DOM Mutations (line-tools.js)

The plugin performs extensive direct DOM manipulation for its internal UI components. These are **not accessible or modifiable from shell code** but are documented for awareness:

| Category | Count | Examples |
|---|---|---|
| `document.createElement` | ~40+ | Floating toolbar, buttons, color pickers, dialogs, sliders, tooltips |
| `element.appendChild` | ~30+ | Building toolbar DOM tree |
| `element.classList.add/remove` | ~20+ | Visibility toggling, active states |
| `element.style.*` | ~15+ | Positioning, opacity, colors, font sizes |
| `element.innerHTML` | ~15+ | Inline SVG icons, button content |
| `element.textContent` | ~10+ | Labels, values |
| `element.removeChild` | ~8+ | Cleanup on destroy |
| `document.body.appendChild` | ~3+ | Global overlays (dialogs, notifications) |
| `document.head.appendChild` | ~3+ | Injecting CSS styles at runtime |

**Risk:** 🟡 MEDIUM — The plugin creates and manages its own DOM outside React's virtual DOM. If React re-renders the ChartComponent container, the plugin's DOM children may be orphaned. Currently works because the chart container ref is stable and the plugin only appends to `document.body`.

**Migration:** Not actionable — plugin internal. Monitor for container conflicts during refactoring.

---

## 4. Lightweight-Charts Internal API Access

### 4.1 From Shell Code

| # | File | Line | Code | Risk | Migration |
|---|---|---|---|---|---|
| 1 | (none) | — | No `_`-prefixed LC internal access from shell code | 🟢 | N/A |

The shell code accesses LC only through public API:
- `chartRef.current.timeScale()` — public
- `chartRef.current.priceScale()` — public
- `chartRef.current.applyOptions()` — public
- `seriesRef.current.setData()` — public
- `seriesRef.current.priceToCoordinate()` — public
- `seriesRef.current.data()` — public

### 4.2 From Plugin Internal Code (line-tools.js)

| # | Line | Code | Risk | Description |
|---|---|---|---|---|
| 1 | line-tools.js | `this.chart._impl?.model?.().rendererOptionsProvider?.().options()?.horizontalPixelRatio` | 🔴 HIGH | **Accesses `_impl` internal property of lightweight-charts IChartApi** |
| 2 | line-tools.js | `this._chart.chartElement?.()` | 🟡 MEDIUM | Accesses internal `chartElement()` method (not part of public IChartApi) |
| 3 | line-tools.js | `this._series.priceScale().width()` | 🟡 MEDIUM | `priceScale().width()` LC internal |
| 4 | line-tools.js | `this._chart.timeScale().height()` | 🟡 MEDIUM | `timeScale().height()` LC internal |

**Finding 4.2.1 is the most concerning:** `this.chart._impl` accesses a private implementation property of the LC chart object. This is:
- Completely undocumented
- May change without notice between LC versions
- Used to get `horizontalPixelRatio` which IS available through the public `ISeriesPrimitive` API parameter

**Impact if LC v6 changes `_impl`:** The plugin's hit detection and coordinate calculations involving the `_lastPixelPoint` logic will break silently, causing:
- Drawing tools to misalign with pointer coordinates
- Invisible or offset drawing previews
- Potential drawing creation failures

**Migration:** Fork plugin source, replace `this.chart._impl?.model?.().rendererOptionsProvider?.().options()?.horizontalPixelRatio` with `window.devicePixelRatio` (which the same line already has as fallback).

---

## 5. Undocumented Plugin Alert Data Shape

The plugin's internal alert primitive (`_userPriceAlerts`) communicates with the shell using undocumented data shapes:

### Alert Change Event

```javascript
// From userAlerts.alerts() — no documented type
{
  id: number,
  price: number,
  condition: 'crossing' | 'crossing_up' | 'crossing_down',
  type: 'price'
}
```

### Alert Trigger Event

```javascript
// From userAlerts.alertTriggered() — no documented type
{
  alertId: number,
  alertPrice: number,
  timestamp: number,
  direction: string,
  condition: string
}
```

**Risk:** 🟡 MEDIUM — These shapes are discovered by reading minified code + runtime behavior. Not typed, not documented. Any plugin update may change field names.

**Recommendation:** Define TypeScript interfaces for both shapes in the PluginAdapter layer. This at least provides a single point of validation.

---

## 6. Shell Code `_source` Marker Convention (App-internal)

App.jsx uses a `_source` property on alert objects to distinguish alert origins:

```javascript
// App.jsx line 433
if (a.status === 'Active' && a._source !== 'lineTools')

// App.jsx line 463
if (alert._source === 'lineTools') return alert;

// App.jsx line 828
if (target && target._source === 'lineTools' && target.chartId != null)
```

| # | File | Line | Code | Risk | Migration |
|---|---|---|---|---|---|
| 1 | App.jsx | 433 | `a._source !== 'lineTools'` | 🟢 LOW | App-internal marker, not external API |
| 2 | App.jsx | 463 | `alert._source === 'lineTools'` | 🟢 LOW | Same |
| 3 | App.jsx | 828 | `target._source === 'lineTools'` | 🟢 LOW | Same |
| 4 | App.jsx | 858 | `target._source === 'lineTools'` | 🟢 LOW | Same |
| 5 | App.jsx | 877 | `target._source === 'lineTools'` | 🟢 LOW | Same |
| 6 | App.jsx | 927 | `a._source === 'lineTools'` (in handleChartAlertsSync) | 🟢 LOW | Same |
| 7 | App.jsx | 988 | `a._source === 'lineTools'` (in handleChartAlertTriggered) | 🟢 LOW | Same |

**Risk:** 🟢 LOW — This is a shell-internal convention, not a plugin API dependency. However, using `_` prefix on application data properties is a TypeScript code smell. Replace `_source` with `source` (no underscore) when refactoring the alert system.

---

## 7. Summary: All Risks by Category

### 🔴 HIGH RISK (Immediate Attention Required)

| # | Category | Items | Location | Impact |
|---|---|---|---|---|
| H1 | Plugin private property | 4 accesses to `manager._userPriceAlerts` | ChartComponent.jsx | Alert system breaks on plugin update |
| H2 | Plugin private methods | 8 undocumented method calls | ChartComponent.jsx | No type safety, silent breakage |
| H3 | LC internal API | 1 access to `chart._impl.model().rendererOptionsProvider().options()` | line-tools.js (plugin internal) | Drawing coordinate misalignment on LC upgrade |

### 🟡 MEDIUM RISK (Should Address)

| # | Category | Items | Location | Impact |
|---|---|---|---|---|
| M1 | Window globals | 3 assignments (lineToolManager, chartInstance, seriesInstance) | ChartComponent.jsx | Debug surface, production security, implicit coupling |
| M2 | Plugin DOM management | ~100+ direct DOM operations | line-tools.js | Container lifecycle conflicts during React re-renders |
| M3 | LC internal API | 3 accesses to `chartElement()`, `priceScale().width()`, `timeScale().height()` | line-tools.js | May break on LC API changes |
| M4 | Undocumented alert shapes | 2 event shapes with no types | Plugin ↔ App bridge | No compile-time validation |
| M5 | Plugin internal state | ~50+ `_`-prefixed properties | line-tools.js | Cannot inspect/debug, unknown coupling |

### 🟢 LOW RISK (Monitor)

| # | Category | Items | Location | Impact |
|---|---|---|---|---|
| L1 | Direct DOM mutations | 5 style changes (cursor, theme attribute) | Shell components | Standard UI patterns |
| L2 | Shell `_source` convention | 7 uses of `_source` property | App.jsx | Internal code smell, rename to `source` |
| L3 | Window event listeners | ~8 standard listeners | Various | Properly cleaned up via useEffect returns |
| L4 | Plugin cursor class manipulation | `classList.add('eraser-cursor')` | line-tools.js | Plugin internal |

---

## 8. Migration Priority Matrix

| Item | Risk | Effort | Impact if Broken | Priority |
|---|---|---|---|---|
| H1: `_userPriceAlerts` access | 🔴 | 1-2 days | Alert system completely fails | **1** |
| H2: Undocumented plugin methods | 🔴 | 1-2 days (same as H1) | Alert creation/removal fails | **1** |
| M1: Window globals | 🟡 | 4 hours | Debug surface in production | **2** |
| M4: Undocumented alert shapes | 🟡 | 2 hours | Silent type mismatches | **3** |
| L2: `_source` convention | 🟢 | 1 hour | Code clarity | **4** |
| H3: `_impl` access (plugin) | 🔴 | Requires plugin fork | Drawing coordinate issues | **5** |

---

## 9. Files with Most Private API Usage

| File | Private Accesses | Risk Score | Dominant Category |
|---|---|---|---|
| `ChartComponent.jsx` | 13 | 🔴 HIGH | `_userPriceAlerts` (8) + window globals (6) |
| `line-tools.js` | ~50+ (internal) | 🟡 MEDIUM | `_`-prefixed internals + `_impl` |
| `App.jsx` | 7 | 🟢 LOW | `_source` convention on alert objects |

---

## 10. Recommendation: Immediate Actions

1. **Create AlertAdapter** wrapping all `_userPriceAlerts` access — resolves H1+H2 in one change
2. **Gate window globals** behind `if (process.env.NODE_ENV === 'development')` — resolves M1
3. **Define TypeScript interfaces** for alert event shapes in adapter layer — resolves M4
4. **Monitor LC upgrade** for `chartElement()` and `_impl` API deprecation — M3+M5+H3 require plugin source fork