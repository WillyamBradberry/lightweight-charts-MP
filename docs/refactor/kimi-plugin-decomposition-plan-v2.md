# Plugin Decomposition Plan v2 — MP Charts Toolkit

## Executive Summary

This plan replaces the current monolithic `line-tools.js` (v3.8 compiled bundle, 6,495 lines) with the **modular V5 plugin system** from `lightweight-charts-line-tools-core` (upstream), extending it with MP-unique subsystems (alerts, timer, theme engine, visual editor). The new architecture treats every feature — drawing tools, alerts, themes, data connections — as a first-class plugin managed by a central `PluginRegistry`.

**Why v2?** The original plan (v1) proposed manual decomposition of a minified bundle. Since the upstream source (`lightweight-charts-line-tools-core`) is already a modular V5 plugin orchestrator with 12 companion tool packages, v1's approach is **deprecated**. This plan focuses on **migration** to the upstream system and **extension** via a plugin architecture.

---

## Key Changes from v1

| Aspect | v1 (deprecated) | v2 (this plan) |
|--------|----------------|----------------|
| **Source** | Decompose minified `line-tools.js` line-by-line | Migrate to `lightweight-charts-line-tools-core` (modular upstream) |
| **LineToolManager** | Extract classes `W`, `bt`, `pt` manually | Use upstream `createLineToolsPlugin()` orchestrator |
| **Drawing tools** | Manual extraction into `tools/` folder | Use 12 upstream companion packages (already modular) |
| **Serialization** | ❌ Not addressed | ✅ Built-in `exportLineTools()` / `importLineTools()` from core |
| **Alerts** | Extract internal `Di` class directly | Wrap via `AlertAdapter` (already implemented) as a **plugin** |
| **Theme system** | Extract static CSS constants | Full `ThemeEngine` with runtime switching + CSS variables |
| **Visual editor** | ❌ Not addressed | `ConfigManager` + `VisualEditor` as config plugin |
| **Migration safety** | All-or-nothing rewrite | Feature flags: `USE_MODULAR_LINE_TOOLS` — gradual rollout |

---

## 1. Source Map (Where the Code Lives)

