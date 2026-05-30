# Line Tools Plugin Decomposition Plan

> **Source Analysis**: `libs/MP-charts-toolkit/src/plugins/line-tools/line-tools.js` (6,495 lines)
> **Reference Architecture**: `libs/upstream/lightweight-charts-line-tools-core` (modular plugin ecosystem)
> **Generated**: 2026-05-30

---

## Executive Summary

The `line-tools.js` file is a monolithic 6,495-line JavaScript module that combines the upstream lightweight-charts-line-tools-core orchestrator with MP Charts Toolkit-specific extensions. This plan decomposes it into **10 maintainable subsystems** organized in a modular folder structure.

### Key Metrics

| Metric | Value |
|--------|-------|
| Total source lines | 6,495 |
| Lines extractable as subsystems | ~6,138 (94.5%) |
| Lines recommended for deletion | ~357 (5.5%) |
| Number of target subsystems | 10 |
| Estimated TypeScript migration effort | Medium-High |

---

## Target Folder Structure

```
src/plugins/line-tools/
├── core/                          # Core orchestrator integration
│   ├── index.ts                   # Main entry point
│   ├── plugin-factory.ts          # createLineToolsPlugin wrapper
│   └── registry.ts                # Tool registration manager
│
├── alerts/                        # Alert system (MP-UNIQUE)
│   ├── alert-manager.ts           # Di class - alert lifecycle
│   ├── alert-model.ts             # Li class - alert data model
│   ├── alert-dialog.ts            # Ei class - edit dialog UI
│   ├── notifications.ts           # Hi class - toast notifications
│   └── types.ts                   # Alert condition types
│
├── dialogs/                       # Dialog system (extracted)
│   ├── base-dialog.ts             # Dialog base class
│   ├── overlay-manager.ts         # Overlay z-index management
│   └── schema-types.ts            # Dialog form schemas
│
├── renderers/                     # Renderer system (extracted)
│   ├── line-renderer.ts           # si - basic line rendering
│   ├── polygon-renderer.ts        # li - filled shapes
│   ├── rectangle-renderer.ts      # ci - rounded rectangles
│   ├── text-renderer.ts           # pi - text labels
│   ├── bitmap-renderer.ts         # fi - bitmap coordinate space
│   └── composite-renderer.ts      # Multi-layer rendering orchestration
│
├── tools/                         # Drawing tool classes (extracted)
│   ├── long-short-position.ts     # Jt/Kt - Long/Short position tool
│   ├── trend-line.ts              # Rt - Trend line wrapper
│   ├── price-range.ts             # Lt - Price range visualizer
│   ├── fib-retracement.ts         # pt - Fibonacci tool
│   └── base-tool-wrapper.ts       # Adapter for upstream tools
│
├── primitives/                    # Visual primitives (extracted)
│   ├── anchor-renderer.ts         # v function → class
│   ├── label-stacking.ts          # PriceAxisLabelStackingManager
│   ├── crosshair-view.ts          # Zt class - crosshair overlay
│   └── hit-test-result.ts         # HitTestResult type alias
│
├── styles/                        # Style injection (extracted)
│   ├── toolbar-styles.ts          # Floating toolbar CSS
│   ├── tool-styles.ts             # Default tool appearance constants
│   └── css-injector.ts            # Generic style injection utility
│
├── geometry/                      # Geometry utilities (extracted)
│   ├── coordinate-mapper.ts       # T function - screen↔logical conversion
│   ├── distance-calculator.ts     # A function - point-to-line distance
│   ├── line-intersection.ts       # gt function - segment intersection
│   ├── point-converter.ts         # ft function - point array conversion
│   └── types.ts                   # Point, LineSegment types
│
├── templates/                     # Template system (extracted)
│   ├── template-store.ts          # localStorage persistence
│   ├── template-export.ts         # Export/serialization logic
│   └── template-types.ts          # Template schema definitions
│
├── events/                        # Event system (extracted)
│   ├── event-emitter.ts           # H class - generic event emitter
│   ├── mouse-handler.ts           # Mi class - DOM event bus
│   └── subscription-manager.ts    # Subscription lifecycle
│
├── navigation/                    # Navigation controls (MP-UNIQUE)
│   ├── nav-toolbar.ts             # Floating zoom/scroll buttons
│   └── nav-styles.ts              # Navigation CSS
│
├── callouts/                      # Badge/callout system (MP-UNIQUE)
│   ├── callout-marker.ts          # Bi class - source marker
│   ├── callout-renderer.ts        # Fi class - visual rendering
│   └── callout-view.ts            # zi class - Lightweight Charts view
│
├── utils/                         # Shared utilities (retain subset)
│   ├── cleanup.ts                 # xt function - DOM cleanup
│   ├── style-helper.ts            # mt function - CSS property setter
│   ├── constants.ts               # ii/ni/ai/ui/mi default constants
│   └── validators.ts              # Input validation helpers
│
├── dt/                            # Alert logic utility (extracted)
│   ├── alert-checker.ts           # Static alert condition checker
│   └── price-at-logical.ts        # getPriceAtLogical helper
│
└── types/                         # TypeScript type definitions
    ├── tool-points.ts             # LineToolPoint interfaces
    ├── tool-options.ts            # Style option types
    └── chart-api.ts               # Lightweight Charts API types
```

