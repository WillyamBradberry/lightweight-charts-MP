Confirmed — the active context prohibits mixin/prototype tricks and asks for a conservative helper-module extraction. Here is the plan.

---

## Conservative extraction plan (no mixins, no prototype composition)

### Ground truth about where the bulk is

The 1364 lines are dominated by **JSDoc/doc comments**, not by extractable computation. The only methods with genuinely substantial *computation bodies* (the things worth extracting as pure functions) are:

- `pointToScreenPoint` (~lines 1040–1057)
- `screenPointToPoint` (~1068–1096)
- the cursor-resolution `switch` inside `hitTest` (~267–288)
- `getChartDrawingHeight` pane lookup (~1356–1363)
- the constructor's axis-view creation loop (~385–392)

Everything else is either a trivial accessor or an `ISeriesPrimitive`/`IDataSource` method that must *remain an instance method* (the interface calls it on the object). Extracting those would require passing the whole tool around or partial-class tricks — both forbidden. So **the honest lever for reaching ~1000 lines is pure-function extraction + JSDoc consolidation**, not magic.

---

### 1. Methods extractable as pure/helper functions (no or minimal `this`)

These move their **bodies** into freestanding functions that take explicit args; the class method becomes a thin delegate. Extraction is pure and behavior-identical.

**A. Coordinate conversion pair → new `src/utils/geometry/convert.ts`**
- `pointToScreenPoint(chart, series, point): Point | null` — body of the current method (already uses the `interpolateLogicalIndexFromTime` / `logicalIndexToCoordinate` helpers).
- `screenPointToLogicalPoint(chart, series, horzScaleBehavior, point): LineToolPoint | null` — full body incl. the `minMove` rounding + `interpolateTimeFromLogicalIndex` logic.

The class keeps `pointToScreenPoint(point)` / `screenPointToPoint(point)` as one-line delegates passing `this._chart`, `this._series`, `this._horzScaleBehavior`. *No `this` in the helpers → pure.*

**B. Hit-test cursor resolution → new `src/utils/geometry/hit-cursor.ts`**
- `resolveCursorForHit(internalResult: HitTestResult, options): PaneCursorType` — the `switch` (MovePointBackground → `defaultDragCursor`/Grabbing, MovePoint/Regular → `defaultHoverCursor`/Pointer, ChangePoint → resize, else Default) plus the `suggestedCursor` preference. *Pure given (result, options).*

`hitTest` keeps the override + editable + `_internalHitTest` orchestration in the class, but replaces the ~35-line block with one call. (I keep `hitTest` itself in the class — it's the ISeriesPrimitive entry point tied to `_overrideCursor`, `options()`, `_internalHitTest`.)

**C. Pane-dimension lookup → add `getPaneDrawingHeight(layout, series)` to an existing geometry/helpers module**
- The `layout.panes.find(...)` + `height` logic (~8 lines) is pure given a layout snapshot + series. `getChartDrawingWidth` stays a one-liner in the class; both can optionally delegate.

Estimated net reduction from pure extraction: **~85–95 lines** (1364 → ~1270).

---

### 2. Small cohesive group that becomes a helper module `BaseLineTool` simply calls

**`src/views/axis-label-views.ts`** — extract the constructor's persistent axis-view creation loop (~10 lines) into:
`createLineToolAxisViews(tool, chart, stackingManager, pointsCount): { price: IPriceAxisView[]; time: ITimeAxisView[] }`

This is the one cohesive "group" that moves cleanly: it already owns the imports (`LineToolPriceAxisLabelView`, `LineToolTimeAxisLabelView`) and all callers of those view classes. Caveat (honest): it needs the `tool` reference (the label views callback into the tool), so it takes `tool` as a parameter — this is still a plain helper *call*, not composition. The constructor simply assigns the two returned arrays.

This is the **only** cohesive group I recommend moving. The state/points/options/export/error-state getters are trivial accessors; moving them would require passing the tool as context and gain nothing.

---

### 3. What must stay inside the class

- **All fields** and their lifecycle: `attached()`, `detached()`, `getPane()`, `destroy()`, `_triggerChartUpdate()`.
- **The `ISeriesPrimitive`/`IDataSource` method surface** (interface callsites — they must be instance methods even if they delegate): `paneViews`, `priceAxisViews`, `timeAxisViews`, `updateAllViews`, `hitTest`, `getSeries`, `getChart`, `horzScaleBehavior` getter, `coreApi`, `base`, `autoscaleInfo`, `firstValue`, `formatter`, `priceLineColor`, `priceAxisLabelColor`, `timeAxisLabelColor`.
- **State/points/options getters & setters** (`setSelected`, `points()`, `applyOptions`, `getExportData`, `addPoint`, `setPoints`, `setLastPoint`, `isFinished`, `tryFinish`, etc.) — trivial accessors over fields; extracting them needs forbidden tricks.
- **The constructor** — wires fields, options, and calls the axis-view factory.
- **Abstract + optional subclass hooks** — `_internalHitTest`, `updateCullingState`, `maxAnchorIndex?`, `supportsClickClickCreation?`, `supportsClickDragCreation?`, `supportsShift*Constraint?`, `getShiftConstrainedPoint?`, `anchor0TriggersTranslation`, `handleDoubleClickFinalization`, `getFinalizationMethod`. These define the subclass contract and stay put.
- **Imports** of `LineToolsCorePlugin`, `PriceDataSource`, and the public `index.ts` re-export of `BaseLineTool` are unchanged.

---

### File list — what moves where

| Action | File | From `base-line-tool.ts` |
|---|---|---|
| **New** | `src/utils/geometry/convert.ts` | bodies of `pointToScreenPoint`, `screenPointToPoint` (as pure funcs) |
| **New** | `src/utils/geometry/hit-cursor.ts` | `hitTest` cursor `switch` (as `resolveCursorForHit`) |
| **New** | `src/views/axis-label-views.ts` | constructor axis-view loop (as `createLineToolAxisViews`) |
| **Edit** | `src/utils/helpers.ts` or `geometry/*` | pane-height lookup helper |
| **Edit** | `src/model/base-line-tool.ts` | delegates + condensed JSDoc (see below) |

No other file changes; all consumers keep importing `BaseLineTool` from `./model/base-line-tool`, so there is **zero import-site / API / behavior change**.

---

### Realistic note on the ~1000-line target

Pure-logic extraction alone lands around **~1270 lines** — the remaining ~1270 is mostly large `/** ... */` doc blocks per method. To actually get under ~1000 I recommend **JSDoc consolidation** in the main file as part of the same edit (it is doc-only, runtime-safe): shorten each block to a tight 1-3 line summary, and relocate the long "why/how" prose into the new helper modules where the logic now lives, or into the wiki. With extraction + doc trimming, the main file should land in the **~950–1050** range. If you want to go further without tricks, the axis/price/time view blocks' docs are the next place to trim.

I have not changed any files. If you're happy with this plan (pure-function extraction + axis-view factory + doc consolidation), toggle to **Act mode** and I'll implement it, then validate with `tsc --noEmit` and the package tests to confirm zero behavior change.