```
Upstream (libs/upstream/)
├── lightweight-charts/                    # TradingView v5.0.9 fork
│   └── Plugin API: attachPrimitive()
│
└── lightweight-charts-line-tools-core/    # difurious V5 core orchestrator
    ├── src/core/                          # Event bus, rendering pipeline, hit-test
    ├── src/serialization/                 # exportLineTools(), importLineTools()
    ├── src/crosshair/                     # setCrossHairXY(), clearCrossHair()
    └── src/events/                        # subscribeLineToolsAfterEdit(), etc.

Current (to be replaced)
└── src/plugins/line-tools/
    ├── line-tools.js      ← 6,495-line minified v3.8 bundle (DELETE)
    ├── line-tools.css     ← plugin CSS (migrate to theme system)
    ├── line-tools.d.ts    ← type re-exports (DELETE — use upstream types)
    └── package.json       ← dual export config (DELETE)

New Architecture
└── src/plugins/
    ├── core/               ← PluginRegistry, lifecycle management
    ├── line-tools-v5/      ← thin integration layer over upstream core
    ├── alerts/             ← AlertAdapter as first-class plugin
    ├── timer/              ← PriceScaleTimer as first-class plugin
    ├── theme/              ← ThemeEngine + CSS variable bridge
    ├── config/             ← ConfigManager + VisualEditor
    └── drawing-tools/      ← upstream companion packages + MP-unique tools
```

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HOST APPLICATION                                   │
│  (Trading page that embeds MP Charts Toolkit)                               │
│                                                                              │
│  <MPChartProvider config={...}>                                             │
│    <MPChartWorkspace />                                                     │
│  </MPChartProvider>                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                         PLUGIN REGISTRY (src/plugins/core/)                 │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   Feature    │  │    Theme     │  │  Connection  │  │    Config      │  │
│  │   Plugins    │  │    Plugin    │  │    Plugin    │  │    Plugin      │  │
│  │  (line-tools │  │(ThemeEngine  │  │(DataProvider │  │(ConfigManager +│  │
│  │   alerts,    │  │ + CSS vars)  │  │  Manager)    │  │ VisualEditor) │  │
│  │   timer)     │  │              │  │              │  │               │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                  │                  │                   │          │
│         └──────────────────┴──────────────────┴───────────────────┘          │
│                                   │                                          │
│                         ┌─────────▼──────────┐                              │
│                         │   PluginRegistry    │                              │
│                         │  - register()       │                              │
│                         │  - emitHook()       │                              │
│                         │  - lifecycle mgmt   │                              │
│                         └─────────┬──────────┘                              │
└───────────────────────────────────┼────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼────────────────────────────────────────┐
│                         SHELL LAYER (keep stable)                          │
│                                                                              │
│  Layout.jsx  Topbar.jsx  DrawingToolbar.jsx  BottomBar.jsx  Watchlist.jsx  │
│                                                                              │
│  Pattern: slot-based composition, callback-driven, imperative handle        │
└───────────────────────────────────┼────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────────┐
│                    LINE TOOLS V5 INTEGRATION LAYER                          │
│                   (src/plugins/line-tools-v5/)                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LineToolsV5Adapter                                                 │   │
│  │  ├─ wraps: createLineToolsPlugin(chart, series) from upstream core  │   │
│  │  ├─ registers: upstream companion packages (TrendLine, Fib, etc.)  │   │
│  │  ├─ provides: ToolAdapter public API                               │   │
│  │  ├─ exposes: exportLineTools() / importLineTools()                 │   │
│  │  └─ translates: old TOOL_MAP names → new plugin names              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Upstream Companion Packages (12 packages, 21 tools)               │   │
│  │                                                                     │   │
│  │  Standard Lines:   TrendLine, Ray, Arrow, ExtendedLine,           │   │
│  │                    HorizontalLine, HorizontalRay, VerticalLine,    │   │
│  │                    CrossLine, Callout                               │   │
│  │  Freehand:         Brush, Highlighter                               │   │
│  │  Shapes:           Rectangle, Circle, Triangle, Path                │   │
│  │  Fibonacci:        FibRetracement                                   │   │
│  │  Advanced:         ParallelChannel, PriceRange, LongShortPosition   │   │
│  │  Text:             Text                                             │   │
│  │  Data:             MarketDepth                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  MP-Unique Tool Plugins (custom additions)                         │   │
│  │                                                                     │   │
│  │  Pattern: each extends upstream BaseTool, registers with core      │   │
│  │                                                                     │   │
│  │  • ABCD / XABCD pattern tools        ( migrate from v3.8 )        │   │
│  │  • Elliott Impulse / Correction Wave ( migrate from v3.8 )        │   │
│  │  • Head and Shoulders                ( migrate from v3.8 )        │   │
│  │  • Date Range / Date+Price Range     ( migrate from v3.8 )        │   │
│  │  • Measure tool                      ( migrate from v3.8 )        │   │
│  │  • Price Label                       ( migrate from v3.8 )        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────────┐
│                      MP-UNIQUE PLUGIN SUBSYSTEMS                            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ALERTS PLUGIN (src/plugins/alerts/)                                │   │
│  │                                                                     │   │
│  │  Components:                                                        │   │
│  │  • AlertAdapter          ← ALREADY IMPLEMENTED (keep)              │   │
│  │  • AlertBridge           ← unified IAlertService interface          │   │
│  │  • AlertThemeController  ← alert line/icon colors via ThemeEngine   │   │
│  │  • PriceAlertPrimitive   ← LC series primitive for visual markers  │   │
│  │                                                                     │   │
│  │  NOT extracted from Di/Li directly. Instead:                       │   │
│  │  1. Upstream core provides primitive lifecycle (attach/detach)     │   │
│  │  2. AlertAdapter wraps _userPriceAlerts (single point of change)   │   │
│  │  3. AlertBridge provides IAlertService to host                      │   │
│  │                                                                     │   │
│  │  Future: contribute public Alert API to upstream core fork         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TIMER PLUGIN (src/plugins/timer/)                                  │   │
│  │                                                                     │   │
│  │  Components:                                                        │   │
│  │  • TimerAdapter         ← wraps PriceScaleTimer                    │   │
│  │  • TimerThemeController ← text color via ThemeEngine                │   │
│  │  • CandleCountdown      ← LC pane primitive for countdown display  │   │
│  │                                                                     │   │
│  │  Note: PriceScaleTimer is a separate export from old bundle.       │   │
│  │  In v5, reimplement as a proper series primitive.                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  THEME PLUGIN (src/plugins/theme/)                                  │   │
│  │                                                                     │   │
│  │  Components:                                                        │   │
│  │  • ThemeEngine          ← runtime theme switching                   │   │
│  │  • CSSVariableBridge    ← React UI ↔ CSS custom properties          │   │
│  │  • ChartThemeApplier    ← chart.applyOptions() integration          │   │
│  │  • ToolThemeApplier     ← applyOptions() for drawing tools          │   │
│  │  • AlertThemeApplier    ← alert style injection                     │   │
│  │                                                                     │   │
│  │  Provides:                                                          │   │
│  │  • getValue(path) — theme value resolution with overrides           │   │
│  │  • activateTheme(id, overrides) — apply to all layers              │   │
│  │  • registerTheme(id, definition) — add custom themes                │   │
│  │                                                                     │   │
│  │  Theme layers (all driven by one definition):                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │  Chart   │  │  Tools   │  │  Alerts  │  │    UI    │            │   │
│  │  │ (canvas) │  │ (canvas) │  │ (canvas) │  │  (DOM)   │            │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CONFIG / VISUAL EDITOR PLUGIN (src/plugins/config/)                │   │
│  │                                                                     │   │
│  │  Components:                                                        │   │
│  │  • ConfigManager        ← schema validation, persistence            │   │
│  │  • VisualEditor         ← React component for UI editing            │   │
│  │  • editorSchema.js      ← feature/style/behavior definitions        │   │
│  │  • export/import        ← JSON, URL param, file download            │   │
│  │                                                                     │   │
│  │  Editable dimensions:                                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   Features   │  │   Styles     │  │  Behaviors   │              │   │
│  │  │              │  │              │  │              │              │   │
│  │  │ Toggle tools │  │ Color picker │  │ Magnet mode  │              │   │
│  │  │ Enable alerts│  │ Line widths  │  │ Auto-save    │              │   │
│  │  │ Show timer   │  │ Dash styles  │  │ Theme switch │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Plugin Registry (src/plugins/core/)

