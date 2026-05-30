# Theme Editor

## Status

Draft

## Purpose

Introduce a centralized theme system for MP Charts Toolkit.

The goal is to eliminate hardcoded visual values scattered across React components, plugin styles, drawing tools, alert renderers, and chart configuration.

All visual customization should eventually be driven by theme definitions rather than direct color or style constants.

---

# Problem Statement

Current styling is distributed across multiple layers:

* React CSS Modules
* Plugin CSS (`line-tools.css`)
* Injected CSS inside plugin runtime
* Canvas renderers for drawing tools
* Canvas renderers for alerts
* Lightweight Charts theme options

This makes visual customization difficult and increases maintenance cost.

Examples:

* hardcoded colors
* hardcoded line widths
* hardcoded dash patterns
* duplicated visual constants

---

# Goals

## G1. Centralized Theme Configuration

Provide a single source of truth for visual styling.

Example:

```json
{
  "alerts": {},
  "tools": {},
  "toolbar": {},
  "dialogs": {},
  "chart": {}
}
```

---

## G2. Runtime Theme Switching

Allow switching between themes without code changes.

Examples:

* Dark
* Light
* TradingView-like
* Binance-like
* Custom

---

## G3. Consistent Visual Language

Ensure all UI layers use the same theme source.

Applies to:

* React UI
* Plugin UI
* Canvas-based drawing tools
* Canvas-based alerts
* Chart styling

---

## G4. Future User Customization

Prepare infrastructure for a future visual Theme Editor.

This specification does NOT require a GUI editor.

---

# Non-Goals

The following are explicitly out of scope for Version 1:

* visual theme editor UI
* theme marketplace
* cloud theme synchronization
* per-user theme storage
* import/export UI

---

# Theme Areas

## Chart

Controls:

* chart background
* grid colors
* text colors
* crosshair colors
* watermark colors

---

## Drawing Tools

Controls:

* line color
* line width
* line style
* selection colors
* fill colors
* text colors

Supported tools:

* Trend Line
* Horizontal Line
* Ray
* Rectangle
* Fib Retracement
* Fib Extension
* Future drawing tools

---

## Alerts

Controls:

* alert line color
* alert line width
* dash pattern
* hover label styling
* notification styling

---

## Toolbar

Controls:

* background
* icon colors
* hover state
* active state
* separators

---

## Dialogs

Controls:

* background
* borders
* typography
* buttons
* overlays

---

## Watchlist & Panels

Controls:

* table colors
* row selection
* sorting indicators
* panel backgrounds

---

# Proposed Theme Structure

```json
{
  "name": "Dark",

  "chart": {},

  "alerts": {},

  "tools": {},

  "toolbar": {},

  "dialogs": {},

  "panels": {}
}
```

---

# Theme Resolution Order

Priority:

Theme Value
→ Component Default
→ Hardcoded Fallback

No new visual feature should introduce additional hardcoded colors if a theme value exists.

---

# Migration Strategy

Phase 1

* Document all visual customization points
* Create style maps
* Identify hardcoded constants

Phase 2

* Extract shared visual constants
* Introduce Theme object

Phase 3

* Route drawing tools through theme values

Phase 4

* Route alert renderer through theme values

Phase 5

* Route React UI through theme values

Phase 6

* Add runtime theme switching

---

# Success Criteria

A complete visual redesign of MP Charts Toolkit can be achieved by editing theme definitions without modifying renderer logic or component source code.
