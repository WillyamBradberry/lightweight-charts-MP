# Drawing Style Map

> Source file: `src/plugins/line-tools/line-tools.js` (6495 lines)

## Architecture Overview

```
Tool Class (data model)
  └── creates PaneView (coordinate conversion)
        └── creates Renderer (canvas drawing)

User creates tool → series.attachPrimitive(tool)
Chart calls tool.paneViews() → PaneView.renderer() → Renderer.draw()
```

All drawing tools use the **Lightweight Charts Primitive API**. No DOM elements are used for chart rendering. All visual output is canvas-based via `CanvasRenderingContext2D`.

---

## Common Style Infrastructure

### Line Style Function `O()` (line 64) / `pe()` (line 376)

Both functions are identical — set `ctx.setLineDash()` based on index:

| Index | Name | Pattern |
|-------|------|---------|
| 0 | Solid | `[]` |
| 1 | Dotted | `[2, 2]` |
| 2 | Dashed | `[6, 6]` |
| 3 | Large Dashed | `[10, 10]` |
| 4 | Sparse Dotted | `[2, 10]` |

### Selection Anchor Function `v()` (line 79) / `de()` (line 391)

Draws a circular selection handle when tool is selected:

| Property | Value |
|----------|-------|
| Fill color | `#FFFFFF` |
| Stroke color | `#2962FF` |
| Line width | `2` px |
| Radius | `6 * pixelRatio` px |

### Coordinate Conversion `T()` (line ~130)

Converts logical chart point `{logical, price}` to pixel `{x, y}` via chart time scale and series price scale.

---

## Tool-by-Tool Style Reference

---

### 1. TrendLine

| Aspect | Value |
|--------|-------|
| **Tool type string** | `"TrendLine"` |
| **Tool class** | `W` (line 293) |
| **PaneView class** | `he` (line 256) |
| **Renderer class** | `ce` (line 223) |
| **Default options** | `_e` (line 283) |

#### Default Options (`_e`, line 283)

```js
{
  lineColor: "rgb(0, 0, 0)",
  width: 2,
  lineStyle: 0,          // Solid
  extendLeft: false,
  extendRight: false,
  leftEnd: 0,            // 0=none, 1=arrow
  rightEnd: 0,           // 0=none, 1=arrow
  locked: false
}
```

#### Rendering Details

| Element | Source | Code Location |
|---------|--------|---------------|
| **Line color** | `this._options.lineColor` | line 243 |
| **Line width** | `this._options.width` | line 243 |
| **Line dash** | `O(ctx, this._options.lineStyle)` | line 243 |
| **Arrow heads** | `_drawArrow()` | line 246 |
| **Selection anchors** | `v(e, x, y)` | line 243 |
| **Extends** | `Kt()` clip function | line 235-242 |

#### Canvas Drawing Flow

```
ce.draw()
  ├── Kt(p1, p2, width, height, extendLeft, extendRight) → clipped line
  ├── ctx.lineWidth = options.width
  ├── ctx.strokeStyle = options.lineColor
  ├── O(ctx, options.lineStyle)
  ├── ctx.moveTo() / ctx.lineTo() / ctx.stroke()
  ├── _drawArrow() if leftEnd/rightEnd === 1
  └── v() if selected
```

#### Easiest Customization Point

**`_e.lineColor`** (line 284) — change default color for all new trend lines.
Runtime: `tool.applyOptions({ lineColor: "#FF0000" })`

---

### 2. HorizontalLine

| Aspect | Value |
|--------|-------|
| **Tool type string** | `"HorizontalLine"` |
| **Tool class** | `Y` (line 436) |
| **PaneView class** | `ge` (line 413) |
| **Renderer class** | `fe` (line 398) |
| **Default options** | `me` (line 430) |

#### Default Options (`me`, line 430)

```js
{
  lineColor: "#2962FF",
  width: 2,
  lineStyle: 0,          // Solid
  locked: false
}
```

#### Rendering Details

