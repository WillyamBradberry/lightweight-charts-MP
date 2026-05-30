# Interaction State Map — MP Charts Toolkit

**Scope:** All interactive UI states across the workstation shell.
**Purpose:** Audit visual feedback, themeability, and implementation consistency for refactoring.
**Date:** 2023-10-27

---

## 1. Matrix: State × Component × Theme Support

| Component | State Type | Implementation Location | Visual Properties (Color/Bg/Border) | Themeability | Issues / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Topbar** | Hover | `src/components/Topbar/Topbar.jsx` + CSS | Background: `var(--mp-bg-hover)` <br> Text: `var(--mp-text-primary)` | 🟢 Good (CSS Vars) | Dropdown positioning logic is duplicated 5 times in JS. |
| **Topbar** | Active | `src/components/Topbar/Topbar.jsx` | Background: `var(--mp-bg-active)` <br> Border: `1px solid var(--mp-border-color)` | 🟡 Partial (Border hardcoded) | Selected timeframe background color is sometimes hardcoded in JS state. |
| **Topbar** | Focus | CSS `:focus-visible` | Outline: `2px solid var(--mp-accent)` | 🟢 Good | Only native inputs have focus styles. Custom buttons lack it. |
| **Toolbar** | Hover | `src/components/Toolbar/DrawingToolbar.jsx` | Background: `var(--mp-bg-hover)` <br> Icon: `var(--mp-icon-active)` | 🟡 Partial (Icons hardcoded) | SVG icons use inline colors in some groups instead of CSS `fill`. |
| **Toolbar** | Selected | `src/components/Toolbar/DrawingToolbar.jsx` | Background: `var(--mp-bg-selected)` <br> Border: `1px solid var(--mp-accent)` | 🟢 Good | Consistent across all tool groups. |
| **Watchlist**| Dragging | `src/components/Watchlist/Watchlist.jsx` (JS) | Shadow: Hardcoded `rgba(0, 0, 0, 0.2)` <br> Bg: `var(--mp-bg-hover)` | 🔴 Bad (Hardcoded shadow) | Drag ghost element uses JS inline styles; shadows don't adapt to dark/light mode. |
| **Watchlist**| Row Hover | `src/components/Watchlist/Watchlist.jsx` | Background: `var(--mp-bg-hover)` <br> Text: `var(--mp-text-primary)` | 🟢 Good | Price change colors (green/red) are hardcoded hex values. |
| **Replay** | Slider Track | `src/components/Chart/ReplayControls.jsx` | Track: Hardcoded `#e0e0e0` <br> Fill: `var(--mp-accent)` | 🔴 Bad (Track color) | The "unplayed" portion of the slider is hardcoded grey. Should be theme-aware. |
| **Replay** | Slider Thumb | CSS + JS State | Background: `#fff` <br> Border: `2px solid var(--mp-accent)` | 🟡 Partial (Thumb color) | Thumb shadow is hardcoded. |
| **Alerts** | Triggered | `src/components/Chart/ChartComponent.jsx` (Plugin) | Marker Color: Hardcoded Green/Red | 🔴 Bad (Hardcoded colors) | Alert markers on chart are drawn by the plugin; hard to theme without fork. |
| **Dialogs** | Disabled Btn | `src/components/AlertDialog/AlertDialog.jsx` | Opacity: `0.5` via JS inline style | 🟡 Partial (Opacity only) | Missing visual "disabled" state (greyed out border/bg). Only opacity changes. |

---

## 2. Detailed State Analysis by Category

### A. Hover States
*   **Scope:** Buttons, Menu Items, Watchlist Rows, Drawing Tools.
*   **Implementation:** Mostly CSS `:hover` pseudo-classes.
*   **Themeability:** 
    *   Backgrounds use `var(--mp-bg-hover)` — ✅ Good.
    *   Text colors generally inherit `--mp-text-primary`.
*   **Issues:**