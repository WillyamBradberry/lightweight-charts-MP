# Compatibility Analysis — Dependency Chain

## Overview

This document analyzes the compatibility between three components in the MP Charts Toolkit dependency chain:

1. **MP-charts-toolkit** — the host application (subsystem)
2. **lightweight-charts v5.0.9** — chart rendering library
3. **lightweight-charts-line-tools v4.1.1** — drawing tools plugin (npm package by `difurious`)

---

## 1. Dependency Graph

```
MP-charts-toolkit (openalgo-chart@0.0.0)
  │
  ├── lightweight-charts@5.0.9
  │     └── fancy-canvas@2.1.0
  │
  └── src/plugins/line-tools/  ← pre-compiled bundle
        │
        ├── line-tools.js  (minified, 6495 lines)
        ├── line-tools.umd.cjs
        ├── line-tools.css
        └── line-tools.d.ts  (4464 lines)
              │
              └── import { CanvasRenderingTarget2D } from 'fancy-canvas'
```

---

## 2. Plugin Origin Verification

The line-tools bundle in the repository corresponds to:

```
npm: lightweight-charts-line-tools@4.1.1
repo: https://github.com/difurious/lightweight-charts-line-tools
publisher: baotm (trantuan1320.2000@gmail.com)
published: ~1 year ago (mid 2025)
```

### Bundle Identification

| Artifact | Repo Bundle | npm Package |
|---|---|---|
| main export | `line-tools.js` | `dist/line-tools.js` |
| UMD bundle | `line-tools.umd.cjs` | `dist/line-tools.umd.cjs` |
| Types | `line-tools.d.ts` | `dist/line-tools.d.ts` |
| CSS | `line-tools.css` | `dist/line-tools.css` |
| Size | ~275 KB (minified) | 2.4 MB (unpacked, includes sourcemap) |

**Conclusion:** The bundled plugin is the `lightweight-charts-line-tools@4.1.1` package, vendored directly without npm dependency tracking.

---

## 3. Version Compatibility Matrix

### Direct Dependencies

| Package | Version | Depends On | Version |
|---|---|---|---|
| lightweight-charts | 5.0.9 | fancy-canvas | 2.1.0 |
| lightweight-charts-line-tools | 4.1.1 | fancy-canvas | 0.2.2 |

### fancy-canvas Version Mismatch

```
lightweight-charts v5.0.9  ──► fancy-canvas@2.1.0
lightweight-charts-line-tools v4.1.1  ──► fancy-canvas@0.2.2
```

**This is a critical version mismatch.** `fancy-canvas` is the canvas rendering abstraction layer used by lightweight-charts primitives. The two versions differ by a major version (0.x vs 2.x), indicating significant API changes.

### What fancy-canvas Provides

- `CanvasRenderingTarget2D` — used by the plugin's TypeScript declarations
- `Size` and `BitmapSize` types — coordinate/bounds abstractions
- Canvas binding utilities

The `.d.ts` file imports `CanvasRenderingTarget2D` from `fancy-canvas` (line 3 of the type declarations). If the interface changed between 0.2.2 and 2.1.0, the plugin's type definitions may not match the runtime environment.

---

## 4. lightweight-charts Version Compatibility

### What LC v5.0.9 Provides (Used by Plugin)

| API | Used by Plugin | Stability |
|---|---|---|
| `series.attachPrimitive()` | ✅ Critical — line-tools attachment | Stable since LC v4.x |
| `ISeriesPrimitive` interface | ✅ Critical — plugin base class | Stable since LC v4.x |
| `IPanePrimitive` interface | ✅ Used internally | Stable since LC v4.x |
| `IChartApi` | ✅ Used internally | Stable |
| `ISeriesApi` | ✅ Used internally | Stable |
| `CrosshairMode` | ❌ Re-declared in .d.ts | Not consumed from host |
| `LineStyle`, `LineType`, etc. | ❌ Re-declared in .d.ts | Not consumed from host |

### What LC v5.0.9 Provides (Used by Host ChartComponent)

| Import | Source | Risk |
|---|---|---|
| `createChart` | direct from `lightweight-charts` | ✅ Safe — stable API since LC v3.x |
| `CandlestickSeries` | direct from `lightweight-charts` | ✅ Safe — series definition API added in LC v5 |
| `BarSeries` | direct from `lightweight-charts` | ✅ Safe |
| `LineSeries` | direct from `lightweight-charts` | ✅ Safe |
| `AreaSeries` | direct from `lightweight-charts` | ✅ Safe |
| `BaselineSeries` | direct from `lightweight-charts` | ✅ Safe |

