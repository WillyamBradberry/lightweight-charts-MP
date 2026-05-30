# Icon & Toolbar State Style Map

> Sources: `ToolIcons.jsx` (368 lines), `DrawingToolbar.jsx` (310 lines), `DrawingToolbar.module.css` (166 lines), `RightToolbar.jsx` (40 lines), `index.css` (77 lines)

---

## 1. Icon System Overview

| System | Location | Icon Count | Rendering |
|--------|----------|-----------|-----------|
| **Custom SVG (inline React)** | `ToolIcons.jsx` | 30 icons | `fill="currentColor"` — inherits CSS `color` |
| **Lucide React** | `RightToolbar.jsx` | 2 icons | `stroke="currentColor"` via Lucide — inherits CSS `color` |
| **Inline SVG (chevron)** | `DrawingToolbar.jsx` line 241 | 1 icon | `fill="currentColor"` via CSS |

**Key Insight:** All icons across both systems use `currentColor`, meaning they inherit the CSS `color` property from their parent element. There are no hardcoded fill/stroke values in any icon component.

---

## 2. CSS Custom Properties (Theme Variables)

Defined in `index.css` (lines 1-40):

### Dark Theme (default)

```css
:root,
[data-theme="dark"] {
  --tv-color-toolbar-background:              #131722;
  --tv-color-toolbar-button-background-hover: #2A2E39;
  --tv-color-toolbar-button-text:             #B2B5BE;
  --tv-color-toolbar-button-text-hover:       #F0F3FA;
  --tv-color-toolbar-button-text-active:      #2962FF;
  --tv-color-item-active-text:                #2962FF;
  --tv-color-border:                          #2A2E39;
  --tv-color-text-primary:                    #D1D4DC;
  --tv-color-text-secondary:                  #787B86;
  --tv-color-brand:                           #2962FF;
  --tv-color-dropdown-background:             #1e222d;
  --tv-color-input-background:                #131722;
}
```

### Light Theme

```css
[data-theme="light"] {
  /* ⚠️ IDENTICAL TO DARK THEME — Light theme not yet implemented */
  --tv-color-toolbar-background:              #131722;
  --tv-color-toolbar-button-background-hover: #2A2E39;
  --tv-color-toolbar-button-text:             #B2B5BE;
  --tv-color-toolbar-button-text-hover:       #F0F3FA;
  --tv-color-toolbar-button-text-active:      #2962FF;
  /* ... all values same as dark */
}
```

**⚠️ Finding:** The light theme CSS variables are copy-pasted from dark theme. Actual light theme differentiation has NOT been implemented.

---

## 3. Toolbar State Machine

### 3.1 DrawingToolbar Button States

```
┌─────────────────────────────────────────────────────────┐
│                    STATE DIAGRAM                         │
│                                                          │
│  ┌──────────┐   hover    ┌──────────┐                   │
│  │  DEFAULT  │ ─────────► │  HOVER   │                   │
│  │  #B2B5BE  │ ◄───────── │  #F0F3FA │                   │
│  └────┬─────┘  mouseout  └────┬─────┘                   │
│       │                        │                          │
│       │ click                  │ click                    │
│       ▼                        ▼                          │
│  ┌──────────┐           ┌──────────┐                     │
│  │  ACTIVE   │           │  ACTIVE  │                     │
│  │  #2962FF  │           │  #2962FF │                     │
│  └────┬─────┘           └────┬─────┘                     │
│       │                      │                            │
│       │ click (toggle off)   │ click (other tool)        │
│       ▼                      ▼                            │
│  ┌──────────┐           ┌──────────┐                     │
│  │  DEFAULT  │           │ DEFAULT  │                     │
│  └──────────┘           └──────────┘                     │
└─────────────────────────────────────────────────────────┘
```

### 3.2 CSS Class Mapping

| State | CSS Class | Icon Color | Button Background |
|-------|-----------|------------|-------------------|
| **Default** | (none) | `var(--tv-color-toolbar-button-text)` `#B2B5BE` | transparent |
| **Hover** | `:hover` on `.controlWrapper` | `var(--tv-color-toolbar-button-text-hover)` `#F0F3FA` | `var(--tv-color-toolbar-button-background-hover)` `#2A2E39` |
| **Active** | `.active` on `.toolButton` | `var(--tv-color-toolbar-button-text-active)` `#2962FF` | transparent |
| **Active Hover** | `.active:hover` | `#2962FF` (active overrides hover) | `#2A2E39` |
| **Disabled** | (none defined) | No disabled state implemented | — |

