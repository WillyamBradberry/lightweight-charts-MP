// /src/core-plugin.ts

import {
IChartApiBase,
ISeriesApi,
SeriesType,
IHorzScaleBehavior,
Coordinate,
ISeriesPrimitive,
SeriesAttachedParameter,
PrimitiveHoveredItem
} from 'lightweight-charts';

import { createDummyPluginApi } from './api/dummy-api';

import {
ILineToolsApi,
LineToolExport,
LineToolPoint,
LineToolsAfterEditEventHandler,
LineToolsDoubleClickEventHandler,
LineToolsSingleClickEventHandler,
} from './api/public-api';
import { LineToolPartialOptionsMap, LineToolType, ITimeAxisView, IPriceAxisView, IPaneView } from './types';
import { BaseLineTool } from './model/base-line-tool';
import { ToolRegistry } from './model/tool-registry';
import { InteractionManager } from './interaction/interaction-manager';
import { PriceAxisLabelStackingManager } from './model/price-axis-label-stacking-manager';
import { CrosshairTimeAxisLabelView } from './views/crosshair-time-axis-label-view';

import { PaneLayout, ChartLayoutSnapshot, measurePaneLayouts } from './utils/layout-measurement';
import { EventBus } from './events/event-bus';
import { ToolLifecycleController } from './controller/tool-lifecycle';
import { ToolSerializationController } from './controller/tool-serialization';
import { SeriesDataController } from './controller/series-data';
import { CrosshairControls } from './controller/crosshair-controls';

// Re-exported here so index.ts's `export { PaneLayout, ChartLayoutSnapshot } from './core-plugin'` keeps working (public surface unchanged).
export { PaneLayout, ChartLayoutSnapshot } from './utils/layout-measurement';

/**
 * The main implementation of the Line Tools Core Plugin.
 *
 * This class acts as the central controller for adding, managing, and interacting with line tools
 * on a Lightweight Chart. It coordinates between the chart's API, the series, and the internal
 * interaction manager. Its concrete logic is split into composition collaborators
 * (see ./controller and ./events) and pure helpers (see ./utils/layout-measurement); this file
 * keeps the public `ILineToolsApi` / `ISeriesPrimitive` surface as thin delegates.
 *
 * @typeParam HorzScaleItem - The horizontal scale item type (e.g. `Time`, `UTCTimestamp`, or `number`).
 */