---

## Subsystem Analysis

### 1. Alert System (`alerts/`) — MP-UNIQUE

**Source location**: Lines 3630–4257 (628 lines)

#### Classes Extracted
| Class | Line Range | Purpose |
|-------|------------|---------|
| `Li` | ~3630–3691 | Alert data model with events (add/remove/change) |
| `Di` | ~3946–4257 | Chart-integrated alert manager (PaneView implementation) |
| `Ei` | ~3692–3899 | Alert edit dialog UI component |
| `Hi` | ~4258–4471 | Toast notification system with audio alerts |

#### Estimated Line Range
- `alert-manager.ts`: 200 lines (Di class refactored)
- `alert-model.ts`: 60 lines (Li class refactored)
- `alert-dialog.ts`: 200 lines (Ei class refactored)
- `notifications.ts`: 150 lines (Hi class refactored)
- `types.ts`: 30 lines (new type definitions)

**Total**: ~640 lines

#### Dependencies
- Lightweight Charts API (`chart`, `series`)
- Dialog system for edit UI
- Audio API for alarm sounds
- CSS injection for styling

#### Public Interfaces
```typescript
// AlertModel (Li)
interface IAlertManager {
  addAlert(price: number): string;
  addAlertWithCondition(price: number, condition: AlertCondition): string;
  removeAlert(id: string): void;
  updateAlertPrice(id: string, price: number): void;
  alerts(): AlertItem[];
  alertAdded(): Subscription;
  alertRemoved(): Subscription;
  alertChanged(): Subscription;
  alertsChanged(): Subscription;
}

// AlertManager (Di) - Chart-integrated
interface IAlertChartManager {
  attached({ chart, series, requestUpdate }): void;
  detached(): void;
  checkPriceCrossings(bar: OHLCBar): void;
  alertTriggered(): Subscription;
  openEditDialog(id?: string, data?: AlertData): void;
  addToolAlert(tool: LineTool, condition: AlertCondition): string;
  setSymbolName(symbol: string): void;
}

// ToastNotifications (Hi)
interface INotificationManager {
  show(alert: AlertTriggerEvent): void;
  dismiss(id: string): void;
  destroy(): void;
}
```

#### Extraction Difficulty: **MEDIUM**
- Requires restructuring from `PaneView` pattern to standalone service
- Needs chart detachment logic refactoring
- Event subscription lifecycle must be reorganized

#### TypeScript Migration Difficulty: **MEDIUM**
- Need to define alert condition type union
- Chart interface contracts need explicit typing
- Alert trigger event types need definition

---

### 2. Dialog System (`dialogs/`) — EXTRACTED

**Source location**: Lines 3692–3899 (208 lines)

#### Classes Extracted
| Class | Line Range | Purpose |
|-------|------------|---------|
| `Ei` | ~3692–3899 | Alert edit dialog with form generation |