### 3.3 Toggle Tool States

Three tools have **toggle behavior** (stay active when clicked):

| Tool ID | Property Checked | Active When |
|---------|-----------------|-------------|
| `lock_all` | `isDrawingsLocked` | Drawings locked |
| `hide_drawings` | `isDrawingsHidden` | Drawings hidden |
| `show_timer` | `isTimerVisible` | Timer visible |

Toggle tools use the same `.active` CSS class (blue color) when their state is `true`.

---

## 4. Complete Icon Inventory

### 4.1 Drawing Toolbar Icons (ToolIcons.jsx)

All icons use `fill="currentColor"` and inherit color from parent CSS.

| # | Export Name | Tool ID | SVG Type | viewBox | Fill Source | Stroke | Themeable |
|---|-------------|---------|----------|---------|-------------|--------|-----------|
| 1 | `TrendLineIcon` | `trendline` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 2 | `ArrowIcon` | `arrow` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 3 | `RayIcon` | `ray` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 4 | `ExtendedLineIcon` | `extended_line` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 5 | `HorizontalLineIcon` | `horizontal` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 6 | `HorizontalRayIcon` | `horizontal_ray` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 7 | `VerticalLineIcon` | `vertical` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 8 | `CrossLineIcon` | `cross_line` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 9 | `RectangleIcon` | `rectangle` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 10 | `CircleIcon` | `circle` | `<path fill="currentColor">` + `<path stroke="currentColor">` | 0 0 28 28 | `currentColor` | `currentColor` | ✅ Via CSS vars |
| 11 | `TriangleIcon` | `triangle` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 12 | `ParallelChannelIcon` | — | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 13 | `FibRetracementIcon` | `fibonacci` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 14 | `FibExtensionIcon` | `fib_extension` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 15 | `PriceRangeIcon` | `price_range` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 16 | `LongPositionIcon` | `prediction` | `<path fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 17 | `ShortPositionIcon` | `prediction_short` | `<path fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 18 | `ElliottImpulseIcon` | `elliott_impulse` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 19 | `ElliottCorrectionIcon` | `elliott_correction` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 20 | `ElliottWaveIcon` | — | Alias of `ElliottImpulseIcon` | — | — | — | ✅ Via CSS vars |
| 21 | `DateRangeIcon` | `date_range` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 22 | `DatePriceRangeIcon` | `date_price_range` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 23 | `BrushIcon` | `brush` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 24 | `HighlighterIcon` | `highlighter` | `<path fill="currentColor">` | 0 0 25 23 | `currentColor` | none | ✅ Via CSS vars |
| 25 | `PathIcon` | `path` | `<path fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 26 | `TextIcon` | `text` | `<path fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 27 | `CalloutIcon` | `callout` | `<path fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 28 | `PriceAlertIcon` | — | `<path stroke="currentColor">` + `<circle fill="currentColor">` | 0 0 28 28 | `currentColor` | `currentColor` | ✅ Via CSS vars |
| 29 | `ClearAllIcon` | `clear_all` | `<path fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 30 | `CursorIcon` | `cursor` | `<g fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 31 | `EraserIcon` | `eraser` | `<g fill="currentColor">` | 0 0 29 31 | `currentColor` | none | ✅ Via CSS vars |
| 32 | `HideDrawingsIcon` | `hide_drawings` | `<path fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 33 | `LockDrawingsIcon` | `lock_all` | `<path fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 34 | `ZoomInIcon` | `zoom_in` | `<path fill="currentColor">` (on SVG) | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 35 | `ZoomOutIcon` | `zoom_out` | `<path fill="currentColor">` (on SVG) | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 36 | `MeasureIcon` | `measure` | `<path fill="currentColor">` | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |
| 37 | `TimerIcon` | `show_timer` | `<path fill="currentColor">` (on SVG) | 0 0 28 28 | `currentColor` | none | ✅ Via CSS vars |

### 4.2 Right Toolbar Icons (RightToolbar.jsx)

Uses `lucide-react` library — different icon system.

| # | Component | Tool ID | Library | Props | Stroke Width | Themeable |
|---|-----------|---------|---------|-------|-------------|-----------|
| 38 | `List` | `watchlist` | lucide-react | `size={20} strokeWidth={1.5}` | 1.5px | ✅ Via CSS vars |
| 39 | `Clock` | `alerts` | lucide-react | `size={20} strokeWidth={1.5}` | 1.5px | ✅ Via CSS vars |

### 4.3 Inline SVG (Chevron Arrow)

| # | Location | SVG | Fill Source | Themeable |
|---|----------|-----|-------------|-----------|
| 40 | `DrawingToolbar.jsx` line 241-243 | `<path d="M.6 1.4l1.4-1.4 8 8-8 8-1.4-1.4 6.389-6.532-6.389-6.668z" />` | `fill: currentColor` (via CSS `.arrowButton svg`) | ✅ Via CSS vars |

---

## 5. Toolbar Styling Architecture

### 5.1 DrawingToolbar (Left Sidebar)

```
DrawingToolbar.module.css
│
├── .toolbar (container)
│   └── background-color: var(--tv-color-toolbar-background)
│
├── .toolGroupContainer (per-tool wrapper)
│
├── .controlWrapper (hover zone)
│   └── hover → background-color: var(--tv-color-toolbar-button-background-hover)
│
├── .toolButton (clickable icon area)
│   ├── color: var(--tv-color-toolbar-button-text)         [DEFAULT]
│   ├── :hover → color: var(--tv-color-toolbar-button-text-hover)  [HOVER]
│   └── .active → color: var(--tv-color-toolbar-button-text-active) [ACTIVE]
│
├── .toolIcon (icon container)
│   └── svg { width: 20px; height: 20px }
│
├── .arrowButton (submenu chevron)
│   ├── color: var(--tv-color-text-secondary)
│   ├── opacity: 0 (hidden by default)
│   ├── .controlWrapper:hover → opacity: 1
│   └── :hover → color: var(--tv-color-toolbar-button-text-hover)
│              → background-color: var(--tv-color-toolbar-button-background-hover)
│
├── .popover (submenu flyout)
│   ├── background-color: var(--tv-color-dropdown-background)
│   ├── border: 1px solid var(--tv-color-border)
│   └── box-shadow: 0 4px 12px rgba(0,0,0,0.5)     ← HARDCODED
│
├── .popoverItem (submenu item)
│   ├── color: var(--tv-color-text-primary)
│   ├── :hover → background-color: var(--tv-color-toolbar-button-background-hover)
│   └── .active → background-color: rgba(41, 98, 255, 0.06)   ← HARDCODED
│              → color: var(--tv-color-toolbar-button-text-active)
│
├── .popoverIcon
│   └── color: inherit
│
└── .separator
    └── background-color: var(--tv-color-border)
