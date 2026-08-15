// /src/controller/tool-lifecycle.ts

import { IChartApiBase, IHorzScaleBehavior, ISeriesApi, SeriesType } from 'lightweight-charts';
import type { LineToolsCorePlugin } from '../core-plugin';
import type { BaseLineTool } from '../model/base-line-tool';
import type { ToolRegistry } from '../model/tool-registry';
import type { InteractionManager } from '../interaction/interaction-manager';
import { LineToolType, LineToolPartialOptionsMap } from '../types';
import { LineToolPoint } from '../api/public-api';
import { roundPriceToStep } from '../utils/helpers';

/**
 * Manages the full lifecycle of line tools: creation, updating, and removal.
 *
 * The core plugin delegates its public add/remove/createOrUpdate methods here.
 * State ownership (the tools map, registry, and interaction manager) is shared
 * with the plugin via constructor references. The plugin instance is passed so
 * newly-created tools receive it as their `coreApi`.
 */
export class ToolLifecycleController<HorzScaleItem> {
	private readonly _plugin: LineToolsCorePlugin<HorzScaleItem>;
	private readonly _chart: IChartApiBase<HorzScaleItem>;
	private readonly _series: ISeriesApi<SeriesType, HorzScaleItem>;
	private readonly _horzScaleBehavior: IHorzScaleBehavior<HorzScaleItem>;
	private readonly _tools: Map<string, BaseLineTool<HorzScaleItem>>;
	private readonly _toolRegistry: ToolRegistry<HorzScaleItem>;
	private readonly _interactionManager: InteractionManager<HorzScaleItem>;

	public constructor(
		plugin: LineToolsCorePlugin<HorzScaleItem>,
		chart: IChartApiBase<HorzScaleItem>,
		series: ISeriesApi<SeriesType, HorzScaleItem>,
		horzScaleBehavior: IHorzScaleBehavior<HorzScaleItem>,
		tools: Map<string, BaseLineTool<HorzScaleItem>>,
		toolRegistry: ToolRegistry<HorzScaleItem>,
		interactionManager: InteractionManager<HorzScaleItem>,
	) {
		this._plugin = plugin;
		this._chart = chart;
		this._series = series;
		this._horzScaleBehavior = horzScaleBehavior;
		this._tools = tools;
		this._toolRegistry = toolRegistry;
		this._interactionManager = interactionManager;
	}

	public addLineTool<T extends LineToolType>(type: T, points?: LineToolPoint[] | null, options?: LineToolPartialOptionsMap[T] | undefined): string {
		try {
			// Empty/missing points signal interactive creation.
			const initiateInteractive = (points === null || points === undefined || points.length === 0);
			const tool = this._createAndAddTool(type, points || [], options, undefined, initiateInteractive);
			return tool.id();
		} catch (e: any) {
			console.error(e.message);
			return '';
		}
	}

	public createOrUpdateLineTool<T extends LineToolType>(type: T, points: LineToolPoint[], options: LineToolPartialOptionsMap[T], id: string): void {
		const existingTool = this._tools.get(id);
		if (existingTool) {
			// Update existing tool
			existingTool.setPoints(points);
			existingTool.applyOptions(options);
		} else {
			// Create new tool with specified ID
			try {
				this._createAndAddTool(type, points, options, id);
			} catch (e: any) {
				console.error(e.message);
			}
		}
	}

	public removeLineToolsById(ids: string[]): void {
		let needsUpdate = false;
		ids.forEach(id => {
			const tool = this._tools.get(id);
			if (tool) {
				this._interactionManager.detachTool(tool); // DETACH FROM LWCHARTS FIRST
				tool.destroy(); // Then call internal cleanup
				this._tools.delete(id); // Then remove from the map
				needsUpdate = true;
			}
		});
		if (needsUpdate) {
			this._chart.applyOptions({}); // Trigger a chart update
		}
	}

	public removeLineToolsByIdRegex(regex: RegExp): void {
		const idsToRemove: string[] = [];
		this._tools.forEach(tool => {
			if (regex.test(tool.id())) {
				idsToRemove.push(tool.id());
			}
		});
		if (idsToRemove.length > 0) {
			this.removeLineToolsById(idsToRemove);
		}
	}

	public removeSelectedLineTools(): void {
		const selectedIds: string[] = [];
		this._tools.forEach(tool => {
			if (tool.isSelected()) {
				selectedIds.push(tool.id());
			}
		});
		if (selectedIds.length > 0) {
			this.removeLineToolsById(selectedIds);
		}
	}

	public removeAllLineTools(): void {
		const allIds = Array.from(this._tools.keys());
		if (allIds.length > 0) {
			this.removeLineToolsById(allIds);
		}
		console.log(`[CorePlugin] All tools removed. Final total tool count: ${this._tools.size}`);
	}

	/**
	 * Internal factory method to instantiate and register a new tool, including
	 * registry checks, point rounding/sanitization, primitive attachment, and
	 * optional interactive-creation setup.
	 */
	private _createAndAddTool<T extends LineToolType>(
		type: T,
		points: LineToolPoint[],
		options?: LineToolPartialOptionsMap[T],
		id?: string,
		initiateInteractive: boolean = false
	): BaseLineTool<HorzScaleItem> {
		if (!this._toolRegistry.isRegistered(type)) {
			throw new Error(`Cannot create tool: Line tool type "${type}" is not registered.`);
		}

		if (initiateInteractive) {
			this._interactionManager.deselectAllTools();
		}

		const ToolClass = this._toolRegistry.getToolClass(type);

		// --- ROUNDING INJECTION: Sanitize untrusted external point data ---
		const seriesOptions = this._series.options() as any;
		const minMove = seriesOptions?.priceFormat?.minMove || 0.01;

		const sanitizedPoints = points.map(p => ({
			...p,
			price: roundPriceToStep(p.price, minMove)
		}));

		const newTool = new ToolClass(
			this._plugin,
			this._chart,
			this._series,
			this._horzScaleBehavior,
			options,
			sanitizedPoints, // Pass sanitized array instead of raw points
			type,                           // toolType (7th param)
			sanitizedPoints.length,          // pointsCount (8th param)
			this._plugin.getPriceAxisLabelStackingManager(), // (9th param)
		);

		if (id) {
			newTool.setId(id);
		}

		this._tools.set(newTool.id(), newTool);
		this._series.attachPrimitive(newTool);

		// Initiate interactive creation if requested.
		if (initiateInteractive) {
			newTool.setCreating(true);
			this._interactionManager.setCurrentToolCreating(newTool);
		}

		this._chart.applyOptions({}); // Trigger a chart update to render the new tool
		return newTool;
	}
}
