# Alert Rendering Flow

> Source file: `src/plugins/line-tools/line-tools.js` (6495 lines)

## Class Hierarchy

```
Li (data model, line 3630)
 └── Di extends Li (primitive, line 3946)
      ├── owns: Zt (PaneView, line 3615)
      │    ├── owns: Ri (main pane renderer, line 3405)
      │    └── owns: Ai (price axis renderer, line 3584)
      ├── owns: Ei (edit dialog, line 3692) → DOM overlay
      ├── owns: Hi (notification popup, line 4258) → DOM
      ├── owns: Mi (mouse handler, line 3307)
      └── uses: dt (alert checker utility, line 3900)

H (event emitter, line 3271) — used by Li for all events
ie (base renderer, line 3392) — parent of Ri and Ai
```

## Complete Call Chain

### 1. Alert Creation

```
User clicks on chart / calls API
  │
  ├─► Li.addAlert(price)                          [line 3656]
  │     └─► Li.addAlertWithCondition(price, "crossing")  [line 3659]
  │           ├── creates alert object: { price, id, condition }
  │           ├── this._alerts.set(id, alert)
  │           ├── this._alertAdded.fire(alert)    [line 3665]
  │           └── this._alertsChanged.fire()       [line 3665]
  │                 └─► Li._updateAlertsArray()    [line 3682]
  │
  ├─► Di.addToolAlert(tool, condition)             [line 4232]
  │     └─► Di.addAlertWithCondition(price, condition)  [inherited]
  │           creates alert with { type: "tool", toolRef: tool }
  │
  └─► Di.openEditDialog(id, data)                  [line 4058]
        └─► Ei.show(data, onSaveCallback)          [line 3838]
              └─► Creates DOM overlay dialog
                    └─► on save: Di.addAlertWithCondition() or Di.updateAlert()
```

### 2. Alert Becomes Visible on Chart

```
addAlertWithCondition() fires _alertsChanged
  │
  └─► Di._onDataChanged()                          [line 4017]
        ├── triggered by: series.subscribeDataChanged()
        └── also called on every candle update
              │
              ├── Di.checkPriceCrossings(candle)   [line 4102]
              │     └── fires _onAlertTriggered if crossing detected
              │           └─► Hi.show(notification) [line 4387] → DOM toast
              │
              └── Di.updateAllViews()              [line 4026]
                    │
                    ├── alerts().forEach() → updates tool-based alert prices
                    │
                    └── Di._calculateRendererData(alerts, mousePos)  [line 4163]
                          │  Converts price → pixel Y coordinates
                          │  Determines hover state, hit testing
                          │  Returns renderer data object:
                          │    { alertIcon, alerts[], button, color, crosshair }
                          │
                          ├── Zt(paneView).update(rendererData)   [line 3626]
                          │     └─► Ri.update(data)               [line 3394]
                          │
                          └── Zt(pricePaneView).update(rendererData)
                                └─► Ai.update(data)               [line 3394]

Lightweight Charts rendering loop:
  │
  └─► Zt.renderer() → returns Ri or Ai           [line 3623]
        │
        └─► Ri.draw(bitmapCoordinateSpace)         [line 3406]
              │
              ├── _drawAlertLines()                [line 3432]
              │     └─► _drawHorizontalLine()      [line 3414]
              │           Dashed line across chart pane
              │
              ├── _drawAlertIcons()                [line 3444]
              │     └─► _drawLabel()               [line 3552]
              │           Bell icon at chart right edge
              │
              ├── _drawCrosshairLine()             [line 3529]
              │     └─► _drawHorizontalLine()      (when hovering)
              │
              ├── _drawCrosshairLabelButton()      [line 3537]
              │     └─► _drawLabel()               (add-alert "+" button)
              │
              └── _drawAlertLabel()                [line 3466]
                    Hover tooltip showing alert info + close button
```

### 3. Alert Removal