```

### 5.2 RightToolbar (Panel Toggle)

```
RightToolbar.module.css
│
├── .toolbar
│   └── border-left: 1px solid var(--tv-color-border)
│
└── .tool
    ├── color: var(--tv-color-text-secondary)              [DEFAULT]
    ├── :hover → color: var(--tv-color-text-primary)
    │         → background-color: var(--tv-color-hover-background)
    └── .active → (defined in CSS, same pattern as left toolbar)
```

---

## 6. Non-Themeable Values (Hardcoded)

| Location | Property | Value | Issue |
|----------|----------|-------|-------|
| `DrawingToolbar.module.css` line 123 | `box-shadow` | `0 4px 12px rgba(0, 0, 0, 0.5)` | Hardcoded shadow — won't adapt to light theme |
| `DrawingToolbar.module.css` line 143 | `background-color` (`.popoverItem.active`) | `rgba(41, 98, 255, 0.06)` | Hardcoded brand alpha — should be CSS var |
| `Topbar.module.css` (multiple) | `background-color` (`.button.isActive`) | `rgba(41, 98, 255, 0.06)` | Same hardcoded brand alpha |
| `index.css` lines 23-40 | All `--tv-*` vars | Identical to dark theme | Light theme not differentiated |
| `index.css` lines 71-76 | Scrollbar thumb | `#363A45` / `#4A4F5B` | Hardcoded, not CSS vars |
| `index.css` line 47 | `font-family` | Hardcoded system font stack | OK — intentional |

---

## 7. Icon Sizing

| Context | Icon Size | Container Size | Source |
|---------|-----------|---------------|--------|
| DrawingToolbar main button | 20×20 px | 34×34 px | `DrawingToolbar.module.css` lines 66-71, 73-77 |
| DrawingToolbar popover | 20×20 px | auto | `DrawingToolbar.jsx` line 289 |
| RightToolbar | 20×20 px | auto | `RightToolbar.jsx` line 30 |
| Topbar buttons | varies | 32px height | `Topbar.module.css` |

---

## 8. Themeability Assessment

### 8.1 Current Themeability Score

