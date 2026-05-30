# Chart Controller — API Surface & Plugin Boundaries

## Purpose

Document the existing `useImperativeHandle` API surface in `ChartComponent.jsx` (lines 163–315), classify each method by risk level, identify private plugin API access, and propose a `ChartController` abstraction boundary without changing runtime behavior.

---

## 1. Current Controller Surface

All methods are currently exposed via `useImperativeHandle(ref, () => ({...}))`. The consumer accesses them through `chartRefs.current[chartId].methodName()` from `App.jsx`.

### Method Inventory

| # | Method | Lines | Returns | Plugin Access | Risk |
|---|---|---|---|---|---|
| 1 | `undo()` | 164-166 | `void` | `lineToolManagerRef.current.undo()` | 🟢 Public |
| 2 | `redo()` | 167-169 | `void` | `lineToolManagerRef.current.redo()` | 🟢 Public |
| 3 | `getLineToolManager()` | 170 | `LineToolManager` | Direct ref return | 🟡 Exposes whole plugin |
| 4 | `clearTools()` | 171-173 | `void` | `lineToolManagerRef.current.clearTools()` | 🟢 Public |
| 5 | `addPriceAlert(alert)` | 174-203 | `void` | `manager._userPriceAlerts.*` (4 private calls) | 🔴 Private |
| 6 | `removePriceAlert(externalId)` | 205-216 | `void` | `manager._userPriceAlerts.removeAlert()` | 🔴 Private |
| 7 | `restartPriceAlert(price, condition)` | 218-233 | `void` | `manager._userPriceAlerts.addAlertWithCondition()` | 🔴 Private |
| 8 | `resetZoom()` | 234-236 | `void` | `applyDefaultCandlePosition()` — LC public API | 🟢 Safe |
| 9 | `getChartContainer()` | 237 | `HTMLElement` | `chartContainerRef.current` | 🟢 Safe |
| 10 | `getCurrentPrice()` | 238-244 | `number \| null` | `dataRef.current[last]` | 🟢 Safe |
| 11 | `toggleTimer()` | 245-260 | `boolean` | `priceScaleTimerRef.current.*` (2 calls) | 🟡 Plugin timer |
| 12 | `toggleReplay()` | 261-314 | `void` | Internal React state + data slicing | 🟡 Complex, no plugin |

---

## 2. Private Plugin API Surface

These methods access `manager._userPriceAlerts` — an underscore-prefixed property on `LineToolManager` that is **not part of the plugin's public export**. The plugin package only exports `LineToolManager` and `PriceScaleTimer` as public API.

### Access Points

| Location | Code | Private Property Accessed |
|---|---|---|
| `addPriceAlert()` | `manager._userPriceAlerts` | `_userPriceAlerts` |
| `addPriceAlert()` | `userAlerts.setSymbolName(symbol)` | `_userPriceAlerts.setSymbolName()` |
| `addPriceAlert()` | `userAlerts.addAlertWithCondition(priceNum, 'crossing')` | `_userPriceAlerts.addAlertWithCondition()` |
| `addPriceAlert()` | `userAlerts.openEditDialog(alert.id, {...})` (fallback) | `_userPriceAlerts.openEditDialog()` |
| `removePriceAlert()` | `manager._userPriceAlerts` | `_userPriceAlerts` |
| `removePriceAlert()` | `userAlerts.removeAlert(externalId)` | `_userPriceAlerts.removeAlert()` |
| `restartPriceAlert()` | `manager._userPriceAlerts` | `_userPriceAlerts` |
| `restartPriceAlert()` | `userAlerts.addAlertWithCondition(priceNum, condition)` | `_userPriceAlerts.addAlertWithCondition()` |
| `initializeLineTools()` | `manager._userPriceAlerts` | `_userPriceAlerts` |
| `initializeLineTools()` | `userAlerts.setSymbolName(symbol)` | `_userPriceAlerts.setSymbolName()` |
| `initializeLineTools()` | `userAlerts.alertsChanged().subscribe(...)` | `_userPriceAlerts.alertsChanged()` |
| `initializeLineTools()` | `userAlerts.alerts()` | `_userPriceAlerts.alerts()` |
| `initializeLineTools()` | `userAlerts.alertTriggered().subscribe(...)` | `_userPriceAlerts.alertTriggered()` |

**Total:** 13 private property accesses across 2 functions.

### Private Plugin Methods Used

