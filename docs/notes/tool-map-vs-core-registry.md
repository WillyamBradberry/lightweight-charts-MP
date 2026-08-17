# TOOL_MAP ↔ Core toolRegistry coverage

> Source: `src/components/Chart/ChartComponent.jsx` (TOOL_MAP), `src/plugins/line-tools-core-adapter/toolRegistry.js`, `packages/line-tools-lines`, `packages/line-tools-rectangle`.
> Generated: 2026-08-16. Reference note only — no code changes.

## Summary

`TOOL_MAP` exposes **39 shell keys** → mapped core names. Native `None` keys (cursor, zoom_in, zoom_out, remove) are not real tools and excluded from registration.

Only **7 mapped names** are registered on the CORE path (via `toolRegistry.js` → `@mp/line-tools-lines` + `@mp/line-tools-rectangle`). Everything else is served only by the legacy `plugins/line-tools/line-tools.js` bundle, so it is **missing on CORE**.

`Arrow` and `HorizontalRay` are notable: upstream `lightweight-charts-line-tools-lines` already provides them, but the local `packages/line-tools-lines/src/index.ts` registers only 6 (drops Arrow + HorizontalRay).

## Coverage table

| shellKey | mappedName | registered | upstream package guess |
|---|---|---|---|
| cursor | `None` | – (n/a) | core (no-op / deselect) |
| eraser | `Eraser` | ✗ | core eraser (custom) |
| trendline | `TrendLine` | ✓ | `@mp/line-tools-lines` / `lightweight-charts-line-tools-lines` |
| arrow | `Arrow` | ✗ | `lightweight-charts-line-tools-lines` (upstream has it; local pkg dropped) |
| ray | `Ray` | ✓ | `lightweight-charts-line-tools-lines` |
| extended_line | `ExtendedLine` | ✓ | `lightweight-charts-line-tools-lines` |
| horizontal | `HorizontalLine` | ✓ | `lightweight-charts-line-tools-lines` |
| horizontal_ray | `HorizontalRay` | ✗ | `lightweight-charts-line-tools-lines` (upstream has it; local pkg dropped) |
| vertical | `VerticalLine` | ✓ | `lightweight-charts-line-tools-lines` |
| cross_line | `CrossLine` | ✓ | `lightweight-charts-line-tools-lines` |
| parallel_channel | `ParallelChannel` | ✗ | `lightweight-charts-line-tools-...` (custom/community) |
| fibonacci | `FibRetracement` | ✗ | `lightweight-charts-line-tools-fibonacci` |
| fib_extension | `FibExtension` | ✗ | `lightweight-charts-line-tools-fibonacci` |
| pitchfork | `Pitchfork` | ✗ | `lightweight-charts-line-tools-pitchfork` |
| brush | `Brush` | ✗ | `lightweight-charts-line-tools-brush` |
| highlighter | `Highlighter` | ✗ | `lightweight-charts-line-tools-brush` |
| rectangle | `Rectangle` | ✓ | `@mp/line-tools-rectangle` / `lightweight-charts-line-tools-rectangle` |
| circle | `Circle` | ✗ | `lightweight-charts-line-tools-shapes` |
| path | `Path` | ✗ | `lightweight-charts-line-tools-polyline` |
| text | `Text` | ✗ | `lightweight-charts-line-tools-text` |
| callout | `Callout` | ✗ | `lightweight-charts-line-tools-callout` |
| price_label | `PriceLabel` | ✗ | `lightweight-charts-line-tools-price-label` |
| pattern | `Pattern` | ✗ | custom (harmonic) |
| triangle | `Triangle` | ✗ | `lightweight-charts-line-tools-shapes` |
| abcd | `ABCD` | ✗ | custom (harmonic) |
| xabcd | `XABCD` | ✗ | custom (harmonic) |
| elliott_impulse | `ElliottImpulseWave` | ✗ | custom (harmonic) |
| elliott_correction | `ElliottCorrectionWave` | ✗ | custom (harmonic) |
| head_and_shoulders | `HeadAndShoulders` | ✗ | custom (pattern) |
| prediction | `LongPosition` | ✗ | custom (prediction) |
| prediction_short | `ShortPosition` | ✗ | custom (prediction) |
| date_range | `DateRange` | ✗ | `lightweight-charts-line-tools-ridgeline` / custom range |
| price_range | `PriceRange` | ✗ | custom range |
| date_price_range | `DatePriceRange` | ✗ | custom range |
| measure | `Measure` | ✗ | `lightweight-charts-line-tools-measurer` |
| zoom_in | `None` | – (n/a) | core click handler (not a tool) |
| zoom_out | `None` | – (n/a) | core click handler (not a tool) |
| remove | `None` | – (n/a) | core (deselect/remove) |

## Key gaps on CORE path (32 mapped names missing)
Arrow, HorizontalRay, Eraser, ParallelChannel, FibRetracement, FibExtension, Pitchfork, Brush, Highlighter, Circle, Path, Text, Callout, PriceLabel, Pattern, Triangle, ABCD, XABCD, ElliottImpulseWave, ElliottCorrectionWave, HeadAndShoulders, LongPosition, ShortPosition, DateRange, PriceRange, DatePriceRange, Measure.

> ⚠️ "upstream package guess" column is a best-effort guess; upstream repo at `libs/upstream/` currently only ships `lightweight-charts-line-tools-{core,lines,rectangle}`. The remaining tools live only in the legacy bundle (`plugins/line-tools/line-tools.js`).