```
Di.removeAlert(id)  (inherited from Li)           [line 3667]
  ├── this._alerts.delete(id)
  ├── this._alertRemoved.fire(id)
  └── this._alertsChanged.fire()
        └─► updateAllViews() → alert disappears from canvas

Also triggered automatically:
  Di.checkPriceCrossings() detects crossing → fires _onAlertTriggered
    → n.forEach(id => this.removeAlert(id))      [line 4147]
```

## Rendering Mechanism

**Canvas drawing via Lightweight Charts Primitive API.**

| Aspect | Mechanism |
|--------|-----------|
| Alert line on chart | `CanvasRenderingContext2D` (dashed line) |
| Alert icon | `CanvasRenderingContext2D` (filled Path2D) |
| Alert hover label | `CanvasRenderingContext2D` (rounded rect + text) |
| Crosshair label | `CanvasRenderingContext2D` (filled rect + text) |
| Edit dialog | DOM element (overlay injected into `document.body`) |
| Notifications | DOM element (toast injected into `document.body`) |

The primitive is attached to the series via:
```js
this._userPriceAlerts = new Di();
this.series.attachPrimitive(this._userPriceAlerts);  // line ~2320
```

This integrates with Lightweight Charts' rendering pipeline. The chart calls `paneViews()` and `priceAxisPaneViews()` on the primitive, which return `Zt` instances. Each `Zt` provides a renderer (`Ri` or `Ai`) that performs canvas drawing.

## Style Constants

Defined at **line 3249**:

| Constant | Value | Meaning |
|----------|-------|---------|
| `ut` | `21` | Alert icon badge width (px) |
| `Qt` | `21` | Crosshair label badge height (px) |
| `Ti` | `17` | Alert icon badge height (px) |
| `Ht` | `4` | Icon internal padding-left (px) |
| `wi` | `2` | Icon internal padding-top (px) |
| `qt` | `13` | Icon natural size (px) |
| `Yt` | `13` | Icon render size (px) |
| `jt` | `5` | Hit-test threshold for alert proximity (px) |
| `te` | `5.81` | Per-character width for label sizing (px) |
| `$` | `26` | Close button width (px) |
| `ee` | `20` | Hover label height (px) |
| `It` | `9` | Hover label left padding (px) |
| `Pi` | `10` | Close icon SVG viewBox size |

## Color Sources

### Hardcoded in Canvas Drawing (`Ri` renderer, lines 3405-3580)

| Element | Color | Line | Code |
|---------|-------|------|------|
| **Alert line stroke** | `#131722` | 3434 | `this._data.color` (set at 4202: `color: "#131722"`) |
| **Alert line width** | `1` px | 3438 | `lineWidth: 1` |
| **Alert line dash** | `[4px, 4px]` | 3423-3424 | `i.setLineDash([n, n])` where `n = 4 * pixelRatio` |
| **Alert icon badge fill** | `#131722` | 3567 | `i.fillStyle = e.color` |
| **Alert icon glyph** | `#FFFFFF` | 3573 | `i.fillStyle = "#FFFFFF"` |
| **Hover label background** | `#FFFFFF` | 3488 | `e.fillStyle = "#FFFFFF"` |
| **Hover label border** | `#131722` | 3513 | `e.strokeStyle = "#131722"` |
| **Hover label border width** | `1` px | 3513 | `e.lineWidth = 1 * horizontalPixelRatio` |
| **Hover label text** | `#131722` | 3513 | `e.fillStyle = "#131722"` |
| **Hover label font** | `12px sans-serif` | 3513 | `Math.round(12 * verticalPixelRatio)` |
| **Hover close button background** | `#F0F3FA` | 3496 | `e.fillStyle = "#F0F3FA"` |
| **Hover close button separator** | `#F1F3FB` | 3502 | `e.fillRect(...)` |
| **Hover close icon (×)** | `#131722` | 3524 | `e.fillStyle = "#131722"` |
| **Hover label corner radius** | `4px` | 3481 | `const r = 4 * horizontalPixelRatio` |