| Plugin Method | Called From | Count |
|---|---|---|
| `_userPriceAlerts.setSymbolName(symbol)` | `addPriceAlert`, `initializeLineTools` | 2 |
| `_userPriceAlerts.addAlertWithCondition(price, condition)` | `addPriceAlert`, `restartPriceAlert` | 2 |
| `_userPriceAlerts.removeAlert(externalId)` | `removePriceAlert` | 1 |
| `_userPriceAlerts.openEditDialog(id, options)` | `addPriceAlert` (fallback) | 1 |
| `_userPriceAlerts.alertsChanged().subscribe(cb)` | `initializeLineTools` | 1 |
| `_userPriceAlerts.alertTriggered().subscribe(cb)` | `initializeLineTools` | 1 |
| `_userPriceAlerts.alerts()` | `initializeLineTools` | 1 |

---

## 3. Plugin Public API Surface (Safe)

These methods access only public exports of the plugin and lightweight-charts:

| Plugin Method | Called From | Count |
|---|---|---|
| `lineToolManagerRef.current.undo()` | `undo` | 1 |
| `lineToolManagerRef.current.redo()` | `redo` | 1 |
| `lineToolManagerRef.current.clearTools()` | `clearTools` | 2 (clear + clear_all) |
| `lineToolManagerRef.current.startTool(mappedTool)` | `activeTool` effect | ~40 mappings |
| `lineToolManagerRef.current.lockAllDrawings()` | `isDrawingsLocked` effect | 1 |
| `lineToolManagerRef.current.unlockAllDrawings()` | `isDrawingsLocked` effect | 1 |
| `lineToolManagerRef.current.areDrawingsLocked()` | `isDrawingsLocked` effect guard | 1 |
| `lineToolManagerRef.current.hideAllDrawings()` | `isDrawingsHidden` effect | 1 |
| `lineToolManagerRef.current.showAllDrawings()` | `isDrawingsHidden` effect | 1 |
| `lineToolManagerRef.current.areDrawingsHidden()` | `isDrawingsHidden` effect guard | 1 |
| `lineToolManagerRef.current.setDefaultRange({from, to})` | `applyDefaultCandlePosition` | 1 |
| `priceScaleTimerRef.current.applyOptions({timeframeSeconds})` | `loadData` | 1 |
| `priceScaleTimerRef.current.setVisible(bool)` | `isTimerVisible` effect | 1 |
| `priceScaleTimerRef.current.isVisible()` | `toggleTimer` | 1 |
| `priceScaleTimerRef.current.updateCandleData(open, close)` | WS + replay callbacks | ~2 |

---

## 4. ChartController Abstraction Boundary

### Proposed Interface

The `ChartController` is a **documentation-only abstraction** that classifies each existing method + every plugin/LW interaction in ChartComponent into layers:

