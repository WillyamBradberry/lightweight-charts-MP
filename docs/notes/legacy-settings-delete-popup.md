# Legacy settings/delete popup — behavior + manager APIs

> Source: `src/plugins/line-tools/line-tools.js` (legacy `LineToolManager`, 6462 lines) and `line-tools.d.ts`.
> Purpose: reference for porting the old settings popup UI/behavior to the CORE path. **No implementation yet.**

## What it is
On the legacy path a **floating toolbar** (`tv-floating-toolbar`) is rendered when a drawing is selected. Selecting a tool calls `_selectTool(t)` which shows the toolbar expanded for that tool (`this._toolbar?.showExpanded(t)`). Its buttons open small dropdowns (color grid, custom color picker, opacity slider, line width, font size, templates). Text tools additionally get an **inline text editor** via double-click, and line-tool **alerts** open the generic `_editDialog` modal.

## How it is opened

| Trigger | Flow | Bundle ref |
|---|---|---|
| **Selection** (primary) | click an existing drawing in cursor mode (hit-test) OR after finishing a draw → `_selectTool(tool)` → `_toolbar?.showExpanded(tool)` | `_clickHandler` → `_handleToolSelection` (5643), `_mouseUpHandler` → `_selectTool` (6187), `_selectTool` (5566) |
| **Dbl-click** | double-click on a `Text`/`Callout` tool (two hits within 300ms) → inline `_showTextInputDialog`, **not** the toolbar | `_mouseDownHandler` (6162-6178) |
| **Remove button** | toolbar trash button → `manager.deleteTool(this._activeTool)` | `_renderExpanded` delete button (2874-2877) |
| **Delete / Backspace key** | selected tool + `Delete`/`Backspace` → `deleteTool(this._selectedTool)` | `_keyDownHandler` (5738) |
| **Eraser** | eraser click on a drawing → `deleteTool(_)` | `_clickHandler` (5747-5758) |
| **Escape** | deselect → `_toolbar?.hide()` | `_keyDownHandler` (5738), `_deselectCurrentTool` (5572) |

## Actions & the manager APIs they call

| Action | UI element | Manager / tool API called |
|---|---|---|
| **Delete / Remove** | trash button | `manager.deleteTool(activeTool, skipHistory=false)` → detach primitive, remove linked alert, record history (`recordDelete`), hide toolbar |
| **Lock** | lock button | `manager.toggleToolLock(selected)` |
| **Add Alert** | alert button (only when `manager.toolSupportsAlerts(selected)`) | `manager.createAlertForTool(selected)` → `_editDialog.show(...)` → `addToolAlert` / `setAlertId` |
| **Line Color** | brush dropdown (color grid + custom `<input type=color>`) | `tool.applyOptions({lineColor/borderColor/color})` + `manager.updateToolOptions(type, patch)` |
| **Fill Color** | fill dropdown (only if tool has `backgroundColor`) | `tool.applyOptions({backgroundColor})` + `manager.updateToolOptions(type, patch)` |
| **Text Color** | text dropdown (only text/callout tools) | `tool.applyOptions({textColor})` + `manager.updateToolOptions(type, patch)` |
| **Opacity** | slider inside each color dropdown | `tool.applyOptions` (rgba) + `manager.updateToolOptions(type, patch)` |
| **Line Width** | width dropdown (1,2,3,4) when tool has `lineWidth`/`width` | `tool.applyOptions({lineWidth|width})` + `manager.updateToolOptions(type, patch)` |
| **Font Size** | font dropdown (text tools) | `tool.applyOptions({fontSize})` + `manager.updateToolOptions(type, patch)` |
| **Templates** | template dropdown (save/apply/load/delete) | Template manager: `extractStyles`, `saveTemplate(name, style)`, `applyTemplate(id, tool)`, `loadTemplates()`, `deleteTemplate(id)` |
| **Reposition popup** | drag handle | `manager.getChartRect()` (also used to position popup) |

## Internal wiring used by the popup

- Toolbar is a component owned by the manager (`this._toolbar`); methods `showExpanded(t)`, `showCollapsed(t)`, `hide()`, `destroy()`.
- Every styling change (`_applyColor`/`_applyWidth`/`_applyFontSize`/`_applyOpacity`) applies on the tool via **`tool.applyOptions(patch)`** and then persists the default via **`manager.updateToolOptions(toolType, patch)`**.
- Selection state uses `tool.setSelected(bool)`; text editing uses `tool.setOnTextEdit(fn)`.
- Deletion honors `_locked` guard (`_startDrag` checks `_selectedTool._locked`) and also records history (`recordDelete`).

## Note
Not terminal-verified (UI/canvas). Source-of-truth is the bundle; method names above are literal from `line-tools.js` (deleteTool, toggleToolLock, createAlertForTool, updateToolOptions, toolSupportsAlerts, getChartRect). The equivalent CORE-path popup does not exist yet — this doc is the behavior spec to replicate.