The central hub for all plugin lifecycle management.

```typescript
// core/PluginRegistry.ts
export class PluginRegistry {
  private _plugins = new Map<string, PluginEntry>();
  private _hooks = new Map<string, Set<HookHandler>>();
  private _context: PluginContext;

  constructor(chart: IChartApi, series: ISeriesApi<SeriesType>) {
    this._context = { chart, series, registry: this };
  }

  // Register a plugin with config
  register<TConfig>(
    id: string,
    factory: PluginFactory<TConfig>,
    config?: TConfig
  ): PluginHandle {
    const plugin = factory.create(this._context, config);
    this._plugins.set(id, { instance: plugin, config, status: 'active' });

    // Lifecycle: init
    if (plugin.init) plugin.init();

    return {
      id,
      destroy: () => this.unregister(id),
      getApi: () => plugin.api,
    };
  }

  // Cross-plugin communication
  onHook(hookName: string, handler: HookHandler): () => void {
    if (!this._hooks.has(hookName)) {
      this._hooks.set(hookName, new Set());
    }
    this._hooks.get(hookName)!.add(handler);
    return () => this._hooks.get(hookName)?.delete(handler);
  }

  emitHook(hookName: string, payload?: unknown): void {
    this._hooks.get(hookName)?.forEach((h) => h(payload));
  }

  // Cleanup
  unregister(id: string): void {
    const entry = this._plugins.get(id);
    if (entry?.instance.destroy) entry.instance.destroy();
    this._plugins.delete(id);
  }

  destroy(): void {
    this._plugins.forEach((_, id) => this.unregister(id));
  }
}

// Each plugin implements:
export interface Plugin<TApi> {
  id: string;
  metadata: PluginMetadata;
  init?(): void;
  destroy?(): void;
  api: TApi;
}
```

---

## 4. Line Tools V5 Integration (src/plugins/line-tools-v5/)

### 4.1 Adapter Pattern

```typescript
// line-tools-v5/LineToolsV5Adapter.ts
export class LineToolsV5Adapter {
  private _core: LineToolsPlugin;
  private _toolAdapter: ToolAdapter;
  private _serializer: DrawingSerializer;

  constructor(chart: IChartApi, series: ISeriesApi<SeriesType>) {
    // Initialize upstream core orchestrator
    this._core = createLineToolsPlugin(chart, series);

    // Register upstream companion packages (21 tools from 12 packages)
    this._registerUpstreamTools();

    // Register MP-unique migrated tools
    this._registerMPUniqueTools();

    this._toolAdapter = new ToolAdapter(this._core);
    this._serializer = new DrawingSerializer(this._core);
  }

  private _registerUpstreamTools(): void {
    // Standard Lines (from upstream packages)
    this._core.registerLineTool('TrendLine', LineToolTrendLine);
    this._core.registerLineTool('Ray', LineToolRay);
    this._core.registerLineTool('Arrow', LineToolArrow);
    this._core.registerLineTool('ExtendedLine', LineToolExtendedLine);
    this._core.registerLineTool('HorizontalLine', LineToolHorizontalLine);
    this._core.registerLineTool('HorizontalRay', LineToolHorizontalRay);
    this._core.registerLineTool('VerticalLine', LineToolVerticalLine);
    this._core.registerLineTool('CrossLine', LineToolCrossLine);
    this._core.registerLineTool('Callout', LineToolCallout);

    // Freehand
    this._core.registerLineTool('Brush', LineToolBrush);
    this._core.registerLineTool('Highlighter', LineToolHighlighter);

    // Shapes
    this._core.registerLineTool('Rectangle', LineToolRectangle);
    this._core.registerLineTool('Circle', LineToolCircle);
    this._core.registerLineTool('Triangle', LineToolTriangle);
    this._core.registerLineTool('Path', LineToolPath);

    // Advanced
    this._core.registerLineTool('ParallelChannel', LineToolParallelChannel);
    this._core.registerLineTool('FibRetracement', LineToolFibRetracement);
    this._core.registerLineTool('PriceRange', LineToolPriceRange);
    this._core.registerLineTool('LongShortPosition', LineToolLongShortPosition);

    // Text & Data
    this._core.registerLineTool('Text', LineToolText);
    this._core.registerLineTool('MarketDepth', LineToolMarketDepth);
  }

  private _registerMPUniqueTools(): void {
    // Tools not in upstream — migrated from v3.8 bundle
    this._core.registerLineTool('ABCD', LineToolABCD);
    this._core.registerLineTool('XABCD', LineToolXABCD);
    this._core.registerLineTool('ElliottImpulseWave', LineToolElliottImpulse);
    this._core.registerLineTool('ElliottCorrectionWave', LineToolElliottCorrection);
    this._core.registerLineTool('HeadAndShoulders', LineToolHeadAndShoulders);
    this._core.registerLineTool('DateRange', LineToolDateRange);
    this._core.registerLineTool('DatePriceRange', LineToolDatePriceRange);
    this._core.registerLineTool('Measure', LineToolMeasure);
    this._core.registerLineTool('PriceLabel', LineToolPriceLabel);
  }

  // Public API
  activateTool(name: string): void { this._core.addLineTool(name); }
  undo(): void { /* via core history */ }
  redo(): void { /* via core history */ }
  clearAll(): void { this._core.removeAllLineTools(); }
  lockAll(): void { /* via core options */ }
  hideAll(): void { /* via core options */ }
  exportDrawings(): string { return this._serializer.export(); }
  importDrawings(json: string): void { this._serializer.import(json); }
}
```

