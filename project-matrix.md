# Project Architecture & Scope Matrix

> Project: **WB MP-Charts** (MP Charts Toolkit) — `libs/MP-charts-toolkit`
> Stack: React 19 + Vite 7 + lightweight-charts v5 (TypeScript packages under `packages/`)
> Purpose of this file: strict boundaries for AI agents. Any edit outside the declared
> scope of a task is a violation.

---

## 1. AI Guardrails & Strict Rules

### 1.1 Hard Prohibitions (no exceptions without explicit user consent)

1. **No out-of-scope edits.** Only files named in the current task may be modified.
   "While I'm here" edits, drive-by cleanups, and formatting of untouched files are forbidden.
2. **No public API changes.** Public method signatures, props contracts
   (`ChartComponentProps`, `ChartImperativeHandle`), and package entry points
   (`packages/*/src/index.ts`) must not be renamed, removed, or have their parameter
   types changed without explicit user approval.
3. **No dependency changes.** Adding/upgrading/removing packages in any `package.json`
   requires explicit user approval. Never install `lightweight-charts-line-tools`
   via npm — it is vendored in `src/plugins/line-tools/` (fancy-canvas conflict risk).
4. **No vendored plugin edits.** `src/plugins/line-tools/*` is a committed third-party
   build. Treat as read-only binary.
5. **No flag flipping.** `FEATURE_FLAGS.USE_CORE_LINE_TOOLS` stays `false` until the
   line-tools-core adapter + tool packages are explicitly validated and approved.
6. **No new top-level directories** in `src/` without an architecture decision logged
   in `memory-bank/decisionLog.md`.
7. **No cross-layer imports.** UI components must not import from `src/plugins/`
   internals; plugins must not import React components. Communication only via
   `PluginRegistry` hooks/API or the documented imperative handle.
8. **No placeholder code.** No `TODO`, `// ... existing code ...`, or partial blocks
   in production files.
9. **File size limit.** Do not push a file past 300 lines; extract before continuing.
10. **No silent architecture changes.** If a task requires an architecture change →
    STOP, escalate, update the spec, resume only after approval.

### 1.2 Mandatory Behavior

- Read this matrix + `docs/architecture/current-state.md` before any edit in this repo.
- Diff-first debugging: inspect recent changes before touching any file.
- Keep diffs minimal, isolated, and reviewable.
- Preserve existing behavior unless the task explicitly changes it.

---

## 2. Directory & Scope Map