#### Estimated Line Range
- `base-dialog.ts`: 80 lines (dialog base class, new)
- `overlay-manager.ts`: 60 lines (overlay DOM management)
- `schema-types.ts`: 40 lines (form schema types, new)
- `alert-dialog.ts`: 30 lines (Ei integration stub)

**Total**: ~210 lines

#### Dependencies
- DOM API (`document.createElement`, etc.)
- CSS injection for styling
- Event listeners for form interaction

#### Public Interfaces
```typescript
interface IDialog {
  show(data: DialogData, onSave?: (data: DialogData) => void): void;
  hide(): void;
}

class BaseDialog implements IDialog {
  protected _overlay: HTMLElement | null;
  protected _onSave: ((data: DialogData) => void) | null;
  protected _injectStyles(id: string, css: string): void;
  protected _createOverlay(): HTMLElement;
}
```

#### Extraction Difficulty: **LOW**
- Self-contained class with clear boundaries
- Inline CSS can be extracted as template strings
- Form generation logic is linear and readable

#### TypeScript Migration Difficulty: **LOW**
- Simple form data types needed
- Generic dialog data interface sufficient
- Minimal external type dependencies

---

### 3. Renderer System (`renderers/`) — EXTRACTED

**Source location**: Lines ~1–500 (approximately 500 lines for base renderers)

#### Classes Extracted
| Class | Line Range | Purpose |
|-------|------------|---------|
| `si` | ~line-approx | Line renderer (stroke-based drawing) |
| `li` | ~line-approx | Polygon/fill renderer |
| `ci` | ~line-approx | Rectangle/rounded-corner renderer |
| `pi` | ~line-approx | Text label renderer |
| `fi` | ~line-approx | Bitmap coordinate space renderer |

#### Estimated Line Range
- `line-renderer.ts`: 80 lines
- `polygon-renderer.ts`: 70 lines
- `rectangle-renderer.ts`: 90 lines
- `text-renderer.ts`: 100 lines
- `bitmap-renderer.ts`: 60 lines (coordinate space adapters)
- `composite-renderer.ts`: 50 lines (new orchestration layer)

**Total**: ~450 lines

#### Dependencies
- Lightweight Charts rendering context (`useBitmapCoordinateSpace`, `useMediaCoordinateSpace`)
- Bitmap coordinate types (horizontalPixelRatio, verticalPixelRatio)
- Media coordinate types (mediaSize)

#### Public Interfaces
```typescript
interface IRenderer {
  draw(context: RenderContext): void;
  zOrder(): "below" | "above" | "top";
  renderer(): IRenderer;
}

class LineRenderer implements IRenderer { /* si */ }
class PolygonRenderer implements IRenderer { /* li */ }
class RectangleRenderer implements IRenderer { /* ci */ }
class TextRenderer implements IRenderer { /* pi */ }
```

#### Extraction Difficulty: **HIGH**
- Deeply integrated with Lightweight Charts rendering pipeline
- Coordinate space switching (bitmap ↔ media) is critical
- Each renderer has complex inline drawing logic
- Requires careful interface definition to maintain compatibility

#### TypeScript Migration Difficulty: **HIGH**
- Need precise bitmap/media coordinate type contracts
- Render context types must match Lightweight Charts internals
- Generic renderers needed for reusability

---

### 4. Drawing Tools (`tools/`) — EXTRACTED

**Source location**: Lines ~500–2800 (approximately 1,300 lines)

#### Classes Extracted
| Class | Line Range | Purpose |
|-------|------------|---------|
| `kt` / `Rt` | ~line-approx | Long/Short Position tool (Jt in analysis) |
| `Vt` / `At` | ~line-approx | Polylines (trend lines, rays, arrows) |
| `Lt` | ~line-approx | Price Range visualizer |
| `pt` | ~line-approx | Fibonacci Retracement tool |

#### Estimated Line Range
- `long-short-position.ts`: 250 lines (Jt/Kt class + PnL logic)
- `trend-line.ts`: 150 lines (Rt and related polyline classes)
- `price-range.ts`: 180 lines (Lt class with percentage overlay)
- `fib-retracement.ts`: 200 lines (pt class with fib levels)
- `base-tool-wrapper.ts`: 70 lines (adapter for upstream tools)