### 4.2 Drawing Serializer (uses upstream API)

```typescript
// line-tools-v5/DrawingSerializer.ts
export class DrawingSerializer {
  constructor(private _core: LineToolsPlugin) {}

  export(): string {
    // ✅ Built-in upstream API — no private property access
    return this._core.exportLineTools();
  }

  import(json: string): void {
    // ✅ Non-destructive: compounds on existing (upstream behavior)
    // To replace: clear first, then import
    this._core.importLineTools(json);
  }

  // For auto-save integration
  exportSelected(): string {
    return JSON.stringify(this._core.getSelectedLineTools());
  }

  removeById(ids: string[]): void {
    this._core.removeLineToolsById(ids);
  }
}
```

### 4.3 TOOL_MAP Compatibility Layer

```typescript
// constants/toolMap.ts — updated for v5
// Old v3.8 names → New v5 plugin names
export const TOOL_MAP_V3_TO_V5: Record<string, string> = {
  'cursor':          '',                          // handled by shell
  'eraser':          '',                          // use removeSelectedLineTools
  'trendline':       'TrendLine',
  'arrow':           'Arrow',
  'ray':             'Ray',
  'extended_line':   'ExtendedLine',
  'horizontal':      'HorizontalLine',
  'horizontal_ray':  'HorizontalRay',
  'vertical':        'VerticalLine',
  'cross_line':      'CrossLine',
  'parallel_channel':'ParallelChannel',
  'fibonacci':       'FibRetracement',
  'fib_extension':   '',                          // not yet in upstream
  'pitchfork':       '',                          // not yet in upstream
  'brush':           'Brush',
  'highlighter':     'Highlighter',
  'rectangle':       'Rectangle',
  'circle':          'Circle',
  'path':            'Path',
  'text':            'Text',
  'callout':         'Callout',
  'price_label':     'PriceLabel',
  'pattern':         '',                          // generic — not in upstream
  'triangle':        'Triangle',
  'abcd':            'ABCD',
  'xabcd':           'XABCD',
  'elliott_impulse': 'ElliottImpulseWave',
  'elliott_correction': 'ElliottCorrectionWave',
  'head_and_shoulders': 'HeadAndShoulders',
  'prediction':      'LongShortPosition',         // Long position
  'prediction_short':'LongShortPosition',         // Short position (same tool, different options)
  'date_range':      'DateRange',
  'price_range':     'PriceRange',
  'date_price_range':'DatePriceRange',
  'measure':         'Measure',
};

// Reverse map for event translation
export const TOOL_MAP_V5_TO_V3: Record<string, string> =
  Object.fromEntries(
    Object.entries(TOOL_MAP_V3_TO_V5)
      .filter(([, v]) => v !== '')
      .map(([k, v]) => [v, k])
  );
```

---

## 5. Alerts Plugin (src/plugins/alerts/)

### Strategy: Keep AlertAdapter, add Theme + Bridge

```
v1 approach (REJECTED):          v2 approach (THIS PLAN):
┌──────────────────────┐        ┌──────────────────────────────────────┐
│ Extract Di class      │        │ Use existing AlertAdapter.js          │
│ directly from bundle  │        │ (already isolates private API)        │
│ → fragile, breaks     │        │ → single point of change              │
│   on rebuild          │        │                                       │
└──────────────────────┘        │ Add:                                  │
                                │ • AlertBridge (IAlertService)         │
                                │ • AlertThemeController                 │
                                │ • PriceAlertPrimitive (LC v5 native)  │
                                │                                       │
                                │ Future: fork upstream core,            │
                                │ add public alert API                   │
                                └──────────────────────────────────────┘
```