| Element | Source | Code Location |
|---------|--------|---------------|
| **Line color** | `this._options.lineColor` | line 409 |
| **Line width** | `this._options.width` | line 409 |
| **Line dash** | `pe(ctx, this._options.lineStyle)` | line 409 |
| **Line extent** | Full width: `0` → `mediaSize.width` | line 408-409 |
| **Selection anchor** | `de(e, x - 30, y)` at right edge | line 409 |

#### Canvas Drawing Flow

```
fe.draw()
  ├── ue(y, verticalPixelRatio) → pixel y
  ├── ctx.lineWidth = options.width
  ├── ctx.strokeStyle = options.lineColor
  ├── pe(ctx, options.lineStyle)
  ├── ctx.moveTo(0, y) → ctx.lineTo(fullWidth, y) → ctx.stroke()
  └── de() if selected (anchor at right edge)
```

#### Easiest Customization Point

**`me.lineColor`** (line 431) — change default color for all new horizontal lines.
Runtime: `tool.applyOptions({ lineColor: "#FF0000" })`

---

### 3. Ray (Horizontal Ray)

| Aspect | Value |
|--------|-------|
| **Tool type string** | `"Ray"` |
| **Tool class** | `j` (line 528) |
| **PaneView class** | `ve` (line 503) |
| **Renderer class** | `xe` (line 487) — shared with HorizontalLine |
| **Default options** | `ye` (line 523) |

#### Default Options (`ye`, line 523)

```js
{
  lineColor: "#2962FF",
  width: 2,
  lineStyle: 0           // Solid
}
```

#### Rendering Details

| Element | Source | Code Location |
|---------|--------|---------------|
| **Line color** | `this._options.lineColor` | line 499 |
| **Line width** | `this._options.width` | line 499 |
| **Line dash** | `O(ctx, this._options.lineStyle)` | line 499 |
| **Line extent** | From point.x → full width (right only) | line 498-499 |
| **Selection anchor** | `v(e, x, y)` at origin point | line 499 |

#### Canvas Drawing Flow

```
xe.draw()
  ├── m(x, horizontalPixelRatio) → pixel x
  ├── m(y, verticalPixelRatio) → pixel y
  ├── ctx.lineWidth = options.width
  ├── ctx.strokeStyle = options.lineColor
  ├── O(ctx, options.lineStyle)
  ├── ctx.moveTo(x, y) → ctx.lineTo(fullWidth, y) → ctx.stroke()
  └── v() if selected
```

#### Easiest Customization Point

**`ye.lineColor`** (line 524) — change default color for all new rays.
Runtime: `tool.applyOptions({ lineColor: "#FF0000" })`

---

### 4. Rectangle

| Aspect | Value |
|--------|-------|
| **Tool type string** | `"Rectangle"` |
| **Tool class** | `J` (line 727) |
| **PaneView class** | `Pe` (line 693) |
| **Renderer class** | `be` (line 676) |
| **Default options** | `Se` (line 720) |

#### Default Options (`Se`, line 720)

```js
{
  lineColor: "rgb(41, 98, 255)",
  width: 2,
  backgroundColor: "rgba(41, 98, 255, 0.2)",
  lineStyle: 0,          // Solid
  locked: false
}
```

#### Rendering Details

| Element | Source | Code Location |
|---------|--------|---------------|
| **Border color** | `this._options.lineColor` | line 689 |
| **Border width** | `this._options.width` | line 689 |
| **Fill color** | `this._options.backgroundColor` | line 689 |
| **Line dash** | `O(ctx, this._options.lineStyle)` | line 689 |
| **Shape** | `ctx.rect(x, y, w, h)` | line 689 |
| **Selection anchors** | `v()` at all 4 corners | line 689 |

#### Canvas Drawing Flow

```
be.draw()
  ├── Calculate rect: x, y, width, height from p1/p2
  ├── ctx.lineWidth = options.width
  ├── ctx.strokeStyle = options.lineColor
  ├── ctx.fillStyle = options.backgroundColor
  ├── O(ctx, options.lineStyle)
  ├── ctx.rect() → ctx.fill() → ctx.stroke()
  └── v() × 4 if selected (all corners)
```