**Note:** The host imports named series *definitions* (`CandlestickSeries`, `BarSeries`, etc.) which is a **LC v5 API change**. In LC v4, series were created via `chart.addCandlestickSeries()`. In LC v5, the pattern is:

```javascript
// LC v4 (legacy)
chart.addCandlestickSeries(options)

// LC v5 (current)
import { CandlestickSeries } from 'lightweight-charts'
chart.addSeries(CandlestickSeries, options)
```

This is the **Series Definition API** introduced in LC v5.x.

### Potential Plugin/LC v5 API Conflict

The `.d.ts` file (4464 lines) includes **complete re-declarations** of lightweight-charts types (`IChartApi`, `ISeriesApi`, `CrosshairMode`, `LineStyle`, etc.) rather than importing them from the lightweight-charts package. This means:

```typescript
// In line-tools.d.ts — re-declares everything:
declare enum CrosshairMode { ... }  // independent copy
declare enum LineStyle { ... }      // independent copy
export interface IChartApi { ... }  // independent copy

// NOT:
import { IChartApi, CrosshairMode } from 'lightweight-charts'
```

**Risk:** If the plugin was compiled against LC v4 (which used `chart.addCandlestickSeries()` pattern) and the host uses LC v5 (which uses `chart.addSeries(CandlestickSeries)` pattern), the plugin may:

1. ✅ Work correctly at runtime (both APIs still available)
2. ❌ Have incorrect TypeScript types if type-checked
3. ⚠️ Fail silently if internal plugin code tries to use LC v4 APIs removed in LC v5

---

## 5. Runtime Compatibility Analysis

### Verified Working Interactions

| Interaction | Location | Status |
|---|---|---|
| `new LineToolManager()` | ChartComponent:765 | ✅ Works — constructor call |
| `series.attachPrimitive(manager)` | ChartComponent:781 | ✅ Works — LC v5 API |
| `manager.startTool(toolName)` | ChartComponent:395 | ✅ Works — plugin internal |
| `manager.undo()` / `manager.redo()` | imperativeHandle | ✅ Works — plugin internal |
| `manager.clearTools()` | imperativeHandle | ✅ Works |
| `manager.lockAllDrawings()` | useEffect | ✅ Works |
| `manager.hideAllDrawings()` | useEffect | ✅ Works |
| `manager.areDrawingsLocked()` | useEffect guard | ✅ Works |
| `manager.setDefaultRange({ from, to })` | applyDefaultCandlePosition | ✅ Works |
| `manager._userPriceAlerts.setSymbolName()` | addPriceAlert | ✅ Works (private API) |
| `manager._userPriceAlerts.addAlertWithCondition()` | addPriceAlert | ✅ Works |
| `new PriceScaleTimer({...})` | ChartComponent:841 | ✅ Works |
| `timer.applyOptions()` | loadData | ✅ Works |
| `timer.setVisible()` | useEffect(isTimerVisible) | ✅ Works |
| `series.removeSeries()` | cleanup | ✅ Works |
| `chart.remove()` | cleanup | ✅ Works |

### Potentially Fragile Interactions

| Interaction | Risk | Reason |
|---|---|---|
| `chart.addSeries(CandlestickSeries, options)` | Low | LC v5 API — if plugin calls `addCandlestickSeries()` internally, still works |
| `fancy-canvas` runtime access | Medium | Two versions installed? Only LC v5's 2.1.0 resolved via npm |
| `CanvasRenderingTarget2D` usage in plugin | Medium | Plugin compiled against v0.2.2, runtime provides v2.1.0 — interface drift risk |
| Window globals: `window.lineToolManager` | Low | Self-inflicted, not a library issue |
| Plugin's internal typing vs runtime | Low | JS bundle is minified — TypeScript types don't affect runtime |

---

## 6. fancy-canvas Version Conflict Deep Dive

### The Conflict

```
Installed via LC v5.0.9:    fancy-canvas@2.1.0  (in node_modules)
Plugin compiled against:     fancy-canvas@0.2.2  (type declarations)
```

### What This Means

Since `lightweight-charts-line-tools@4.1.1` does NOT declare `fancy-canvas` as a peer dependency (it has it as a direct `dependency`), npm SHOULD install v0.2.2 alongside. However:

```
npm dependencies tree:
  lightweight-charts@5.0.9 ──► fancy-canvas@2.1.0
  line-tools (vendored)    ──► fancy-canvas@0.2.2 (declared in its package.json)
```