```typescript
// alerts/AlertBridge.ts
export interface IAlertService {
  create(price: number, condition: AlertCondition): AlertId;
  remove(id: AlertId): void;
  pause(id: AlertId): void;
  resume(id: AlertId, price: number, condition: AlertCondition): void;
  getAll(): AlertData[];
  setSymbol(symbol: string): void;
  onChange(callback: (alerts: AlertData[]) => void): Unsubscribe;
  onTrigger(callback: (event: AlertTriggerEvent) => void): Unsubscribe;
}

// alerts/AlertThemeController.ts
export class AlertThemeController {
  constructor(private _themeEngine: ThemeEngine) {}

  applyStyles(): void {
    const alertLineColor = this._themeEngine.getValue('alerts.lineColor', '#131722');
    const iconBadgeColor = this._themeEngine.getValue('alerts.iconBadgeColor', '#131722');
    const hoverLabelBg   = this._themeEngine.getValue('alerts.hoverLabelBg', '#FFFFFF');
    // ... inject into alert renderer
  }
}
```

---

## 6. Timer Plugin (src/plugins/timer/)

Reimplement `PriceScaleTimer` as a proper LC v5 series primitive.

```typescript
// timer/TimerAdapter.ts
export class TimerAdapter implements Plugin<TimerApi> {
  id = 'timer';
  metadata = { name: 'Candle Countdown Timer', version: '2.0' };

  private _primitive: CandleCountdownPrimitive;
  private _options: TimerOptions;

  init(): void {
    this._primitive = new CandleCountdownPrimitive(this._options);
    this._context.series.attachPrimitive(this._primitive);
  }

  api: TimerApi = {
    show: () => this._primitive.setVisible(true),
    hide: () => this._primitive.setVisible(false),
    setInterval: (seconds: number) =>
      this._primitive.applyOptions({ timeframeSeconds: seconds }),
    updateCandle: (open: number, close: number) =>
      this._primitive.updateCandleData(open, close),
  };

  destroy(): void {
    this._context.series.detachPrimitive(this._primitive);
  }
}
```

---

## 7. Theme Plugin (src/plugins/theme/)

### 7.1 ThemeEngine

```typescript
// theme/ThemeEngine.ts
export class ThemeEngine implements Plugin<ThemeApi> {
  id = 'theme';
  metadata = { name: 'Theme Engine', version: '2.0' };

  private _themes = new Map<string, ThemeDefinition>();
  private _activeTheme: string | null = null;
  private _overrides = new Map<string, unknown>();

  // Register built-in themes
  init(): void {
    this.registerTheme('dark', DARK_THEME);
    this.registerTheme('light', LIGHT_THEME);
  }

  registerTheme(id: string, definition: ThemeDefinition): void {
    this._themes.set(id, definition);
  }

  activateTheme(id: string, overrides?: Record<string, unknown>): void {
    const theme = this._themes.get(id);
    if (!theme) throw new Error(`Theme ${id} not found`);

    this._activeTheme = id;
    if (overrides) {
      this._overrides = new Map(Object.entries(overrides));
    }

    // Emit to all subscribers
    this._context.registry.emitHook('theme:changed', {
      theme: this._mergeWithOverrides(theme),
      chartOptions: this._buildChartOptions(theme),
      toolDefaults: this._buildToolDefaults(theme),
      alertStyles: this._buildAlertStyles(theme),
      cssVariables: this._buildCSSVariables(theme),
    });
  }

  getValue<T>(path: string, fallback: T): T {
    const theme = this._themes.get(this._activeTheme!);
    if (!theme) return fallback;

    // Check overrides first
    if (this._overrides.has(path)) {
      return this._overrides.get(path) as T;
    }

    // Navigate path: 'alerts.lineColor'
    const parts = path.split('.');
    let value: unknown = theme;
    for (const part of parts) {
      value = (value as Record<string, unknown>)?.[part];
      if (value === undefined) break;
    }
    return (value as T) ?? fallback;
  }
}
```

### 7.2 CSS Variable Bridge

```css
/* theme/variables.css */
:root[data-theme="dark"] {
  --chart-bg: #131722;
  --chart-grid: #2A2E39;
  --chart-text: #D1D4DC;
  --chart-crosshair: #758696;
  --toolbar-bg: #1e222d;
  --toolbar-icon: #868993;
  --toolbar-active: #2962FF;
  --alert-line: #131722;
  --alert-badge: #131722;
  --alert-label-bg: #FFFFFF;
  --tool-default-color: #2962FF;
}

:root[data-theme="light"] {
  --chart-bg: #ffffff;
  --chart-grid: #e0e3eb;
  --chart-text: #131722;
  --chart-crosshair: #9598a1;
  --toolbar-bg: #f0f3fa;
  --toolbar-icon: #5a5a5a;
  --toolbar-active: #2962FF;
  --alert-line: #787b86;
  --alert-badge: #2962FF;
  --alert-label-bg: #f0f3fa;
  --tool-default-color: #2962FF;
}
```

---