**Total**: ~850 lines

#### Dependencies
- Renderer system (all renderers)
- Geometry utilities (coordinate mapping, distance calculation)
- Event system (drag handling, selection events)
- Lightweight Charts API (timeScale, priceScale, series)

#### Public Interfaces
```typescript
interface ILineTool {
  updatePointByIndex(index: number, point: LineToolPoint): void;
  toolHitTest(x: number, y: number): HitTestResult | null;
  paneViews(): IPaneView[];
  autoscaleInfo(): AutoscaleInfo | null;
  applyOptions(options: Partial<ToolOptions>): void;
}

class LongShortPosition implements ILineTool { /* Jt/Kt */ }
class PriceRange implements ILineTool { /* Lt */ }
class FibRetracement implements ILineTool { /* pt */ }
```

#### Extraction Difficulty: **HIGH**
- Complex geometric logic with many interdependencies
- Hit-testing requires precise coordinate math
- Point constraint systems need generic abstraction
- Multiple anchor points per tool type

#### TypeScript Migration Difficulty: **HIGH**
- Need generic tool types: `BaseTool<P extends PointConstraint>`
- Point constraint interfaces for each tool variant
- Geometric calculation return types must be precisely defined

---

### 5. Style System (`styles/`) — EXTRACTED

**Source location**: Constants ii, ni, ai, ui, mi throughout file (~230 lines)

#### Items Extracted
| Constant | Purpose | Lines |
|----------|---------|-------|
| `ii` | Default tool style defaults | ~30 |
| `ni` | Anchor appearance constants | ~80 |
| `ai` | Selection state styles | ~60 |
| `ui` | Hover state styles | ~40 |
| `mi` | Active/dragging state styles | ~20 |

#### Estimated Line Range
- `toolbar-styles.ts`: 80 lines (floating toolbar CSS as template string)
- `tool-styles.ts`: 100 lines (default style constant objects)
- `css-injector.ts`: 30 lines (generic style injection utility)

**Total**: ~210 lines

#### Dependencies
- None - pure CSS/text constants and DOM API

#### Public Interfaces
```typescript
// tool-styles.ts
const DEFAULT_TOOL_STYLES: ToolStyleDefaults = { /* ii */ };
const ANCHOR_STYLES: AnchorAppearance = { /* ni */ };
const SELECTION_STYLES: SelectionAppearance = { /* ai */ };

// css-injector.ts
function injectCSS(id: string, cssText: string): void;
function isStylesheetInjected(id: string): boolean;
```

#### Extraction Difficulty: **LOW**
- Simple extraction of constant objects
- CSS strings can be extracted as-is or converted to template literals
- Style injector is a standard utility pattern

#### TypeScript Migration Difficulty: **LOW**
- TypeScript declaration files for CSS class names (`.d.ts`)
- Style interface types for tool appearance constants
- Generic CSS injector signature

---

### 6. Primitives (`primitives/`) — EXTRACTED

**Source location**: oi (~150), ri (~80), hi (~40), di (~20), gi (~10) = ~300 lines

#### Classes Extracted
| Class | Purpose |
|-------|---------|
| `oi` | Anchor point visual primitive (draws anchor circles on chart) |
| `ri` | Price label renderer for axis |
| `hi` | Crosshair horizontal line primitive |
| `di` | Label button component renderer |
| `gi` | Additional label styling variant |

#### Estimated Line Range
- `anchor-renderer.ts`: 100 lines (v function as class + oi rendering)
- `label-stacking.ts`: 80 lines (PriceAxisLabelStackingManager extraction)
- `crosshair-view.ts`: 60 lines (Zt class - crosshair overlay pane view)
- `hit-test-result.ts`: 20 lines (HitTestResult type alias and helpers)

**Total**: ~260 lines

#### Dependencies
- Renderer system for coordinate space access
- Lightweight Charts PaneView interface
- Anchor drawing utility function `v`

#### Public Interfaces
```typescript
interface IAnchorRenderer {
  draw(context: RenderContext, point: BitmapPoint, style: AnchorStyle): void;
}

class PriceAxisLabelStackingManager {
  addLabel(price: number, text: string): LabelPosition;
  removeLabelsForPrice(price: number): void;
  getStackedLabels(): StackedLabel[];
}
```