| Directory / Module | Responsible Scope | Allowed Actions | Restricted Dependencies / Imports |
|---|---|---|---|
| `src/main.jsx`, `src/App.jsx` | Entry point; app shell; global state (charts, alerts, watchlist, theme, intervals) | Edit only for state wiring / handler changes explicitly in task scope | May import `src/components/*`, `src/services/binance`, `html2canvas`. Must NOT import `src/plugins/*` internals |
| `src/components/Chart/` | Chart engine: `ChartComponent`, `ChartCore`, `ChartGrid`, hooks (`useChart*`), `builders/` | Edit for chart behavior tasks; hooks are the approved decomposition target | May import `src/plugins/line-tools` (public entry), `@mp/line-tools-core` (only behind `USE_CORE_LINE_TOOLS`), `src/utils/*`. Must NOT import other UI components |
| `src/components/Toolbar/`, `Topbar/`, `BottomBar/`, `Layout/` | Workstation chrome (drawing tools, symbol/interval pickers, panels) | Edit for UI tasks in scope | May import `src/utils/*`, `lucide-react`. Must NOT import `src/plugins/*` or `src/services/*` directly |
| `src/components/Alert/`, `Alerts/`, `Replay/`, `SymbolSearch/`, `Toast/`, `Watchlist/`, `Editor/`, `ErrorBoundary/` | Feature UI modules | Edit only the module named in the task | Feature modules may import `src/utils/*` and `src/services/binance` (SymbolSearch/Watchlist). No cross-feature imports except via props |
| `src/plugins/core/PluginRegistry.js` | Plugin registry, hooks, cross-plugin API | Read-only unless task explicitly targets the plugin system | No external deps |
| `src/plugins/line-tools/` | **Vendored** `lightweight-charts-line-tools` build (default drawing engine) | **READ-ONLY.** No edits, no reformat, no re-bundle | — |
| `src/plugins/line-tools-core-adapter/`, `line-tools-adapter/`, `adapter/DrawingSerializer.js` | Bridge shell ↔ `@mp/line-tools-core` (Phase 2, inactive) | Edit only when working on core-engine integration | May import `@mp/line-tools-core`, `src/plugins/core`. Must stay behind `USE_CORE_LINE_TOOLS` |
| `src/plugins/config-plugin/`, `connection-plugin/`, `theme-plugin/`, `ui-plugin/` | Config management, data-provider manager, theme engine, UI plugin | Edit only the plugin named in the task | May import `src/plugins/core`, `src/services/binance` (connection-plugin only) |
| `src/services/binance.js` | Binance REST + WebSocket data provider (klines, tickers, reconnect logic) | Edit for data-layer tasks in scope | No project-internal imports (self-contained). Public exports: `getKlines`, `getTickerPrice`, `subscribeToTicker`, `subscribeToMultiTicker` |
| `src/utils/` (`chartUtils`, `coordinateHelpers`, `timeframes`, `TemplateManager`, `indicators/`) | Pure helpers + indicator math (SMA/EMA) | Edit for utility tasks in scope; add new indicators only via `indicators/index.js` registry | Pure JS; no React, no `src/components/*`, no `src/plugins/*` |
| `src/config/flags.js` | Global feature flags | **READ-ONLY** (flag changes require explicit user approval) | — |
| `packages/line-tools-core/` | Core drawing-engine framework (TS): api, controller, events, interaction, model, rendering, types, views, utils | Edit only when task targets the core engine; public surface = `src/index.ts` + `src/api/public-api.ts` | peerDep: `lightweight-charts ^5`. Must NOT import shell code (`src/`) |
| `packages/line-tools-lines/`, `packages/line-tools-rectangle/` | Concrete line-tool implementations on top of core | Edit only the package named in the task; one tool = one file (`model/` + `views/`) | peerDep: `@mp/line-tools-core`, `lightweight-charts`. Must NOT import other tool packages or shell code |
| `packages/*/dist/`, `packages/*/node_modules/` | Build output / vendored deps | **READ-ONLY.** Regenerate only via `npm run build` (tsup) inside the package | — |
| `docs/` | Architecture docs, plans, refactoring reports | Edit docs when task is documentation; keep in sync with code reality | — |
| `public/`, `index.html`, `chart.png` | Static assets, HTML shell | **READ-ONLY** unless task explicitly targets them | — |
| `generate-ai-guide.js` | AI-guide generator script | **READ-ONLY** | — |

### Layering Rules (enforced)

```
UI (components)  →  Shell state (App.jsx)  →  Chart engine (components/Chart)
        ↓                                        ↓
   utils / services                    plugin layer (plugins/*)
                                              ↓
                              @mp/line-tools-core / vendored line-tools
```

- Data flows down via props/refs; events flow up via callbacks.
- `src/services/binance.js` is the ONLY module allowed to touch Binance endpoints.

---

## 3. Strict Read-Only & Protected Zones