## 8. Config / Visual Editor Plugin (src/plugins/config/)

### 8.1 Editor Schema

```typescript
// config/editorSchema.ts
export const editorSchema = {
  features: {
    drawingTools: {
      label: 'Drawing Tools',
      icon: 'Pencil',
      enabled: true,
      configurable: true,
      subFeatures: {
        trendLine:        { label: 'Trend Line',      enabled: true },
        ray:              { label: 'Ray',             enabled: true },
        arrow:            { label: 'Arrow',           enabled: true },
        horizontalLine:   { label: 'Horizontal Line', enabled: true },
        verticalLine:     { label: 'Vertical Line',   enabled: true },
        fibRetracement:   { label: 'Fibonacci',       enabled: true },
        rectangle:        { label: 'Rectangle',       enabled: true },
        circle:           { label: 'Circle',          enabled: true },
        triangle:         { label: 'Triangle',        enabled: true },
        text:             { label: 'Text',            enabled: true },
        brush:            { label: 'Brush',           enabled: true },
        parallelChannel:  { label: 'Parallel Channel',enabled: true },
        longShort:        { label: 'Long/Short Pos.', enabled: true },
        abcd:             { label: 'ABCD Pattern',    enabled: false },
        xabcd:            { label: 'XABCD Pattern',   enabled: false },
        elliott:          { label: 'Elliott Waves',   enabled: false },
        headAndShoulders: { label: 'Head & Shoulders',enabled: false },
        measure:          { label: 'Measure',         enabled: true },
      },
    },
    alerts: {
      label: 'Price Alerts',
      icon: 'Bell',
      enabled: true,
      configurable: true,
      options: {
        maxCount:       { type: 'number',  default: 50,  min: 1,   max: 200 },
        retentionHours: { type: 'number',  default: 24,  min: 1,   max: 168 },
        soundEnabled:   { type: 'boolean', default: true },
      },
    },
    timer: {
      label: 'Candle Timer',
      icon: 'Clock',
      enabled: true,
      configurable: false,
    },
    replay: {
      label: 'Bar Replay',
      icon: 'PlayCircle',
      enabled: true,
      configurable: true,
    },
    indicators: {
      label: 'Indicators',
      icon: 'Activity',
      enabled: true,
      configurable: true,
      subFeatures: {
        sma: { label: 'SMA', enabled: true, options: { period: 20 } },
        ema: { label: 'EMA', enabled: true, options: { period: 50 } },
      },
    },
    watchlist: {
      label: 'Watchlist',
      icon: 'List',
      enabled: true,
      configurable: false,
    },
  },

  styles: {
    chart: {
      background:     { type: 'color', default: '#131722' },
      gridLines:      { type: 'color', default: '#2A2E39' },
      textColor:      { type: 'color', default: '#D1D4DC' },
      crosshair:      { type: 'color', default: '#758696' },
    },
    tools: {
      defaultColor:   { type: 'color',  default: '#2962FF' },
      defaultWidth:   { type: 'range',  default: 2, min: 1, max: 10 },
      defaultStyle:   { type: 'select', default: 'solid', options: ['solid','dotted','dashed'] },
    },
    alerts: {
      lineColor:      { type: 'color', default: '#131722' },
      lineWidth:      { type: 'range', default: 1, min: 1, max: 5 },
      iconBadge:      { type: 'color', default: '#131722' },
      hoverLabelBg:   { type: 'color', default: '#FFFFFF' },
    },
  },

  behaviors: {
    magnetMode:       { type: 'boolean', default: false },
    autoSaveInterval: { type: 'select',  default: '30s', options: ['off','5s','30s','1m'] },
    confirmDelete:    { type: 'boolean', default: true },
    rightClickCancel: { type: 'boolean', default: true },
  },
};
```

### 8.2 ConfigManager

```typescript
// config/ConfigManager.ts
export class ConfigManager implements Plugin<ConfigApi> {
  id = 'config';
  metadata = { name: 'Configuration Manager', version: '1.0' };

  private _config: EditorConfig;
  private _schema = editorSchema;

  init(): void {
    this._config = this._load();
    this._applyToPlugins(this._config);
  }

  // Load from localStorage / API / file
  private _load(): EditorConfig {
    const saved = localStorage.getItem('mp_charts_config');
    if (saved) return { ...this._defaultConfig(), ...JSON.parse(saved) };
    return this._defaultConfig();
  }

  save(): void {
    localStorage.setItem('mp_charts_config', JSON.stringify(this._config));
  }

  // Export as JSON / URL / file
  export(format: 'json' | 'url' | 'file'): string {
    switch (format) {
      case 'json': return JSON.stringify(this._config, null, 2);
      case 'url':  return this._encodeToURL(this._config);
      case 'file': return this._downloadAsFile(this._config);
    }
  }

  // Apply a config change
  set(path: string, value: unknown): void {
    this._setPath(this._config, path, value);
    this._context.registry.emitHook('config:changed', { path, value });

    // If feature toggle: emit feature enable/disable
    if (path.startsWith('features.')) {
      const [, featureId, subPath] = path.split('.');
      if (subPath === 'enabled') {
        this._context.registry.emitHook(
          value ? `feature:${featureId}:enable` : `feature:${featureId}:disable`
        );
      }
    }
  }

  private _applyToPlugins(config: EditorConfig): void {
    // Enable/disable features
    for (const [id, feature] of Object.entries(config.features)) {
      const hook = feature.enabled ? `feature:${id}:enable` : `feature:${id}:disable`;
      this._context.registry.emitHook(hook, feature);
    }
    // Apply theme
    this._context.registry.emitHook('theme:apply', config.styles);
  }
}
```