Since the plugin is vendored (not installed via npm), its `package.json` is **NOT resolved by npm** for dependency installation. The only `fancy-canvas` in `node_modules` is the one from `lightweight-charts@5.0.9` → `fancy-canvas@2.1.0`.

**At runtime**, the plugin code accesses canvas rendering through the lightweight-charts primitive API (`CanvasRenderingTarget2D` provided by LC). The actual rendering context is passed by lightweight-charts itself, not imported directly by the plugin. So the `fancy-canvas` version mismatch may **not cause runtime failures** — LC v5.x passes its own canvas context to primitives.

**However**, if the plugin internally attempts to create `CanvasRenderingTarget2D` instances directly (rather than receiving them from LC), it would get the runtime's `fancy-canvas@2.1.0` which might differ from the `0.2.2` API it was compiled against.

### Risk Assessment

| Scenario | Risk | Evidence |
|---|---|---|
| Plugin uses LC-provided rendering context only | Low | Primitive API pattern suggests this |
| Plugin creates own `CanvasRenderingTarget2D` | Medium | Cannot verify from minified code |
| Plugin uses `fancy-canvas` `Size` type for calculations | Medium | Need to check minified source |
| TypeScript compilation of plugin source | N/A | Bundle is pre-compiled, types not used |

---

## 7. Missing npm Dependency

The `src/plugins/line-tools/package.json` declares:

```json
{
  "name": "line-tools",
  "type": "module",
  "main": "./line-tools.umd.cjs",
  "module": "./line-tools.js"
}
```

But the **host** `package.json` does NOT include `lightweight-charts-line-tools` as a dependency:

```json
// package.json (host)
"dependencies": {
  "classnames": "^2.5.1",
  "html2canvas": "^1.4.1",
  "lightweight-charts": "^5.0.9",
  "lucide-react": "^0.555.0",
  "prop-types": "^15.8.1",
  "react": "^19.2.0",
  "react-dom": "^19.2.0"
}
```

The plugin is **silently vendored** in `src/plugins/line-tools/` without:
- npm dependency entry
- Version lock with lightweight-charts
- Peer dependency declaration
- Post-install build step

---

## 8. API Surface Coverage

### lightweight-charts APIs Used by Host

| API | Usage | Risk on Upgrade |
|---|---|---|
| `createChart()` | Chart creation | Stable since LC v3 |
| `addSeries(CandlestickSeries)` | Series creation | LC v5+. If downgrading to LC v4, this breaks. |
| `addSeries(BarSeries)` | Series creation | LC v5+ |
| `addSeries(LineSeries)` | Series + indicators | LC v5+ |
| `addSeries(AreaSeries)` | Series + comparison | LC v5+ |
| `addSeries(BaselineSeries)` | Series | LC v5+ |
| `series.setData()` | Data update | Stable since LC v3 |
| `series.update()` | Real-time update | Stable |
| `chart.removeSeries()` | Cleanup | Stable |
| `chart.applyOptions()` | Theme, resize | Stable |
| `chart.remove()` | Destroy | Stable |
| `chart.timeScale()` | Time axis control | Stable |
| `chart.priceScale()` | Price axis control | Stable |
| `chart.subscribeCrosshairMove()` | Crosshair | Stable |
| `chart.unsubscribeCrosshairMove()` | Cleanup | Stable |
| `chart.subscribeClick()` | Replay click | Stable |
| `chart.unsubscribeClick()` | Cleanup | Stable |
| `timeScale.subscribeVisibleLogicalRangeChange()` | Timer | Stable |
| `timeScale.unsubscribeVisibleLogicalRangeChange()` | Cleanup | Stable |
| `timeScale.getVisibleLogicalRange()` | Zoom | Stable |
| `timeScale.setVisibleLogicalRange()` | Zoom | Stable |
| `timeScale.setVisibleRange()` | Time range | Stable |
| `timeScale.fitContent()` | Reset zoom | Stable |
| `timeScale.timeToCoordinate()` | Replay slider | Stable |
| `timeScale.coordinateToTime()` | Replay click | Stable |
| `timeScale.logicalToCoordinate()` | Axis label | Stable |
| `series.priceToCoordinate()` | Axis label | Stable |
| `series.attachPrimitive()` | Plugin integration | Stable since LC v4 |
| `series.detachPrimitive()` | Cleanup | Stable since LC v4 |
| `series.data()` | Axis label | Stable |
| `series.applyOptions()` | Series style | Stable |
| `ResizeObserver` | Chart resize | Not LC — native API |