```
┌────────────────────────────────────────────────────────────────────┐
│                       CHART CONTROLLER                             │
│                                                                    │
│  LAYER 1: Safe Shell API (no plugin dependency)                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ resetZoom()           │ LC timeScale/priceScale public API    │  │
│  │ getChartContainer()   │ DOM ref                               │  │
│  │ getCurrentPrice()     │ dataRef                               │  │
│  │ toggleReplay()        │ React state only                      │  │
│  │ togglTimer()          │ PriceScaleTimer public API            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  LAYER 2: Plugin Public API (safe)                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ undo()                │ LineToolManager.undo()                │  │
│  │ redo()                │ LineToolManager.redo()                │  │
│  │ clearTools()          │ LineToolManager.clearTools()          │  │
│  │ activateTool(name)    │ LineToolManager.startTool()           │  │
│  │ lockDrawings()        │ LineToolManager.lockAllDrawings()     │  │
│  │ unlockDrawings()      │ LineToolManager.unlockAllDrawings()   │  │
│  │ hideDrawings()        │ LineToolManager.hideAllDrawings()     │  │
│  │ showDrawings()        │ LineToolManager.showAllDrawings()     │  │
│  │ isDrawingsLocked()    │ LineToolManager.areDrawingsLocked()   │  │
│  │ isDrawingsHidden()    │ LineToolManager.areDrawingsHidden()   │  │
│  │ setDefaultRange(r)    │ LineToolManager.setDefaultRange()     │  │
│  │ getLineToolManager()  │ ⚠️ Exposes entire plugin              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  LAYER 3: Plugin Private API (NEEDS ADAPTER)                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ createAlert(price, cond)  │ _userPriceAlerts.addAlert...()    │  │
│  │ removeAlert(id)           │ _userPriceAlerts.removeAlert()    │  │
│  │ onAlertsChanged(cb)       │ _userPriceAlerts.alertsChanged()  │  │
│  │ onAlertTriggered(cb)      │ _userPriceAlerts.alertTriggered() │  │
│  │ getAlerts()               │ _userPriceAlerts.alerts()         │  │
│  │ setAlertSymbol(name)      │ _userPriceAlerts.setSymbolName()  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 5. Method Classification by Consumer

### Used from App.jsx (via chartRefs.current[id])

| Method | App.jsx Line(s) | Handler | Layer |
|---|---|---|---|
| `undo()` | 595-599 | `handleUndo` | 2 |
| `redo()` | 600-603 | `handleRedo` | 2 |
| `clearTools()` | 607-618 | `handleToolChange('clear'/clear_all`) | 2 |
| `addPriceAlert()` | 816 | `handleSaveAlert` | 3 🔴 |
| `removePriceAlert()` | 828, 879 | `handleRemoveAlert`, `handlePauseAlert` | 3 🔴 |
| `restartPriceAlert()` | 861 | `handleRestartAlert` | 3 🔴 |
| `getChartContainer()` | 690, 721, 754 | `handleDownloadImage`, `handleCopyImage`, `handleFullScreen` | 1 |
| `getCurrentPrice()` | 786 | `handleAlertClick` | 1 |
| `toggleTimer()` | Timer button handler | — | 1 |
| `toggleReplay()` | 772 | `handleReplayClick` | 1 |
| `resetZoom()` | BottomBar reset | — | 1 |

### Used from ChartComponent (internal effects)

| Plugin Access | Effect/Function | Layer |
|---|---|---|
| `startTool(mappedTool)` | `useEffect([activeTool])` | 2 |
| `lockAllDrawings()` | `useEffect([isDrawingsLocked])` | 2 |
| `hideAllDrawings()` | `useEffect([isDrawingsHidden])` | 2 |
| `setVisible(bool)` | `useEffect([isTimerVisible])` | 1 |
| `applyOptions({timeframeSeconds})` | `loadData` | 1 |
| `setDefaultRange()` | `applyDefaultCandlePosition` | 2 |
| `_userPriceAlerts.alertsChanged().subscribe()` | `initializeLineTools()` | 3 🔴 |
| `_userPriceAlerts.alertTriggered().subscribe()` | `initializeLineTools()` | 3 🔴 |
| `_userPriceAlerts.setSymbolName()` | `initializeLineTools()` | 3 🔴 |
| `_userPriceAlerts.alerts()` | `initializeLineTools()` | 3 🔴 |

---

## 6. Adapter Targets (What Needs Wrapping)

### Target 1: AlertAdapter (Highest Priority)

Create an `AlertAdapter` class that wraps all `_userPriceAlerts` access:

```javascript
class AlertAdapter {
  constructor(lineToolManager) {
    this._alerts = lineToolManager._userPriceAlerts;
  }

  // Commands
  create(price, condition) { this._alerts.addAlertWithCondition(price, condition); }
  remove(id) { this._alerts.removeAlert(id); }
  setSymbol(name) { this._alerts.setSymbolName(name); }

  // Queries
  getAll() { return this._alerts.alerts(); }

  // Subscriptions (return unsubscribe handles)
  onChange(callback) { return this._alerts.alertsChanged().subscribe(callback); }
  onTrigger(callback) { return this._alerts.alertTriggered().subscribe(callback); }
}
```

**Impact:** Centralizes all 13 private accesses behind one class. If plugin internals change, only `AlertAdapter` needs updating.

### Target 2: ToolAdapter (Medium Priority)

Wraps `LineToolManager` methods used from `useEffect` blocks:

```javascript
class ToolAdapter {
  constructor(manager) { this._manager = manager; }

  activate(name) { this._manager.startTool(name); }
  undo() { this._manager.undo(); }
  redo() { this._manager.redo(); }
  clear() { this._manager.clearTools(); }
  lock() { this._manager.lockAllDrawings(); }
  unlock() { this._manager.unlockAllDrawings(); }
  hide() { this._manager.hideAllDrawings(); }
  show() { this._manager.showAllDrawings(); }
  isLocked() { return this._manager.areDrawingsLocked(); }
  isHidden() { return this._manager.areDrawingsHidden(); }
  setDefaultRange(range) { this._manager.setDefaultRange(range); }
}
```

**Impact:** Decouples ChartComponent from direct `LineToolManager` calls. Makes tool methods unit-testable.

### Target 3: TimerAdapter (Low Priority)

Wraps `PriceScaleTimer`:

```javascript
class TimerAdapter {
  constructor(timer) { this._timer = timer; }

  show() { this._timer.setVisible(true); }
  hide() { this._timer.setVisible(false); }
  isVisible() { return this._timer.isVisible(); }
  setInterval(seconds) { this._timer.applyOptions({ timeframeSeconds: seconds }); }
  updateCandle(open, close) { this._timer.updateCandleData(open, close); }
}
```

**Impact:** Cosmetic — `PriceScaleTimer` public API is already stable.

---

## 7. Method Dependency Map

```
chartRefs.current[id].METHOD()
  │
  ├── LAYER 1 (no plugin dep)
  │   ├── resetZoom()
  │   │     └── applyDefaultCandlePosition()
  │   │           ├── chartRef.current.timeScale()
  │   │           └── chartRef.current.priceScale()
  │   ├── getChartContainer()
  │   │     └── chartContainerRef.current
  │   ├── getCurrentPrice()
  │   │     └── dataRef.current[last].close ?? .value
  │   ├── toggleReplay()
  │   │     └── setIsReplayMode() + fullDataRef + series.setData()
  │   └── toggleTimer()
  │         └── priceScaleTimerRef.current.setVisible()
  │
  ├── LAYER 2 (plugin public API)
  │   ├── undo() / redo()
  │   │     └── lineToolManagerRef.current.undo()/.redo()
  │   ├── clearTools()
  │   │     └── lineToolManagerRef.current.clearTools()
  │   ├── getLineToolManager()       ⚠️ leaks whole plugin
  │   │     └── lineToolManagerRef.current
  │   └── [effects only]
  │         └── startTool() / lockAll() / hideAll() / setDefaultRange()
  │
  └── LAYER 3 (plugin PRIVATE API — needs adapter)
      ├── addPriceAlert(alert)              ← 4 private calls
      ├── removePriceAlert(externalId)      ← 2 private calls
      └── restartPriceAlert(price, cond)   ← 2 private calls
            └── manager._userPriceAlerts.*
```

---

## 8. Refactor Path (No Behavior Change)

### Step 1: Create `AlertAdapter` (documentation + class)

Create `src/plugins/adapter/AlertAdapter.js`:

```javascript
// AlertAdapter.js — wraps _userPriceAlerts private API
export class AlertAdapter {
  constructor(manager) {
    this._alerts = manager._userPriceAlerts;
  }

  create(price, condition = 'crossing') {
    if (!this._alerts || !Number.isFinite(Number(price))) return;
    if (typeof this._alerts.addAlertWithCondition === 'function') {
      this._alerts.addAlertWithCondition(Number(price), condition);
    }
  }

  remove(id) {
    if (this._alerts && typeof this._alerts.removeAlert === 'function') {
      this._alerts.removeAlert(id);
    }
  }

  setSymbol(name) {
    if (this._alerts && typeof this._alerts.setSymbolName === 'function') {
      this._alerts.setSymbolName(name);
    }
  }

  getAll() {
    if (this._alerts && typeof this._alerts.alerts === 'function') {
      return this._alerts.alerts();
    }
    return [];
  }

  onChange(callback) {
    if (this._alerts && typeof this._alerts.alertsChanged === 'function') {
      return this._alerts.alertsChanged().subscribe(callback);
    }
    return null;
  }

  onTrigger(callback) {
    if (this._alerts && typeof this._alerts.alertTriggered === 'function') {
      return this._alerts.alertTriggered().subscribe(callback);
    }
    return null;
  }
}
```

### Step 2: Instantiate in `initializeLineTools`

```javascript
// Inside initializeLineTools, after series.attachPrimitive(manager):
this._alertAdapter = new AlertAdapter(manager);
```

### Step 3: Route existing calls through adapter

```javascript
// useImperativeHandle before:
addPriceAlert: (alert) => {
  const manager = lineToolManagerRef.current;
  const userAlerts = manager._userPriceAlerts; // private
  userAlerts.addAlertWithCondition(...);
}

// useImperativeHandle after:
addPriceAlert: (alert) => {
  alertAdapter.create(alert.price, 'crossing');
}

// initializeLineTools before:
userAlerts.alertsChanged().subscribe(callback, manager);

// initializeLineTools after:
this._alertSub = alertAdapter.onChange(callback);
```

**Zero behavior change** — all existing callers see the same interface. Only internal implementation changes.

---

## 9. Summary

| Layer | Count | Current Access Pattern | Risk | Fix |
|---|---|---|---|---|
| L1: No plugin dep | 5 methods | `dataRef`, `chartRef`, React state | 🟢 None | Keep as-is |
| L2: Plugin public API | 11 methods + effects | `lineToolManagerRef.current.*` | 🟡 Low | Document as stable |
| L3: Plugin private API | 13 accesses across 2 code paths | `manager._userPriceAlerts.*` | 🔴 High | Wrap in AlertAdapter |

### Adapter Creation Priority

1. **AlertAdapter** — wraps 13 private accesses, highest fragility
2. **ToolAdapter** — wraps 11 public method calls, nice-to-have
3. **TimerAdapter** — wraps 4 calls, lowest priority