#### Extraction Difficulty: **MEDIUM**
- Need to separate from tool classes into standalone primitives
- Anchor rendering function `v` is used throughout but not self-contained
- Label stacking requires price coordinate awareness

#### TypeScript Migration Difficulty: **MEDIUM**
- PaneView interface types needed from Lightweight Charts
- Hit test result type definitions required
- Anchor style interfaces need definition

---

### 7. Event System (`events/`) — EXTRACTED

**Source location**: H class (~100 lines), Mi class (~100 lines) = ~200 lines

#### Classes Extracted
| Class | Purpose |
|-------|---------|
| `H` | Generic event emitter with subscribe/unsubscribe/fire pattern |
| `Mi` | Mouse event handler bus (DOM event management for chart interactions) |

#### Estimated Line Range
- `event-emitter.ts`: 80 lines (H class refactored as generic EventEmitter<T>)
- `mouse-handler.ts`: 100 lines (Mi class refactored with explicit event types)
- `subscription-manager.ts`: 40 lines (lifecycle management utility)

**Total**: ~220 lines

#### Dependencies
- DOM APIs (`addEventListener`, `removeEventListener`)
- Lightweight Charts subscription system
- Window/DOM event types

#### Public Interfaces
```typescript
class EventEmitter<T extends EventMap> {
  subscribe(handler: Handler<T[key]>, context?: any): Subscription;
  unsubscribe(subscription: Subscription): void;
  unsubscribeAll(context: any): void;
  fire(event: keyof T, data?: T[key]): void;
}

class MouseEventHandler {
  attached(chart: Chart, series: Series): void;
  detached(): void;
  clicked(): Subscription;
  mouseMoved(): Subscription;
  mouseDown(): Subscription;
  mouseUp(): Subscription;
}
```

#### Extraction Difficulty: **LOW**
- Self-contained event emitter pattern
- Standard pub/sub implementation
- Mouse handler has clear boundaries

#### TypeScript Migration Difficulty: **LOW**
- Generic event types for type safety
- Standard DOM event type mappings
- Subscription interface well-defined

---

### 8. Geometry Utilities (`geometry/`) — EXTRACTED

**Source location**: q (~30), T (~60), A (~20), ft (~30), mt (~20), gt (~10) = ~170 lines

#### Functions Extracted
| Function | Purpose | Lines |
|----------|---------|-------|
| `q` | Price coordinate calculation with height offset | ~30 |
| `T` | Screen ↔ logical coordinate mapping | ~60 |
| `A` | Point-to-line-segment distance calculation | ~20 |
| `ft` | Point array conversion utility | ~30 |
| `mt` | Style property setter helper | ~20 |
| `gt` | Line segment intersection test | ~10 |

#### Estimated Line Range
- `coordinate-mapper.ts`: 70 lines (T function as class + q helper)
- `distance-calculator.ts`: 30 lines (A function)
- `line-intersection.ts`: 20 lines (gt function)
- `point-converter.ts`: 25 lines (ft function)
- `types.ts`: 40 lines (Point, LineSegment, LogicalPoint interfaces)

**Total**: ~185 lines

#### Dependencies
- Lightweight Charts API for coordinate conversion methods
- Chart timeScale and priceScale instances

#### Public Interfaces
```typescript
interface ICoordinateMapper {
  mapToBitmapCoordinate(point: LogicalPoint, chart: Chart, series: Series): BitmapPoint;
  mapToLogicalCoordinate(bitmap: BitmapPoint, chart: Chart, series: Series): LogicalPoint;
}

function calculateDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number;
function checkSegmentIntersection(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): boolean;
```

#### Extraction Difficulty: **LOW**
- Pure function extraction, no state management needed
- Each function is self-contained with clear inputs/outputs
- No cross-function dependencies within geometry module

#### TypeScript Migration Difficulty: **MEDIUM**
- Need precise coordinate type definitions from Lightweight Charts
- Generic point types for reusability
- Chart API contract types must be accurate

---

### 9. Template System (`templates/`) — EXTRACTED