### 8.3 VisualEditor Component

```tsx
// config/components/VisualEditor.tsx
export function VisualEditor({ config, schema, onChange }: VisualEditorProps) {
  const [activeTab, setActiveTab] = useState<'features' | 'styles' | 'behaviors'>('features');

  return (
    <div className={styles.editor}>
      <nav className={styles.tabs}>
        <TabButton active={activeTab === 'features'}  onClick={() => setActiveTab('features')}  icon="Layers"   label="Features" />
        <TabButton active={activeTab === 'styles'}    onClick={() => setActiveTab('styles')}    icon="Palette"  label="Styles" />
        <TabButton active={activeTab === 'behaviors'} onClick={() => setActiveTab('behaviors')} icon="Settings" label="Behaviors" />
      </nav>

      {activeTab === 'features'  && <FeaturePanel  schema={schema.features}  values={config.features}  onChange={onChange} />}
      {activeTab === 'styles'    && <StylePanel    schema={schema.styles}    values={config.styles}    onChange={onChange} />}
      {activeTab === 'behaviors' && <BehaviorPanel schema={schema.behaviors} values={config.behaviors} onChange={onChange} />}
    </div>
  );
}
```

---

## 9. Feature Flags & Gradual Migration

```typescript
// core/featureFlags.ts
export const FEATURE_FLAGS = {
  /**
   * Use new V5 modular line tools (lightweight-charts-line-tools-core)
   * instead of legacy v3.8 bundle (line-tools.js).
   *
   * When false: uses legacy line-tools.js (current behavior)
   * When true:  uses upstream modular system
   */
  USE_MODULAR_LINE_TOOLS: false,

  /**
   * Enable serialization API (export/import drawings).
   * Requires USE_MODULAR_LINE_TOOLS = true.
   */
  ENABLE_DRAWING_SERIALIZATION: false,

  /**
   * Use native V5 primitives for alerts instead of legacy adapter.
   */
  USE_NATIVE_ALERT_PRIMITIVES: false,

  /**
   * Enable visual config editor.
   */
  ENABLE_VISUAL_EDITOR: false,

  /**
   * Enable runtime theme switching (ThemeEngine).
   */
  ENABLE_RUNTIME_THEMES: false,

  /**
   * Use abstracted data provider instead of direct binance.js calls.
   */
  USE_DATA_PROVIDER_ABSTRACTION: false,
};

// Runtime checks
type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isEnabled(flag: FeatureFlag): boolean {
  // Check URL param override first
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has(`ff_${flag}`)) {
    return urlParams.get(`ff_${flag}`) === 'true';
  }
  // Check localStorage override
  const saved = localStorage.getItem(`ff_${flag}`);
  if (saved !== null) return saved === 'true';
  // Fallback to default
  return FEATURE_FLAGS[flag];
}
```

---

## 10. Migration Priority Matrix (Revised)

| Priority | Phase | Focus | Duration | Dependencies |
|----------|-------|-------|----------|--------------|
| **P0** | Foundation | `PluginRegistry` + `AlertAdapter` integration | 2-3 days | None |
| **P1** | Line Tools V5 | `LineToolsV5Adapter` + upstream core + companion packages | 4-5 days | P0 |
| **P2** | Serialization | `DrawingSerializer` using `exportLineTools()` / `importLineTools()` | 2-3 days | P1 |
| **P3** | Timer | `TimerAdapter` as V5 series primitive | 2 days | P0 |
| **P4** | Theme Engine | `ThemeEngine` + `CSSVariableBridge` + dark/light themes | 3-4 days | P0 |
| **P5** | MP-Unique Tools | Migrate ABCD, XABCD, Elliott, H&S, etc. to V5 base tool | 5-7 days | P1 |
| **P6** | Alerts V2 | `AlertBridge` + `AlertThemeController` + visual markers | 3-4 days | P0, P4 |
| **P7** | Config Plugin | `ConfigManager` + `editorSchema` + `VisualEditor` component | 4-5 days | P4 |
| **P8** | Data Provider | Abstract `binance.js` behind `DataProviderManager` | 3-4 days | None |
| **P9** | Integration | `MPChartProvider` + `MPChartWorkspace` public API | 3-4 days | P0-P7 |
| **P10** | Cleanup | Delete `line-tools.js`, `line-tools.d.ts`, legacy code | 2 days | P1-P6 |