### Hardcoded in `Ai` (Price Axis Renderer, line 3584)

| Element | Color | Line | Code |
|---------|-------|------|------|
| **Crosshair label fill** | `#131722` | 3595 | `e.fillStyle = this._data.color` |
| **Crosshair label text** | `#FFFFFF` | 3603 | `e.fillStyle = "#FFFFFF"` |
| **Crosshair label font** | `12px sans-serif` | 3603 | `Math.round(12 * verticalPixelRatio)` |

### In `_calculateRendererData` (line 4163)

| Element | Color | Line | Code |
|---------|-------|-------|------|
| **Default color** | `#131722` | 4202 | `color: "#131722"` |
| **Button hover color** | `#50535E` | 4199 | `hoverColor: "#50535E"` |

### Injected CSS — Edit Dialog (`Ei._injectStyles`, line 3701)

| Element | Color | Line |
|---------|-------|------|
| Dialog overlay background | `rgba(0, 0, 0, 0.4)` | 3711 |
| Dialog background | `#ffffff` | 3720 |
| Dialog title color | `#131722` | 3741 |
| Close button color | `#787B86` | 3749 |
| Input border focus | `#2962FF` | 3791 |
| Save button background | `#2962FF` | 3823 |
| Footer background | `#F8F9FD` | 3799 |

### Injected CSS — Notifications (`Hi._injectStyles`, line 4267)

| Element | Color | Line |
|---------|-------|------|
| Notification background | `#F5F8FA` | 4284 |
| Header text color | `#131722` | 4317 |
| Message text color | `#131722` | 4326 |
| Edit link color | `#2962FF` | 4338 |
| Timestamp color | `#787B86` | 4349 |
| Close button color | `#787B86` | 4357 |

### External CSS Files (none affecting chart-rendered alerts)

| File | Relevance |
|------|-----------|
| `line-tools.css` | No alert styles |
| `src/index.css` | No alert styles |
| `components/Alert/AlertDialog.module.css` | React component (separate system) |
| `components/Alerts/AlertsPanel.module.css` | React component (separate system) |

## Event System

### Class `H` (line 3271) — Lightweight Event Emitter

```
subscribe(callback, linkedObject, singleshot)
unsubscribe(callback)
unsubscribeAll(linkedObject)
fire(data)
```

### Events Fired by `Li`

| Event | Fired When | Data |
|-------|------------|------|
| `_alertAdded` | addAlertWithCondition() called | `{ price, id, condition }` |
| `_alertRemoved` | removeAlert() called | `id` (string) |
| `_alertChanged` | updateAlert/updateAlertPrice called | `{ price, id, condition }` |
| `_alertsChanged` | any add/remove/update | `undefined` |

### Events Subscribed To

| Subscriber | Event | Handler |
|------------|-------|---------|
| `Li` constructor (line 3637) | `_alertsChanged` | `_updateAlertsArray()` |
| Parent class (line ~2320) | `alertTriggered()` | `Hi.show()` → notification toast |

### Event Flow Summary

```
addAlertWithCondition()
  ├─ _alertAdded.fire()      → external consumers (if any)
  ├─ _alertsChanged.fire()   → _updateAlertsArray()
  └─ _requestUpdate()        → triggers LWC repaint
        └─ updateAllViews()
              └─ _calculateRendererData()
                    └─ Zt.update(data)
                          └─ Ri.draw() → canvas
```

## Easiest Customization Points

### 1. Alert Line Color
**File:** `line-tools.js`  
**Line:** 4202  
**Current:** `color: "#131722"`  
**Change to:** Any hex color to change all alert lines.

### 2. Alert Line Thickness
**File:** `line-tools.js`  
**Line:** 3438  
**Current:** `lineWidth: 1`  
**Change to:** Any number (e.g., `2` for thicker lines).

