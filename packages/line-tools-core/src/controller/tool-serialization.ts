// /src/controller/tool-serialization.ts

import { IChartApiBase, ISeriesApi, SeriesType } from 'lightweight-charts';
import type { LineToolsCorePlugin } from '../core-plugin';
import type { BaseLineTool } from '../model/base-line-tool';
import { LineToolExport } from '../api/public-api';
import { LineToolType } from '../types';
import { roundPriceToStep } from '../utils/helpers';

/**
 * Handles serialization and querying of line tool state: export, import,
 * per-ID lookups, and programmatic option/point updates.
 *
 * The core plugin delegates its public query/export methods here. The plugin
 * instance is used to re-enter lifecycle (createOrUpdate) and to broadcast the
 * deselection event on option updates.
 */
export class ToolSerializationController<HorzScaleItem> {
	private readonly _plugin: LineToolsCorePlugin<HorzScaleItem>;
	private readonly _tools: Map<string, BaseLineTool<HorzScaleItem>>;
	private readonly _series: ISeriesApi<SeriesType, HorzScaleItem>;
	private readonly _chart: IChartApiBase<HorzScaleItem>;

	public constructor(
		plugin: LineToolsCorePlugin<HorzScaleItem>,
		tools: Map<string, BaseLineTool<HorzScaleItem>>,
		series: ISeriesApi<SeriesType, HorzScaleItem>,
		chart: IChartApiBase<HorzScaleItem>,
	) {
		this._plugin = plugin;
		this._tools = tools;
		this._series = series;
		this._chart = chart;
	}

	public getSelectedLineTools(): string {
		const selectedTools: LineToolExport<LineToolType>[] = [];
		this._tools.forEach(tool => {
			if (tool.isSelected()) {
				selectedTools.push(tool.getExportData());
			}
		});
		return JSON.stringify(selectedTools);
	}

	public getLineToolByID(id: string): string {
		const tool = this._tools.get(id);
		return tool ? JSON.stringify([tool.getExportData()]) : JSON.stringify([]);
	}

	public getLineToolsByIdRegex(regex: RegExp): string {
		const matchingTools: LineToolExport<LineToolType>[] = [];
		this._tools.forEach(tool => {
			if (regex.test(tool.id())) {
				matchingTools.push(tool.getExportData());
			}
		});
		return JSON.stringify(matchingTools);
	}

	public applyLineToolOptions<T extends LineToolType>(toolData: LineToolExport<T>): boolean {
		const tool = this._tools.get(toolData.id);
		if (!tool || tool.toolType !== toolData.toolType) {
			console.error(`Cannot apply options: Tool with ID "${toolData.id}" not found or type mismatch.`);
			return false;
		}

		// Deselect the tool after applying options, matching V3.8.
		if (tool.isSelected()) {
			tool.setSelected(false);
			this._plugin.fireSingleClickEvent(tool, 'deselected');
		}

		if (toolData.options) {
			tool.applyOptions(toolData.options);
		}
		if (toolData.points) {
			// --- ROUNDING INJECTION: Sanitize programmatic point updates ---
			const seriesOptions = this._series.options() as any;
			const minMove = seriesOptions?.priceFormat?.minMove || 0.01;

			const sanitizedPoints = toolData.points.map(p => ({
				...p,
				price: roundPriceToStep(p.price, minMove)
			}));

			tool.setPoints(sanitizedPoints);
		}

		this._chart.applyOptions({}); // Trigger update
		return true;
	}

	public exportLineTools(): string {
		const allToolsData = Array.from(this._tools.values()).map(tool => tool.getExportData());
		console.log('Exporting all line tools:', allToolsData);
		return JSON.stringify(allToolsData);
	}

	public importLineTools(json: string): boolean {
		try {
			const parsedTools = JSON.parse(json);
			if (!Array.isArray(parsedTools)) {
				throw new Error('Import data is not a valid array of line tools.');
			}
			// Use createOrUpdate to handle updating existing or creating new.
			parsedTools.forEach((toolData: LineToolExport<LineToolType>) => {
				this._plugin.createOrUpdateLineTool(toolData.toolType, toolData.points, toolData.options, toolData.id);
			});
			this._plugin.requestUpdate(); // Trigger a single update after all imports
			return true;
		} catch (e: any) {
			console.error('Failed to import line tools:', e.message);
			return false;
		}
	}
}