#### Easiest Customization Point

**`Se.lineColor`** and **`Se.backgroundColor`** (lines 721-723) — change border and fill.
Runtime: `tool.applyOptions({ lineColor: "#FF0000", backgroundColor: "rgba(255,0,0,0.1)" })`

---

### 5. Fib Retracement

| Aspect | Value |
|--------|-------|
| **Tool type string** | `"FibRetracement"` |
| **Tool class** | `bt` (line 1118) |
| **PaneView class** | `De` (line 1075) |
| **Renderer class** | `Ee` (line 1047) |
| **Default options** | `He` (line 1105) |

#### Default Options (`He`, line 1105)

```js
{
  width: 1,
  levels: [
    { coeff: 0,    color: "#787b86" },
    { coeff: 0.236, color: "#f44336" },
    { coeff: 0.382, color: "#81c784" },
    { coeff: 0.5,  color: "#4caf50" },
    { coeff: 0.618, color: "#009688" },
    { coeff: 0.786, color: "#64b5f6" },
    { coeff: 1,    color: "#787b86" },
    { coeff: 1.618, color: "#2962ff" }
  ]
}
```

#### Rendering Details

| Element | Source | Code Location |
|---------|--------|---------------|
| **Level line width** | `this._options.width` | line 1069 |
| **Level line color** | `_.color` (per-level) | line 1069 |
| **Level label** | `"${coeff} (${price})"` | line 1069 |
| **Level label font** | `"10px Arial"` (hardcoded) | line 1069 |
| **Level label color** | `_.color` (per-level) | line 1069 |
| **Diagonal guide** | `"rgba(120, 120, 120, 0.5)"` (hardcoded) | line 1063 |
| **Diagonal dash** | `[5, 5]` (hardcoded) | line 1063 |
| **Diagonal width** | `1` px (hardcoded) | line 1063 |
| **Selection anchors** | `v()` at p1, p2 | line 1071 |

#### Canvas Drawing Flow

```
Ee.draw()
  ├── Draw diagonal guide line (hardcoded gray dashed)
  │   ├── ctx.strokeStyle = "rgba(120, 120, 120, 0.5)"
  │   ├── ctx.setLineDash([5, 5])
  │   └── ctx.moveTo(p1) → ctx.lineTo(p2) → ctx.stroke()
  │
  └── For each level:
      ├── price = p2Price - (p2Price - p1Price) * coeff
      ├── y = priceToCoordinate(price)
      ├── ctx.lineWidth = options.width
      ├── ctx.strokeStyle = level.color
      ├── ctx.moveTo(minX, y) → ctx.lineTo(maxX, y) → ctx.stroke()
      ├── ctx.font = "10px Arial"
      └── ctx.fillText("${coeff} (${price})", minX + 2, y - 2)
```

#### Easiest Customization Points

1. **Level colors:** `He.levels[i].color` (lines 1108-1115) — change individual level colors
2. **Level coefficients:** `He.levels[i].coeff` — add/remove Fibonacci levels
3. **Level line width:** `He.width` (line 1106)
4. **Diagonal guide color:** line 1063 — change hardcoded `"rgba(120, 120, 120, 0.5)"`

---

### 6. Fib Extension

| Aspect | Value |
|--------|-------|
| **Tool type string** | `"FibExtension"` |
| **Tool class** | `pt` (line 2593) |
| **PaneView class** | `gi` (line 2545) |
| **Renderer class** | `fi` (line 2513) |
| **Default options** | `mi` (line 2582) |

#### Default Options (`mi`, line 2582)

```js
{
  width: 1,
  levels: [
    { coeff: 0,    color: "#787b86" },
    { coeff: 0.618, color: "#f44336" },
    { coeff: 1,    color: "#4caf50" },
    { coeff: 1.618, color: "#2962ff" },
    { coeff: 2.618, color: "#9c27b0" },
    { coeff: 4.236, color: "#ff9800" }
  ]
}
```

#### Rendering Details