---

## 11. Host Application Integration API

### Embed Mode (React)

```tsx
import { MPChartProvider, MPChartWorkspace } from '@mp/charts-toolkit';

function TradingPage() {
  return (
    <MPChartProvider
      config={{
        dataProvider: 'binance',
        symbol: 'BTCUSDT',
        interval: '1h',
        theme: 'dark',
        layout: '1',
        features: {
          drawingTools: { enabled: true, tools: ['TrendLine', 'FibRetracement', 'Rectangle'] },
          alerts: { enabled: true, maxCount: 50 },
          timer: { enabled: true },
          replay: { enabled: true },
          indicators: { enabled: true, sma: true, ema: false },
        },
        drawingDefaults: {
          lineColor: '#2962FF',
          width: 2,
        },
      }}
      onAlertTriggered={(event) => notifyUser(event)}
      onDrawingChanged={(drawings) => syncToBackend(drawings)}
    >
      <MPChartWorkspace />
    </MPChartProvider>
  );
}
```

### Headless Mode (Programmatic)

```typescript
import { ChartEngine } from '@mp/charts-toolkit/engine';

const engine = new ChartEngine(container, {
  symbol: 'BTCUSDT',
  interval: '1h',
  plugins: ['drawing-tools', 'alerts', 'timer'],
});

// Drawing tools
engine.tools.activate('TrendLine');
engine.tools.undo();
engine.tools.export();     // ✅ JSON string
engine.tools.import(json); // ✅ restore

// Alerts
const alertId = engine.alerts.create(45000, 'crossing_up');
engine.alerts.onTrigger((e) => console.log('Alert!', e));

// Theme
engine.theme.activate('dark', {
  'alerts.lineColor': '#FF0000',  // override
});

// Config editor
engine.config.openEditor(); // opens VisualEditor overlay
```

---

## 12. Files to Delete (Legacy Cleanup)

| File | Reason | Replacement |
|------|--------|-------------|
| `src/plugins/line-tools/line-tools.js` | v3.8 minified bundle | `lightweight-charts-line-tools-core` npm package |
| `src/plugins/line-tools/line-tools.d.ts` | Type re-exports of old bundle | Upstream TypeScript types |
| `src/plugins/line-tools/line-tools.css` | Old toolbar styles | ThemeEngine CSS variables |
| `src/plugins/line-tools/line-tools.umd.cjs` | Legacy CJS bundle | Upstream ESM exports |
| `src/plugins/line-tools/package.json` | Old package config | Root `package.json` dependencies |
| `src/utils/TemplateManager.js` | Dead code (unused in integration) | Upstream template system or ConfigManager |
| `window.lineToolManager` global | Debug leak | Proper `ChartEngine` API |
| `window.chartInstance` global | Debug leak | `getChartContainer()` via imperative handle |

---

## 13. What Stays Unchanged (Shell Stability)

The following shell components are **architecturally sound** and remain as-is:

| Component | Why Keep |
|-----------|----------|
| `Layout.jsx` (slot-based) | Clean composition pattern |
| `ChartGrid.jsx` (engine factory) | Correct multi-chart orchestration |
| `DrawingToolbar.jsx` (tool groups) | Excellent UX pattern — 40+ tools scale well |
| `RightToolbar.jsx` (panel switch) | Minimal, focused |
| `BottomBar.jsx` (status bar) | Simple presentational |
| `SymbolSearch.jsx` (multi-mode) | Switch/Compare/Add pattern is correct |
| `Toast.jsx` / `SnapshotToast.jsx` | Singleton pattern prevents pileup |
| `ReplayControls.jsx` / `ReplaySlider.jsx` | Sophisticated mode-based UX |
| `Watchlist.jsx` (drag/sort/resize) | TradingView-standard interactions |

---

## Summary: v1 vs v2 Decisions

| Decision | v1 | v2 |
|----------|-----|-----|
| **Decompose minified bundle?** | Yes, line-by-line | **No** — migrate to upstream modular system |
| **Extract internal Di class?** | Yes, directly | **No** — use `AlertAdapter` wrapper |
| **Drawing serialization?** | Not addressed | **Yes** — upstream `exportLineTools()` |
| **Theme system?** | Static constants | **Runtime ThemeEngine** with CSS variables |
| **Visual editor?** | Not addressed | **ConfigManager + VisualEditor** |
| **Migration strategy?** | All-or-nothing | **Feature flags** (`USE_MODULAR_LINE_TOOLS`) |
| **Upstream source?** | N/A (working with compiled output) | **Use `lightweight-charts-line-tools-core`** from `libs/upstream/` |
| **Tool packages?** | Extract into flat `tools/` folder | **Use 12 upstream companion packages** + migrate MP-unique tools |
| **Timer?** | Not addressed | **Reimplement as V5 series primitive** |
| **Navigation (Oi class)?** | Extract to `navigation/` | **Delete** — use existing `BottomBar` + `DrawingToolbar` |