| Path | Reason |
|---|---|
| `package.json`, `package-lock.json` (root and all `packages/*`) | Dependency & lock integrity |
| `vite.config.js` | Build graph + `@mp/*` aliases; alias changes break package resolution |
| `eslint.config.js` | Lint policy |
| `index.html` | Vite HTML entry |
| `src/config/flags.js` | Production behavior switch (`USE_CORE_LINE_TOOLS`) |
| `src/plugins/line-tools/*` (5 files) | Vendored third-party build |
| `packages/*/dist/`, `packages/*/node_modules/` | Generated artifacts |
| `packages/*/tsconfig.json`, `packages/*/tsup.config.ts` | Build configuration |
| `generate-ai-guide.js` | Tooling script |
| `chart.png`, `public/` | Static assets |
| `docs/architecture/*` (factual reports) | Reference documentation — update only via docs task |
| `memory-bank/*` (workspace root) | Agent memory; append-only, never rewrite history |

> Note: this repository has **no CI/CD pipeline** (no `.github/`), no secrets, and no
> environment files. If any are introduced later, they must be added to this list.

---

## 4. Database & Migration Policies

**This project is frontend-only: there is no server database, no ORM, and no migration
files.** The policy section is adapted to the real persistence layer:

### 4.1 Persistence = `localStorage` (keys are a de-facto schema)

| Key | Owner | Notes |
|---|---|---|
| `tv_saved_layout` | `App.jsx` | Layout + per-chart config |
| `tv_interval`, `tv_theme` | `App.jsx` | UI state |
| `tv_watchlist` | `App.jsx` | Symbol list |
| `tv_alerts`, `tv_alert_logs` | `App.jsx` | 24h retention enforced in code (`ALERT_RETENTION_MS`) |
| `tv_fav_intervals_v2`, `tv_custom_intervals`, `tv_last_nonfav_interval` | `App.jsx` | Interval management |

### 4.2 Policies (mirror of DB rules, applied to state)

- **Existing state is READ-ONLY history.** Never change the meaning of an existing
  `tv_*` key or silently drop stored user data. Schema evolution = new key + migration
  logic in the owning component (analog of "always generate a new migration").
- **Schema & Model Sync.** Any change to a persisted shape must keep read/write
  synchronization in the single owning module; add defensive parsing
  (`safeParseJSON`-style) for new fields.
- **Destructive Guardrails.** Clearing/removing persisted user data
  (analog of `DROP`/`DELETE`/`TRUNCATE`) is strictly prohibited without explicit user approval.
- **No Direct Bypass.** All persistence must go through the owning state module
  (`App.jsx` for shell state, plugin-local storage for plugin state). Components must
  not write `localStorage` keys owned by another module.

---

## 5. Isolation & Radius Control Protocol

### 5.1 Pre-Edit Checklist (mandatory, every edit)

1. ☐ Is every file I plan to touch named in the current task?
2. ☐ Does the change stay inside ONE directory row of the Scope Map (Section 2)?
3. ☐ Am I preserving all public signatures / props / exports of touched files?
4. ☐ Am I touching a Read-Only zone (Section 3)? → **STOP, request approval.**
5. ☐ Does the change cross a layer boundary (Section 2 layering rules)? → **STOP, escalate.**
6. ☐ Will any file exceed 300 lines after my edit? → Extract first, then edit.
7. ☐ Have I checked recent git diff of the touched module (diff-first rule)?
8. ☐ Is the total number of files to modify ≤ **3**?

### 5.2 Hard Radius Limit

- **Maximum simultaneously modified files per task: 3.**
- If the task requires more than 3 files:
  1. **PAUSE** before writing anything.
  2. List every file with a one-line justification.
  3. Request explicit user approval.
  4. Resume only after approval; split into sequential sub-tasks if possible.

### 5.3 Escalation Trigger List (auto-STOP)

- Any change to `src/config/flags.js`, `vite.config.js`, or any `package.json`.
- Any import of `@mp/line-tools-core` outside the adapter layer.
- Any new top-level directory or new npm dependency.
- Any change to `ChartImperativeHandle` or `ChartComponentProps` contract.
- Any deletion of persisted user data paths.

---

## Version

- Matrix generated: from live codebase scan (React 19 / Vite 7 / line-tools-core 2.0.0-alpha.0).
- Supersedes: previous empty `project-matrix.md`.