| Element | Source | Code Location |
|---------|--------|---------------|
| **Level line width** | `this._options.width` | line 2537 |
| **Level line color** | `u.color` (per-level) | line 2537 |
| **Level label** | `"${coeff*100}% (${price})"` | line 2538-2539 |
| **Level label font** | `"10px Arial"` (hardcoded) | line 2537 |
| **Diagonal guide** | `"rgba(120, 120, 120, 0.5)"` (hardcoded) | line 2531 |
| **Diagonal dash** | `[5, 5]` (hardcoded) | line 2531 |
| **Diagonal width** | `1` px (hardcoded) | line 2531 |
| **Selection anchors** | `v()` at p1, p2, p3 | line 2541 |

#### Canvas Drawing Flow

```
fi.draw()
  ├── Draw 2 diagonal guide lines (p1→p2, p2→p3)
  │   ├── ctx.strokeStyle = "rgba(120, 120, 120, 0.5)"
  │   └── setLineDash([5, 5])
  │
  └── For each level:
      ├── price = p3Price + (p2Price - p1Price) * coeff
      ├── y = priceToCoordinate(price)
      ├── ctx.lineWidth = options.width
      ├── ctx.strokeStyle = level.color
      ├── ctx.moveTo(minX, y) → ctx.lineTo(maxX, y) → ctx.stroke()
      ├── ctx.font = "10px Arial"
      └── ctx.fillText("${coeff*100}% (${price})", minX + 2, y - 2)
```

#### Easiest Customization Points

1. **Level colors:** `mi.levels[i].color` (lines 2585-2590)
2. **Level coefficients:** `mi.levels[i].coeff`
3. **Level line width:** `mi.width` (line 2583)
4. **Diagonal guide color:** line 2531

---

## Additional Tools (Reference)

### Parallel Channel

| Aspect | Value |
|--------|-------|
| **Tool class** | `N` (line 970) |
| **PaneView** | `Ae` (line 929) |
| **Renderer** | `Ve` (line 905) |
| **Defaults** | `Le` (line 962) |

```js
Le = {
  lineColor: "rgb(33, 150, 243)",
  backgroundColor: "rgba(33, 150, 243, 0.2)",
  width: 1,
  lineStyle: 0,
  showMiddle: true,       // center line
  locked: false
}
```

### Triangle

| Aspect | Value |
|--------|-------|
| **Tool class** | `_t` (line 1244) |
| **PaneView** | `Fe` (line 1204) |
| **Renderer** | `Oe` (line 1186) |
| **Defaults** | `ze` (line 1237) |

```js
ze = {
  lineColor: "rgb(33, 150, 243)",
  backgroundColor: "rgba(33, 150, 243, 0.2)",
  width: 1,
  lineStyle: 0,
  locked: false
}
```

### Vertical Line

| Aspect | Value |
|--------|-------|
| **Tool class** | `Z` (line 628) |
| **PaneView** | `we` (line 598) |
| **Renderer** | `Te` (line 576) |
| **Defaults** | `Ce` (line 618) |

```js
Ce = {
  lineColor: "#2962FF",
  width: 2,
  lineStyle: 0,
  showLabel: false,
  labelBackgroundColor: "rgba(255, 255, 255, 0.85)",
  labelTextColor: "rgb(0, 0, 0)",
  locked: false
}
```

### Text

| Aspect | Value |
|--------|-------|
| **Tool class** | `Ct` (line 831) |
| **PaneView** | `ke` (line 803) |
| **Renderer** | `Me` (line 787) |
| **Defaults** | `Re` (line 825) |

```js
Re = {
  color: "rgb(0, 0, 0)",
  fontSize: 14,
  fontFamily: "Arial",
  locked: false
}
```

### PriceRange / Measure

| Aspect | Value |
|--------|-------|
| **Tool class** | `Mt` (line 1879) |
| **PaneView** | `Ke` (line 1843) |
| **Renderer** | `Ge` (line 1811) |
| **Defaults** | `Qe` (line 1871) |

```js
Qe = {
  backgroundColor: "rgba(41, 98, 255, 0.2)",
  borderColor: "rgb(41, 98, 255)",
  borderWidth: 2,
  extendLeft: false,
  extendRight: false,
  locked: false
}
```