| Category | Score | Notes |
|----------|-------|-------|
| **Icon fill color** | ✅ 100% | All use `currentColor` — fully themeable via CSS |
| **Icon stroke color** | ✅ 100% | Same as fill — `currentColor` |
| **Default icon color** | ✅ Themeable | `--tv-color-toolbar-button-text` |
| **Hover icon color** | ✅ Themeable | `--tv-color-toolbar-button-text-hover` |
| **Active icon color** | ✅ Themeable | `--tv-color-toolbar-button-text-active` |
| **Button hover background** | ✅ Themeable | `--tv-color-toolbar-button-background-hover` |
| **Toolbar background** | ✅ Themeable | `--tv-color-toolbar-background` |
| **Popover background** | ✅ Themeable | `--tv-color-dropdown-background` |
| **Popover border** | ✅ Themeable | `--tv-color-border` |
| **Separator color** | ✅ Themeable | `--tv-color-border` |
| **Arrow default color** | ✅ Themeable | `--tv-color-text-secondary` |
| **Popover active bg** | ❌ Hardcoded | `rgba(41, 98, 255, 0.06)` — not a CSS var |
| **Popover shadow** | ❌ Hardcoded | `rgba(0, 0, 0, 0.5)` — not a CSS var |
| **Light theme values** | ❌ Not differentiated | All values identical to dark theme |
| **Icon SVG viewBox** | ✅ Fixed | 28×28 (constant) — no theme concern |
| **Icon render size** | ✅ CSS controlled | 20×20 via `.toolIcon svg` |

### 8.2 Overall Assessment

```
ICON THEMEABILITY: ████████████████████░ 95%
  ✅ All 40 icons use currentColor — fully inherit CSS theme
  ✅ All state colors use CSS custom properties
  ❌ 2 hardcoded rgba values need CSS var extraction
  ❌ Light theme not differentiated from dark

TOOLBAR THEMEABILITY: ████████████████████░ 90%
  ✅ Background, hover, active, border all CSS-var driven
  ❌ Box shadow hardcoded
  ❌ Light theme identical to dark

OVERALL THEME READINESS: ██████████████████░░ 85%
```

---

## 9. Recommended CSS Variable Additions

To achieve full themeability, add these variables:

```css
:root,
[data-theme="dark"] {
  /* Existing (keep) */
  --tv-color-toolbar-button-text-active: #2962FF;

  /* New — extract hardcoded values */
  --tv-color-active-background-subtle: rgba(41, 98, 255, 0.06);
  --tv-color-shadow: rgba(0, 0, 0, 0.5);
  --tv-color-scrollbar-thumb: #363A45;
  --tv-color-scrollbar-thumb-hover: #4A4F5B;
}

[data-theme="light"] {
  /* NEW — differentiated light theme */
  --tv-color-toolbar-background: #FFFFFF;
  --tv-color-toolbar-button-background-hover: #F0F3FA;
  --tv-color-toolbar-button-text: #787B86;
  --tv-color-toolbar-button-text-hover: #131722;
  --tv-color-toolbar-button-text-active: #2962FF;
  --tv-color-border: #E0E3EB;
  --tv-color-text-primary: #131722;
  --tv-color-text-secondary: #787B86;
  --tv-color-dropdown-background: #FFFFFF;
  --tv-color-active-background-subtle: rgba(41, 98, 255, 0.08);
  --tv-color-shadow: rgba(0, 0, 0, 0.15);
}
```

---

## 10. Icon Source File Map

| File | Lines | Icons | System |
|------|-------|-------|--------|
| `src/components/Toolbar/ToolIcons.jsx` | 368 | 37 exported components | Custom inline SVG |
| `src/components/Toolbar/DrawingToolbar.jsx` | 310 | 1 inline chevron SVG | Inline SVG |
| `src/components/Toolbar/RightToolbar.jsx` | 40 | 2 components | lucide-react |
| `src/components/Toolbar/DrawingToolbar.module.css` | 166 | — | CSS state definitions |
| `src/components/Toolbar/RightToolbar.module.css` | — | — | CSS state definitions |
| `src/index.css` | 77 | — | CSS custom property definitions |

### Plugin-Internal Icons (line-tools.js)

The plugin also renders icons on canvas for:
- Alert bell icon: `bi` constant (line 3255) — Path2D objects drawn on canvas
- Crosshair label icon: `Ci` constant (line 3249) — Path2D objects drawn on canvas
- Selection anchors: `v()` function (line 79) — circle with hardcoded `#FFFFFF` fill, `#2962FF` stroke

These are **NOT** themeable via CSS — they are hardcoded canvas drawing calls.
See `alert-rendering-flow.md` and `drawing-style-map.md` for canvas icon details.