**Source location**: ot class (~250 lines)

#### Classes Extracted
| Class | Purpose |
|-------|---------|
| `ot` | Tool template save/load with localStorage persistence |

#### Estimated Line Range
- `template-store.ts`: 120 lines (localStorage persistence layer)
- `template-export.ts`: 80 lines (export/serialization logic)
- `template-types.ts`: 30 lines (Template schema type definitions)

**Total**: ~230 lines

#### Dependencies
- localStorage API
- Tool serialization format (JSON structure matching tool data)
- Lightweight Charts series data for coordinate validation

#### Public Interfaces
```typescript
interface ITemplateStore {
  saveTemplate(id: string, template: ToolTemplate): boolean;
  loadTemplates(): Record<string, ToolTemplate>;
  removeTemplate(id: string): boolean;
  hasTemplate(id: string): boolean;
}

interface ToolTemplate {
  type: string;
  points: LineToolPoint[];
  options: ToolOptions;
  id?: string;
  name?: string;
}
```

#### Extraction Difficulty: **LOW**
- Self-contained module with clear API surface
- localStorage operations are standard
- Serialization logic is linear and straightforward

#### TypeScript Migration Difficulty: **LOW**
- Template schema types needed for type safety
- Generic template interface for different tool types
- Minimal external type dependencies

---

### 10. Navigation Controls (`navigation/`) — MP-UNIQUE

**Source location**: Oi class (~200 lines)

#### Classes Extracted
| Class | Purpose |
|-------|---------|
| `Oi` | Floating zoom/scroll navigation toolbar overlay |

#### Estimated Line Range
- `nav-toolbar.ts`: 150 lines (toolbar DOM creation and event binding)
- `nav-styles.ts`: 40 lines (navigation CSS template string)

**Total**: ~190 lines

#### Dependencies
- Lightweight Charts timeScale API (`getVisibleLogicalRange`, `setVisibleLogicalRange`, `scrollPosition`)
- CSS injection for toolbar styling
- DOM event handling for button interactions

#### Public Interfaces
```typescript
class NavigationToolbar {
  createControls(): void;
  removeControls(): void;
  setDefaultRange(range: TimeLogicalRange): void;
}
```

#### Extraction Difficulty: **LOW**
- Self-contained component with clear chart integration point
- Button event handlers are straightforward zoom/scroll operations
- CSS is isolated in template string

#### TypeScript Migration Difficulty: **LOW**
- Simple interface contracts with timeScale API
- Standard DOM event types for button handlers
- Time range type from Lightweight Charts

---

### 11. Callout System (`callouts/`) — MP-UNIQUE

**Source location**: Bi (~80 lines), Fi (~60 lines), zi (~50 lines) = ~190 lines

#### Classes Extracted
| Class | Purpose |
|-------|---------|
| `Bi` | Badge/callout source marker (indicates where tool was created) |
| `Fi` | Callout visual renderer for chart overlay |
| `zi` | Lightweight Charts PaneView integration for callouts |

#### Estimated Line Range
- `callout-marker.ts`: 60 lines (Bi class - badge creation/positioning)
- `callout-renderer.ts`: 70 lines (Fi class - visual rendering logic)
- `callout-view.ts`: 50 lines (zi class - PaneView integration stub)

**Total**: ~180 lines

#### Dependencies
- Lightweight Charts API (`createPaneWidthAwareView`, `PaneView`)
- CSS injection for badge styling
- Alert system for trigger association

#### Public Interfaces
```typescript
interface ICalloutMarker {
  attached({ chart, series }): void;
  detached(): void;
  setSource(tool: LineTool): void;
}

interface ICalloutRenderer {
  draw(context: RenderContext, position: LogicalPoint, text?: string): void;
  zOrder(): "top";
}
```

#### Extraction Difficulty: **LOW**
- Self-contained badge system with clear boundaries
- Simple PaneView integration pattern
- CSS isolated in template strings

#### TypeScript Migration Difficulty: **LOW**
- Simple interface contracts with Lightweight Charts types
- Standard DOM element creation patterns
- Minimal type dependencies

---

### 12. Alert Logic Utility (`dt/`) — MP-UNIQUE