### lightweight-charts APIs Used by Plugin (via .d.ts)

| API | Declared in .d.ts | Risk on Upgrade |
|---|---|---|
| `ISeriesPrimitive` | Yes (re-declared) | Medium — host's LC v5 type may differ |
| `IPanePrimitive` | Yes (re-declared) | Medium |
| `IChartApi` | Yes (re-declared) | Medium |
| `ISeriesApi` | Yes (re-declared) | Medium |
| `CrosshairMode` | Yes (re-declared) | Low — enum values unlikely to change |
| `LineStyle` | Yes (re-declared) | Low |
| `ICustomSeriesPaneView` | Yes (re-declared) | Low |
| `CanvasRenderingTarget2D` | Imported from fancy-canvas | **HIGH** — version mismatch |

---

## 9. Upgrade Path Risks

### Upgrading lightweight-charts

| To Version | Risk | Issues |
|---|---|---|
| v5.0.9 → v5.1.x | Low | Minor version, API compatible |
| v5.x → v6.x (future) | High | Named exports may change; Series Definition API may change; `attachPrimitive` API may evolve |
| v5.x → v4.x (downgrade) | **CRITICAL** | Host uses `addSeries(CandlestickSeries)` pattern which does NOT exist in v4 |

### Upgrading lightweight-charts-line-tools

| To Version | Risk | Issues |
|---|---|---|
| v4.1.1 → v4.2.x (if exists) | Medium | `fancy-canvas` version remains mismatched; alert bridge via `_userPriceAlerts` may change |
| v4.1.1 → v5.x (if exists) | High | Unknown API changes; alert bridge may break completely |

### Replacing Plugin

| Alternative | Risk | Effort |
|---|---|---|
| Fork plugin source from GitHub | Medium | Need git clone + build pipeline |
| Rewrite drawing tools in-house | Very High | 60+ classes, 40+ drawing types |
| Use lightweight-charts custom series | High | Not equivalent — different rendering model |

---

## 10. Runtime Error Scenarios

### Scenario A: Plugin Internal API Deprecation

```
Action: User switches chart type
Trigger: series re-creation
Plugin behavior:
  1. new LineToolManager() — succeeds
  2. manager.clearTools() — succeeds on old manager
  3. oldSeries.detachPrimitive(manager) — succeeds
  4. chart.removeSeries(oldSeries) — succeeds
  5. new LineToolManager() — called, but old alert subscriptions still reference old chart refs
```

**Risk:** Memory leak from stale subscription callbacks. The old `userAlerts.alertsChanged()` subscription still references the old React component's `onAlertsSync` callback (which is a stale closure).

### Scenario B: fancy-canvas Type Mismatch at Bundle Time

```
If plugin is rebuilt from source against LC v5:
  - Plugin code imports CanvasRenderingTarget2D from fancy-canvas
  - npm resolves fancy-canvas@2.1.0 (from LC v5's dependency)
  - If CanvasRenderingTarget2D interface changed between 0.2.2 and 2.1.0:
      → TypeScript compilation fails
      → or runtime type errors
```

**Current mitigation:** Plugin is pre-compiled, so this scenario only triggers if source is rebuilt.

### Scenario C: Dual fancy-canvas Instances

```
If the plugin is installed via npm (instead of vendored):
  - lightweight-charts-line-tools@4.1.1 declares fancy-canvas@0.2.2 as dependency
  - npm installs BOTH fancy-canvas@0.2.2 AND fancy-canvas@2.1.0
  - At runtime, plugin may import 0.2.2, LC may import 2.1.0
  - CanvasRenderingTarget2D instances from different versions are NOT compatible
  - Result: plugin crash on any canvas interaction
```

**Current mitigation:** Plugin is vendored, so npm doesn't see its package.json dependencies. Only LC v5's fancy-canvas@2.1.0 is installed.

---

## 11. Compatibility Scorecard

### Runtime Compatibility

| Component Pair | Score | Assessment |
|---|---|---|
| Host ↔ LC v5.0.9 | 🟢 9/10 | Correct API usage, proper import patterns |
| Host ↔ Plugin v4.1.1 (vendored) | 🟡 6/10 | Works at runtime but relies on private APIs |
| Plugin v4.1.1 ↔ LC v5.0.9 | 🟡 5/10 | `attachPrimitive` works; `fancy-canvas` mismatch is latent |
| Plugin v4.1.1 ↔ fancy-canvas 0.2.2 | 🔴 2/10 | Types declare 0.2.2, runtime has 2.1.0 |

### Upgrade Compatibility