### 3. Alert Line Dash Pattern
**File:** `line-tools.js`  
**Line:** 3423  
**Current:** `[4 * pixelRatio, 4 * pixelRatio]`  
**Change to:** `[8, 4]` for longer dashes, or `[]` for solid line.

### 4. Alert Icon Badge Size
**File:** `line-tools.js`  
**Line:** 3249  
**Constants:** `ut = 21` (width), `Ti = 17` (height)  
**Also:** `qt = 13`, `Yt = 13` (icon SVG render size)

### 5. Alert Label Text
**File:** `line-tools.js`  
**Line:** 4181  
**Current:** `` `${this._symbolName} crossing ${formatter.format(price)}` ``  
**Change template** to alter label content.

### 6. Hover Label Background / Border
**File:** `line-tools.js`  
**Line:** 3488 (bg `#FFFFFF`), 3513 (border `#131722`)  
**Change:** `e.fillStyle` and `e.strokeStyle` values.

### 7. Hit-Test Threshold (how close mouse must be to alert)
**File:** `line-tools.js`  
**Line:** 3249  
**Constant:** `jt = 5`  
**Increase** for easier hover detection.

### 8. Close Button Width
**File:** `line-tools.js`  
**Line:** 3249  
**Constant:** `$ = 26`  
**Change** to make close button larger/smaller.

### 9. Per-Character Width (label auto-sizing)
**File:** `line-tools.js`  
**Line:** 3249  
**Constant:** `te = 5.81`  
**Adjust** if using a different font.

## Key Line Number Reference

| Item | Line |
|------|------|
| Style constants (`ut`, etc.) | 3249 |
| Event emitter `H` | 3271 |
| Mouse handler `Mi` | 3307 |
| Base renderer `ie` | 3392 |
| `Ri` — main pane renderer | 3405 |
| `Ri._drawHorizontalLine()` | 3414 |
| `Ri._drawAlertLines()` | 3432 |
| `Ri._drawAlertIcons()` | 3444 |
| `Ri._drawAlertLabel()` | 3466 |
| `Ri._drawCrosshairLine()` | 3529 |
| `Ri._drawCrosshairLabelButton()` | 3537 |
| `Ri._drawLabel()` | 3552 |
| `Ai` — price axis renderer | 3584 |
| `Ai._drawCrosshairLabel()` | 3590 |
| `Zt` — PaneView wrapper | 3615 |
| `Li` — data model | 3630 |
| `Li.addAlertWithCondition()` | 3659 |
| `Li.removeAlert()` | 3667 |
| `Ei` — edit dialog (DOM) | 3692 |
| `dt` — alert condition checker | 3900 |
| `Di extends Li` — primitive | 3946 |
| `Di.attached()` — setup | 3965 |
| `Di.updateAllViews()` | 4026 |
| `Di._calculateRendererData()` | 4163 |
| `Di.checkPriceCrossings()` | 4102 |
| `Di.addToolAlert()` | 4232 |
| `Hi` — notification popup (DOM) | 4258 |
| `Hi._injectStyles()` | 4267 |
| `Hi._createNotification()` | 4441 |
| `Hi._playAlarm()` | 4397 |

## Architecture Notes

1. **All chart-visible alert rendering is pure canvas.** No DOM elements are used for alert lines, icons, or labels on the chart itself.

2. **DOM elements are only used for:** edit dialog (`Ei`), notification toasts (`Hi`), and the inline text editor (`Gi`).

3. **The primitive pattern** (`series.attachPrimitive()`) allows the alert system to hook into Lightweight Charts' rendering pipeline without modifying the library itself.

4. **No CSS classes affect chart-rendered alerts.** All visual styling is done via canvas API calls with hardcoded values.

5. **Style constants are top-level `const` declarations** (line 3249), making them easy to locate but not configurable at runtime without modification.

6. **Color values are duplicated** across multiple locations (renderer methods, `_calculateRendererData`), which means changing colors requires touching multiple code sites for full consistency.