### DateRange

| Aspect | Value |
|--------|-------|
| **Tool class** | `Lt` (line 2469) |
| **PaneView** | `di` (line 2436) |
| **Renderer** | `fi` (line 2513) — PriceRange-style renderer |
| **Defaults** | `ui` (line 2464) |

```js
ui = {
  backgroundColor: "rgba(41, 98, 255, 0.2)",
  borderColor: "rgb(41, 98, 255)",
  borderWidth: 2
}
```

---

## Alert Line Rendering (Supplemental)

Alert lines rendered by `Ri` (line 3405) are visually distinct from tool lines:

| Element | Source | Code Location |
|---------|--------|---------------|
| **Alert line color** | `this._data.color` → `"#131722"` | line 3434, 4202 |
| **Alert line width** | `1` px (hardcoded) | line 3438 |
| **Alert line dash** | `[4px, 4px]` (hardcoded) | line 3423-3424 |
| **Alert icon badge** | `"#131722"` fill, `"#FFFFFF"` icon | line 3567, 3573 |
| **Alert hover label bg** | `"#FFFFFF"` | line 3488 |
| **Alert hover label border** | `"#131722"`, 1px | line 3513 |
| **Alert hover label text** | `"#131722"`, `12px sans-serif` | line 3513 |

See `alert-rendering-flow.md` for full alert rendering analysis.

---

## Cross-Tool Style Comparison

| Property | TrendLine | HorizontalLine | Ray | Rectangle | FibRetracement | FibExtension |
|----------|-----------|----------------|-----|-----------|----------------|--------------|
| **Default color** | `rgb(0,0,0)` | `#2962FF` | `#2962FF` | `rgb(41,98,255)` | per-level | per-level |
| **Default width** | `2` | `2` | `2` | `2` | `1` | `1` |
| **Default dash** | `0` (solid) | `0` (solid) | `0` (solid) | `0` (solid) | N/A | N/A |
| **Has fill** | No | No | No | Yes | No | No |
| **Has label** | No | No | No | No | Yes (price) | Yes (percent+price) |
| **Arrow ends** | Yes | No | No | No | No | No |
| **Extends** | Left/Right | Full width | Right only | No | No | No |
| **Multi-level** | No | No | No | No | Yes (8) | Yes (6) |

---

## Runtime Style Modification

All tools support runtime style changes via:

```js
tool.applyOptions({
  lineColor: "#FF0000",
  width: 3,
  lineStyle: 2,  // Dashed
  backgroundColor: "rgba(255, 0, 0, 0.1)"
});
```

For Fib tools, level-specific colors:

```js
tool.applyOptions({
  levels: [
    { coeff: 0, color: "#787b86" },
    { coeff: 0.382, color: "#FF0000" },
    // ...
  ]
});
```

### Template System

Style templates are supported via `ot` class (line 2647):

```js
// Save current tool style as template
ot.saveTemplate("My Blue Line", tool);

// Apply template to another tool
ot.applyTemplate(templateId, anotherTool);

// Extract style properties from tool
ot.extractStyles(tool);  // → { lineColor, color, width, lineWidth }
```

Templates are persisted in `localStorage` under key `"lineTool_templates"`.

---

## Key Line Number Reference — Defaults

| Constant | Line | Tool |
|----------|------|------|
| `_e` | 283 | TrendLine defaults |
| `me` | 430 | HorizontalLine defaults |
| `ye` | 523 | Ray defaults |
| `Ce` | 618 | VerticalLine defaults |
| `Se` | 720 | Rectangle defaults |
| `Re` | 825 | Text defaults |
| `Le` | 962 | ParallelChannel defaults |
| `He` | 1105 | FibRetracement defaults |
| `ze` | 1237 | Triangle defaults |
| `ui` | 2464 | DateRange defaults |
| `mi` | 2582 | FibExtension defaults |
| `Qe` | 1871 | PriceRange defaults |

## Key Line Number Reference — Renderers

| Renderer | Line | Tool |