| Upgrade Path | Score | Assessment |
|---|---|---|
| Keep current stack | 🟡 6/10 | Works but fragile — one bad npm install breaks plugin |
| Upgrade LC v5.x | 🟢 8/10 | Minor versions are safe |
| Upgrade plugin to npm | 🔴 1/10 | dual fancy-canvas versions break everything |
| Add plugin as npm dep | 🔴 0/10 | Will pull fancy-canvas@0.2.2 and cause version conflict |
| Rebuild plugin from source | 🟡 4/10 | Need to resolve fancy-canvas version and API differences |

### Architectural Compatibility

| Aspect | Score | Assessment |
|---|---|---|
| Host API usage | 🟢 9/10 | Clean, correct LC v5 usage |
| Plugin integration pattern | 🔴 3/10 | Private property access, no adapter, no serialization |
| Dependency management | 🔴 2/10 | Vendored bundle with no version tracking |
| Type safety | 🟡 5/10 | .d.ts re-declares everything — won't detect LC API changes |
| Alert bridge stability | 🔴 1/10 | Fully dependent on `_`-prefixed private methods |

---

## 12. Findings Summary

### Critical Issues (Must Fix)

| # | Issue | Component | Impact |
|---|---|---|---|
| C1 | Plugin vendored without npm dependency tracking | Host | No version lock, no upgrade path, no compatibility verification |
| C2 | Alert bridge uses `_userPriceAlerts` private API | Plugin | Will break if plugin is updated/rebuilt |
| C3 | No drawing serialization API | Plugin | Users cannot save work, data lost on reload |

### High-Risk Issues (Should Address)

| # | Issue | Component | Impact |
|---|---|---|---|
| H1 | `fancy-canvas` version mismatch (0.2.2 vs 2.1.0) | Plugin ↔ LC | Latent crash risk if plugin accesses fancy-canvas directly |
| H2 | .d.ts re-declares all LC types | Plugin | Won't detect LC API drift during compilation |
| H3 | Series re-creation destroys plugin state | Host | Drawings lost on chart type change — no snapshot/restore |

### Low-Risk Issues (Monitor)

| # | Issue | Component | Impact |
|---|---|---|---|
| L1 | Window globals for debug | Host | Not used in production, but indicates coupling |
| L2 | Stale subscriptions on series change | Host + Plugin | Minor memory leak risk |
| L3 | No version info in plugin bundle | Plugin | Cannot verify compatibility at build time |

---

## 13. Recommended Actions

### Immediate (Phase 0 — Next Sprint)

1. **Add plugin to `package.json` as a vendored path dependency** so its version is tracked:
   ```json
   {
     "dependencies": {
       "line-tools": "file:src/plugins/line-tools"
     }
   }
   ```
   This at least makes `npm ls` report the dependency.

2. **Add a build-time version check** between LC v5.0.9 and the plugin's expected version. Simple script that reads `package.json` versions.

3. **Document the vendoring decision** with a `PLUGIN_LICENSE.md` and `PLUGIN_VERSION.md` in `src/plugins/line-tools/`.

### Short-term (Phase 1 — 1-2 Sprints)

4. **Create PluginAdapter layer** that:
   - Wraps `_userPriceAlerts` access in stable public methods
   - Catches any API errors with graceful degradation
   - Provides TypeScript types for the alert surface

5. **Add drawing serialization** through the adapter:
   - If `LineToolManager._tools` is accessible → extract drawing data
   - If not → wrap export/import as the plugin's missing API
   - Persist to localStorage under `tv_drawings`

6. **Fix stale subscription memory leak** on series re-creation:
   - Track subscription references
   - Unsubscribe old before new subscription

### Medium-term (Phase 2 — 3-4 Sprints)

7. **Fork plugin source** from `github.com/difurious/lightweight-charts-line-tools`:
   - Update to target `fancy-canvas@2.1.0`
   - Add public alert API (remove `_userPriceAlerts` dependency)
   - Add serialization API
   - Add version string
   - Build from source with proper dependency resolution

8. **Update host to use forked plugin** via npm/git dependency:
   ```json
   {
     "dependencies": {
       "lightweight-charts-line-tools": "github:your-org/lightweight-charts-line-tools#v2.0.0"
     }
   }
   ```

### Long-term (Phase 3 — Future)

9. **Evaluate replacing plugin** with a native lightweight-charts primitive-based solution if:
   - LC v6+ deprecates `attachPrimitive`
   - Plugin becomes unmaintained upstream
   - Custom drawing needs exceed plugin capabilities