export class LineToolsCorePlugin<HorzScaleItem> implements ILineToolsApi, ISeriesPrimitive<HorzScaleItem> {
private readonly _chart: IChartApiBase<HorzScaleItem>;
private readonly _series: ISeriesApi<SeriesType, HorzScaleItem>;
private readonly _horzScaleBehavior: IHorzScaleBehavior<HorzScaleItem>;

private _tools: Map<string, BaseLineTool<HorzScaleItem>> = new Map();
private readonly _toolRegistry: ToolRegistry<HorzScaleItem>;
private readonly _interactionManager: InteractionManager<HorzScaleItem>;
private _priceAxisLabelStackingManager: PriceAxisLabelStackingManager<HorzScaleItem> | null = null;
private readonly _crosshairTimeView: CrosshairTimeAxisLabelView<HorzScaleItem>;

// Composition collaborators (delegation targets)
private readonly _eventBus: EventBus<HorzScaleItem>;
private readonly _seriesData: SeriesDataController<HorzScaleItem>;
private readonly _toolLifecycle: ToolLifecycleController<HorzScaleItem>;
private readonly _toolSerialization: ToolSerializationController<HorzScaleItem>;
private readonly _crosshairControls: CrosshairControls<HorzScaleItem>;

private _layoutSnapshot: ChartLayoutSnapshot | null = null;
private _stackingUpdateScheduled: boolean = false;
private _isDestroyed: boolean = false;

public constructor(
chart: IChartApiBase<HorzScaleItem>,
series: ISeriesApi<SeriesType, HorzScaleItem>,
horzScaleBehavior: IHorzScaleBehavior<HorzScaleItem>,
) {
this._chart = chart;
this._series = series;
this._horzScaleBehavior = horzScaleBehavior;
this._toolRegistry = new ToolRegistry<HorzScaleItem>();
this._interactionManager = new InteractionManager<HorzScaleItem>(this, this._chart, this._series, this._tools, this._toolRegistry);

// Initialize the supplemental crosshair view
this._crosshairTimeView = new CrosshairTimeAxisLabelView<HorzScaleItem>(this._chart);

// Wire the composition collaborators
this._eventBus = new EventBus<HorzScaleItem>();
this._seriesData = new SeriesDataController<HorzScaleItem>(this._chart, this._series, this._horzScaleBehavior);
this._toolLifecycle = new ToolLifecycleController<HorzScaleItem>(this, this._chart, this._series, this._horzScaleBehavior, this._tools, this._toolRegistry, this._interactionManager);
this._toolSerialization = new ToolSerializationController<HorzScaleItem>(this, this._tools, this._series, this._chart);
this._crosshairControls = new CrosshairControls<HorzScaleItem>(this._chart, this._series, this._interactionManager, this._crosshairTimeView);

// Attach the plugin itself to the series as a primitive so its views are rendered
this._series.attachPrimitive(this);

console.log('Line Tools Core Plugin initialized.');
}

/**
 * Retrieves a unified layout snapshot of the entire chart, caching it for ~1 frame.
 * The DOM measurement itself is delegated to the pure {@link measurePaneLayouts} helper.
 */
public getLayout(): ChartLayoutSnapshot {
const now = performance.now();

// If the snapshot is fresh (less than ~1 frame old), return it immediately.
if (this._layoutSnapshot && (now - this._layoutSnapshot.timestamp < 100)) {
return this._layoutSnapshot;
}

const chartElement = this._chart.chartElement();
const chartRect = chartElement.getBoundingClientRect();

// Use LWC native width (the most accurate for excluding price axis)
const drawingWidth = this._chart.paneSize().width;

const snapshot: ChartLayoutSnapshot = {
timestamp: now,
width: drawingWidth,
panes: measurePaneLayouts(this._chart, chartRect),
};

this._layoutSnapshot = snapshot;
return snapshot;
}

/**
 * Requests a redraw of the chart by applying empty options.
 * @internal
 */
public requestUpdate(): void {
this._crosshairControls.requestUpdate();
}

/**
 * Registers a custom line tool class with the plugin's registry.
 */
public registerLineTool(type: LineToolType, toolClass: new (...args: any[]) => BaseLineTool<HorzScaleItem>): void {
this._toolRegistry.registerTool(type, toolClass);
console.log(`Registered line tool: ${type}`);
}

// #region ILineToolsApi Implementation

// --- Tool lifecycle ---
public addLineTool<T extends LineToolType>(type: T, points?: LineToolPoint[] | null, options?: LineToolPartialOptionsMap[T] | undefined): string {
return this._toolLifecycle.addLineTool(type, points, options);
}

public createOrUpdateLineTool<T extends LineToolType>(type: T, points: LineToolPoint[], options: LineToolPartialOptionsMap[T], id: string): void {
this._toolLifecycle.createOrUpdateLineTool(type, points, options, id);
}

public removeLineToolsById(ids: string[]): void {
this._toolLifecycle.removeLineToolsById(ids);
}

public removeLineToolsByIdRegex(regex: RegExp): void {
this._toolLifecycle.removeLineToolsByIdRegex(regex);
}

public removeSelectedLineTools(): void {
this._toolLifecycle.removeSelectedLineTools();
}

public removeAllLineTools(): void {
this._toolLifecycle.removeAllLineTools();
}

// --- Tool queries / serialization ---
public getSelectedLineTools(): string {
return this._toolSerialization.getSelectedLineTools();
}

public getLineToolByID(id: string): string {
return this._toolSerialization.getLineToolByID(id);
}

public getLineToolsByIdRegex(regex: RegExp): string {
return this._toolSerialization.getLineToolsByIdRegex(regex);
}

public applyLineToolOptions<T extends LineToolType>(toolData: LineToolExport<T>): boolean {
return this._toolSerialization.applyLineToolOptions(toolData);
}

public exportLineTools(): string {
return this._toolSerialization.exportLineTools();
}

public importLineTools(json: string): boolean {
return this._toolSerialization.importLineTools(json);
}

// --- Series data ---
public getDataInRange(range: { from: number | string; to: number | string }): any[] {
return this._seriesData.getDataInRange(range);
}

public getBarAtTime(time: number | string): any | null {
return this._seriesData.getBarAtTime(time);
}

public getClosestBar(time: number | string, mode: 'exact' | 'floor' | 'ceil' | 'nearest'): any | null {
return this._seriesData.getClosestBar(time, mode);
}

public getBarAtCoordinate(x: number): any | null {
return this._seriesData.getBarAtCoordinate(x);
}

public getEarliestBar(): any | null {
return this._seriesData.getEarliestBar();
}

public getLatestBar(): any | null {
return this._seriesData.getLatestBar();
}

public getFullTimeRange(): { from: any; to: any } | null {
return this._seriesData.getFullTimeRange();
}

// --- Events ---
public subscribeLineToolsDoubleClick(handler: LineToolsDoubleClickEventHandler): void {
this._eventBus.subscribeLineToolsDoubleClick(handler);
}

public unsubscribeLineToolsDoubleClick(handler: LineToolsDoubleClickEventHandler): void {
this._eventBus.unsubscribeLineToolsDoubleClick(handler);
}

public subscribeLineToolsAfterEdit(handler: LineToolsAfterEditEventHandler): void {
this._eventBus.subscribeLineToolsAfterEdit(handler);
}

public unsubscribeLineToolsAfterEdit(handler: LineToolsAfterEditEventHandler): void {
this._eventBus.unsubscribeLineToolsAfterEdit(handler);
}

public subscribeLineToolsSingleClick(handler: LineToolsSingleClickEventHandler): void {
this._eventBus.subscribeLineToolsSingleClick(handler);
}

public unsubscribeLineToolsSingleClick(handler: LineToolsSingleClickEventHandler): void {
this._eventBus.unsubscribeLineToolsSingleClick(handler);
}

// --- Crosshair / controls ---
public setCrossHairXY(x: number | null, y: number | null, visible: boolean, providedTime?: HorzScaleItem, providedPrice?: number): void {
this._crosshairControls.setCrossHairXY(x, y, visible, providedTime, providedPrice);
}

public clearCrossHair(): void {
this._crosshairControls.clearCrossHair();
}

public updateCrosshairTimeLabel(text: string, x: Coordinate, visible: boolean): void {
this._crosshairControls.updateCrosshairTimeLabel(text, x, visible);
}

public setMagnetThreshold(pixels: number): void {
this._crosshairControls.setMagnetThreshold(pixels);
}

public getMagnetThreshold(): number {
return this._crosshairControls.getMagnetThreshold();
}

public getLogicalPoint(x: number, y: number): LineToolPoint | null {
return this._crosshairControls.getLogicalPoint(x, y);
}

public setTimeFormatter(formatter: ((time: any) => string) | null): void {
this._crosshairControls.setTimeFormatter(formatter);
}

public getTimeFormatter(): ((time: any) => string) | null {
return this._crosshairControls.getTimeFormatter();
}

public setLocked(locked: boolean): void {
this._crosshairControls.setLocked(locked);
}

public isLocked(): boolean {
return this._crosshairControls.isLocked();
}

// #endregion

// --- Internal event triggers (called by InteractionManager / controllers) ---
public fireDoubleClickEvent(tool: BaseLineTool<HorzScaleItem>): void {
this._eventBus.fireDoubleClickEvent(tool);
}

public fireSingleClickEvent(tool: BaseLineTool<HorzScaleItem>, selectionState: 'selected' | 'deselected'): void {
this._eventBus.fireSingleClickEvent(tool, selectionState);
}

public fireAfterEditEvent(tool: BaseLineTool<HorzScaleItem>, stage: 'lineToolEdited' | 'pathFinished' | 'lineToolFinished'): void {
this._eventBus.fireAfterEditEvent(tool, stage);
	
}

public getPriceAxisLabelStackingManager(): PriceAxisLabelStackingManager<HorzScaleItem> {
		if (!this._priceAxisLabelStackingManager) {
			this._priceAxisLabelStackingManager = new PriceAxisLabelStackingManager<HorzScaleItem>(this._chart, this._series);
		}
		return this._priceAxisLabelStackingManager;
	}

// #region ISeriesPrimitive Implementation

public timeAxisViews(): readonly ITimeAxisView[] {
return [this._crosshairTimeView];
}

public zOrder(): 'top' | 'normal' | 'bottom' {
return 'top';
}

public priceAxisViews(): readonly IPriceAxisView[] {
return [];
}

public paneViews(): readonly IPaneView[] {
return [];
}

public hitTest(): PrimitiveHoveredItem | null {
return null;
}

public attached(param: SeriesAttachedParameter<HorzScaleItem>): void {
// Logic handled in constructor, but interface requires implementation
}

public detached(): void {
// Logic handled in constructor, but interface requires implementation
}

public updateAllViews(): void {
this._crosshairTimeView.update();
}

// #endregion

/**
 * Completely destroys the line tools plugin instance and cleans up all associated memory.
 * Orchestrates a full uninstall: removes tools, kills the interaction manager and event
 * delegates, detaches the primitive, self-neuters into a no-op dummy, and severs references.
 */
public destroy(): void {
if (this._isDestroyed) { return; }
console.log('[CorePlugin] Initiating logical destruction...');

// 1. Mark as destroyed immediately to prevent re-entry
this._isDestroyed = true;

// 2. Clean up all drawn tools (triggers their individual destroy methods)
this.removeAllLineTools();
this._tools.clear();

// 3. Kill the Interaction Manager (removes all listeners and severs its guts)
this._interactionManager.destroy();

// 4. Kill the event Delegates
this._eventBus.destroy();

// 5. Clean up the core plugin's primitive from the series (crosshair view)
try {
this._series.detachPrimitive(this);
} catch (e: any) {
// Fail silently if already detached or series is gone
}

// 6. SELF-NEUTERING: Transform into a Dummy
const dummyApi = createDummyPluginApi();
Object.keys(dummyApi).forEach((key) => {
const member = (dummyApi as any)[key];
if (typeof member === 'function') {
(this as any)[key] = member;
}
});

// 7. SEVER THE GUTS: release references for garbage collection
(this._chart as any) = null;
(this._series as any) = null;
(this._horzScaleBehavior as any) = null;
(this._priceAxisLabelStackingManager as any) = null;
(this._crosshairTimeView as any) = null;
(this._toolRegistry as any) = null;
(this._interactionManager as any) = null;
(this._eventBus as any) = null;
(this._seriesData as any) = null;
(this._toolLifecycle as any) = null;
(this._toolSerialization as any) = null;
(this._crosshairControls as any) = null;

console.log('[CorePlugin] Plugin has been fully uninstalled and destroyed.');
}
}