**Source location**: dt class (~80 lines)

#### Classes Extracted
| Class | Purpose |
|-------|---------|
| `dt` | Static alert logic checker (checks if tool points trigger alerts) |

#### Estimated Line Range
- `alert-checker.ts`: 50 lines (dt static methods refactored)
- `price-at-logical.ts`: 20 lines (getPriceAtLogical helper extraction)

**Total**: ~70 lines

#### Dependencies
- Geometry utilities (coordinate mapping)
- Lightweight Charts API for OHLC bar access

#### Public Interfaces
```typescript
class AlertLogicChecker {
  static checkToolAlerts(tool: LineTool, series: Series): AlertTriggerEvent[];
}

function getPriceAtLogical(bar: OHLCBar, logicalY: number): number;
```

#### Extraction Difficulty: **LOW**
- Static methods, no state management needed
- Pure function extraction pattern

#### TypeScript Migration Difficulty: **LOW**
- Simple input/output types
- Standard OHLC bar type from Lightweight Charts

---

## Upstream Comparison Analysis

### Code Already in `lightweight-charts-line-tools-core` (libs/upstream/)

The upstream library provides the following as a modular plugin ecosystem:

| Upstream Component | MP Equivalent | Status |
|--------------------|---------------|--------|
| `createLineToolsPlugin()` | Full orchestrator in line-tools.js (lines ~4500–5200) | **MIGRATE AS-IS** — Core plugin factory is upstream-provided, only need to wrap it |
| Tool registry system | Tool registration logic | **MIGRATE AS-IS** — Standard upstream pattern |
| `LineToolType` enum | Tool type constants | **MIGRATE AS-IS** — Upstream exports this |
| Base tool wrappers (Rt, Vt, etc.) | Polyline/trend line base classes | **PARTIAL** — Extract wrapper logic only |
| Core coordinate mapping | T function in upstream | **KEEP REFERENCE** — Use upstream directly |
| Basic rendering primitives | si/li/ci/pi renderers in upstream | **MIGRATE AS-IS** — Upstream provides these |
| Event system (H class) | EventEmitter in upstream | **MIGRATE AS-IS** — Standard pattern |
| Style injection utilities | CSS injection helpers | **KEEP REFERENCE** — Use upstream version |

### Code Unique to MP Charts Toolkit

The following components are **unique additions** not found in upstream:

| MP-Unique Component | Location | Purpose |
|---------------------|----------|---------|
| Alert system (Li, Di, Ei, Hi) | alerts/ | Price crossing detection and notifications |
| Navigation toolbar (Oi) | navigation/ | Floating zoom controls overlay |
| Callout badges (Bi, Fi, zi) | callouts/ | Source location markers on chart |
| Long/Short position tool (Jt/Kt) | tools/long-short-position.ts | Trading PnL visualization |
| Price Range visualizer (Lt) | tools/price-range.ts | Vertical range overlay with labels |
| Template system (ot) | templates/ | Save/load tool configurations to localStorage |
| `dt` alert logic checker | dt/ | Static alert condition evaluation |

### Code Recommended for DELETION

The following code should **NOT** be migrated — it is either upstream-provided or redundant:

| Deleted Component | Reason |
|-------------------|--------|
| Duplicate coordinate mapping functions | Upstream provides `T` function directly |
| Inline CSS style constants (ii, ni, ai, ui, mi) | Can use upstream theme system or extract to styles/ as MP-specific overrides only |
| Full tool class implementations for Rt/Vt/Lt/pt | Only need wrapper adapters; base classes come from upstream |
| Redundant event emitter code | Upstream provides H class — use it directly |
| `mt` style helper function | Trivial utility, inline where needed or use standard DOM API |

---

## Migration Priority Matrix

| Priority | Subsystem | Reason |
|----------|-----------|--------|
| P0 | `types/`, `events/`, `geometry/types.ts` | Foundation types and utilities — no external dependencies |
| P1 | `styles/tool-styles.ts`, `dt/alert-checker.ts` | Simple constant/utility extraction, enables downstream modules |
| P2 | `templates/`, `navigation/`, `callouts/` | MP-unique but self-contained components |
| P3 | `dialogs/`, `geometry/*` | Required by renderers and tools |
| P4 | `renderers/*` | Core rendering — depends on geometry/types + styles |
| P5 | `primitives/*` | Depends on renderers for coordinate access |
| P6 | `tools/*` | Depends on all above subsystems |
| P7 | `alerts/` | Final integration layer — depends on tools + dialogs |

