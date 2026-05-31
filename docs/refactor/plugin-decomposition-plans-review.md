# Plugin Decomposition Plans Review & Synthesis

> **Date**: 2026-05-30  
> **Context**: Comparison of `plugin-decomposition-plan.md` (Code-focused) vs `plugin-decomposition-plan-updated.md` (Architecture-focused).  
> **Goal**: Create a unified, safe, and actionable master plan.

---

## 1. Comparative Analysis

| Aspect | Plan A (`plugin-decomposition-plan.md`) | Plan B (`plugin-decomposition-plan-updated.md`) |
| :--- | :--- | :--- |
| **Scope** | Low-level: Decomposition of `line-tools.js` (6,495 lines). | High-level: Application architecture & Plugin System. |
| **Approach** | Direct extraction of classes/functions from the minified bundle. | Adapter pattern + Gradual migration via Feature Flags. |
| **Key Strengths** | - Detailed folder structure (`alerts/`, `tools/`).<br>- Precise line-by-line mapping.<br>- Clear P0-P7 dependency graph for code organization. | - Identifies critical risk of editing minified code.<br>- Prioritizes UX (DrawingSerializer).<br>- Respects existing work (`AlertAdapter.js`). |
| **Critical Gaps** | ❌ Ignores `line-tools.js` is a minified bundle (unstable refactoring target).<br>❌ Misses `DrawingSerializer` (#1 User Pain Point).<br>❌ No PluginRegistry lifecycle management. | ❌ Lacks specific implementation details for the extracted code.<br>❌ Doesn't explicitly map the folder structure. |

---

## 2. Synthesized General Plan: "Adapters + Gradual Migration"

**Philosophy**: Do not refactor `line-tools.js` directly. Instead, build a **PluginRegistry** and an **Adapter Layer** that wraps the bundle, then gradually replace internal subsystems with modular implementations behind feature flags.

### Phase 0: Foundation & Safety (2-3 Days)
*Goal: Create infrastructure without touching existing logic.*
1.  **Create `PluginRegistry`**: Manages lifecycle (`init`, `destroy`) for all plugin parts.
2.  **Integrate `AlertAdapter.js`**: Already exists and works; register it in the new Registry.
3.  **Create Adapters**:
    *   `ToolAdapter`: Wrapper over `LineToolManager`.
    *   `TimerAdapter`: Wrapper over `PriceScaleTimer`.

### Phase 1: Critical UX - Serialization (2-3 Days)
*Goal: Solve "Lost Drawings on Reload" (#1 Issue).*
1.  **Implement `DrawingSerializer`**: Export/Import via `ToolAdapter` (not direct private access).
2.  **Add `AutoSaveManager`**: Debounced save to localStorage + restore on load.

### Phase 2: Theming Engine (3-4 Days)
*Goal: Replace hardcoded colors with runtime theming.*
1.  **Create `ThemeEngine`**: Applies CSS variables and canvas styles dynamically.
2.  **Integrate with React**: Bridge `theme` prop to Canvas renderers.

### Phase 3: Modular Decomposition (8-12 Weeks)
*Goal: Replace bundle internals using Plan A's folder structure but safely.*
*Structure*: `src/plugins/line-tools-modular/` (`alerts/`, `tools/`, `renderers/`, etc.)
*Mechanism*: **Feature Flags** to toggle between `BundledLineToolsPlugin` (Legacy) and `ModularLineToolsPlugin`.

| Priority | Subsystem | Risk | Strategy |
| :--- | :--- | :--- | :--- |
| **P0** | Types, Geometry, Events | Low | Pure utility extraction. |
| **P1** | Templates, Dialogs | Medium | Self-contained UI components. |
| **P2** | Renderers, Primitives | High | Visual regression testing required per component. |
| **P3** | Tools (40+) | High | Migrate in groups (Trend Lines → Fib → Shapes). |
| **P4** | Alerts | Medium | Use `AlertAdapter` as the bridge. |

### Phase 4: Upstream Strategy (Parallel)
1.  Contact upstream author (`difurious`) for TypeScript sources.
2.  If unavailable, reverse-engineer critical parts via source maps.
3.  Eventually replace the bundled wrapper with a direct fork dependency.

---

## 3. Critical Decisions Required

1.  **Upstream Source**: Do we have access to TS sources for `lightweight-charts-line-tools`? (If yes, Phase 3 changes from "Reverse Engineering" to "Direct Refactoring").
2.  **Navigation Component**: Should we keep the extracted `navigation/` subsystem or delete it in favor of existing Shell components (`BottomBar`, `DrawingToolbar`)?
3.  **Priority**: Confirm if `DrawingSerializer` (Phase 1) takes precedence over `ThemeEngine` (Phase 2).

---

## 4. Next Steps

*   [ ] Approve Synthesized Plan.
*   [ ] Create Phase 0 folder structure (`PluginRegistry`, `Adapters`).
*   [ ] Implement `DrawingSerializer`.  