---

## Migration Strategy

### Phase 1: Foundation Types (P0–P1)
```
Create: types/tool-points.ts, types/tool-options.ts, events/event-emitter.ts,
        geometry/types.ts, styles/css-injector.ts, dt/alert-checker.ts
Reuse upstream: H class (event emitter), coordinate mapping reference
```

### Phase 2: MP-Unique Isolated Components (P2)
```
Create: templates/*, navigation/*, callouts/*
No dependencies on other extracted subsystems
Self-contained localStorage/DOM operations
```

### Phase 3: Core Rendering Pipeline (P3–P5)
```
Create: dialogs/*, renderers/*, primitives/*
Dependencies: geometry utilities + styles for coordinate mapping
Key challenge: bitmap ↔ media coordinate space switching
```

### Phase 4: Tool Classes (P6)
```
Create: tools/long-short-position.ts, tools/trend-line.ts,
        tools/price-range.ts, tools/fib-retracement.ts, tools/base-tool-wrapper.ts
Dependencies: ALL above subsystems
Most complex migration — requires integration testing
```

### Phase 5: Alert System (P7)
```
Create: alerts/alert-manager.ts, alerts/alert-model.ts,
        alerts/alert-dialog.ts, alerts/notifications.ts
Dependencies: tools/* for alert association + dialogs/* for edit UI
Final integration point with chart lifecycle management
```

---

## Rollout Order Summary

| Step | Action | Files Affected |
|------|--------|----------------|
| 1 | Create folder structure | — |
| 2 | Extract types and utilities | `types/`, `geometry/types.ts` |
| 3 | Extract event system | `events/event-emitter.ts` (reuse upstream H) |
| 4 | Extract geometry functions | `geometry/*` |
| 5 | Extract style constants | `styles/tool-styles.ts` |
| 6 | Extract CSS injector | `styles/css-injector.ts` |
| 7 | Create alert checker utility | `dt/alert-checker.ts` |
| 8 | Extract template system | `templates/*` |
| 9 | Extract navigation controls | `navigation/*` |
| 10 | Extract callout badges | `callouts/*` |
| 11 | Extract dialog system | `dialogs/*` |
| 12 | Extract renderers | `renderers/*` |
| 13 | Extract primitives | `primitives/*` |
| 14 | Extract tool classes | `tools/*` |
| 15 | Extract alert system | `alerts/*` |
| 16 | Create core orchestrator wrapper | `core/index.ts`, `core/plugin-factory.ts` |
| 17 | Wire up imports and verify build | All files |

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Coordinate space switching bugs in renderers | **HIGH** | Extensive visual regression testing per renderer |
| Hit-testing precision errors in tools | **HIGH** | Unit tests for distance/intersection calculations |
| Alert system lifecycle mismatches | **MEDIUM** | Careful PaneView detachment logic verification |
| Long/Short position tool PnL math errors | **MEDIUM** | Mathematical validation against known benchmarks |
| Upstream API compatibility breaks | **LOW** | Pin upstream version, maintain reference copy |

---

## Conclusion

This decomposition plan splits the 6,495-line monolithic `line-tools.js` into:

- **12 distinct subsystems** across ~10 target folders
- **~6,138 lines** of extractable code organized as reusable modules
- **~357 lines** recommended for deletion (upstream-provided or redundant)
- **11 MP-UNIQUE components**: alerts, navigation, callouts, dt checker, long-short tool, price-range visualizer, template system
- **Multiple upstream-provided components** to reuse as-is from `libs/upstream/lightweight-charts-line-tools-core`

The phased migration approach (P0→P7) ensures foundational types and utilities are established before complex rendering and tool logic, minimizing integration risk. Each subsystem has well-defined public interfaces that can be implemented and tested independently once downstream dependencies are in place.
