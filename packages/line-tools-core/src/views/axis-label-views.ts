// /src/views/axis-label-views.ts

import { IChartApiBase } from 'lightweight-charts';
import { LineToolPriceAxisLabelView } from './line-tool-price-axis-label-view';
import { LineToolTimeAxisLabelView } from './line-tool-time-axis-label-view';
import { PriceAxisLabelStackingManager } from '../model/price-axis-label-stacking-manager';
import { BaseLineTool } from '../model/base-line-tool';
import { IPriceAxisView } from '../types';
import { ITimeAxisView } from '../types';

/**
 * Creates persistent axis label views for a line tool.
 * Extracts the constructor's axis-view creation loop from BaseLineTool.
 *
 * @typeParam HorzScaleItem - The type of the horizontal scale item (e.g., `Time` or `number`).
 * @param tool - The line tool instance (provides chart, series, and stacking manager references).
 * @param chart - The Lightweight Charts chart API instance.
 * @param stackingManager - The price-axis-label-stacking-manager instance.
 * @param pointsCount - The number of logical points the tool requires (positive = bounded; -1 = unbounded).
 * @returns An object containing arrays of price and time axis views.
 *
 * Note: If `pointsCount` is `-1` (unbounded tools like Brush/Path), the returned arrays will be empty;
 * view creation is deferred to `updateAllViews` for those tools.
 */
export function createLineToolAxisViews<HorzScaleItem>(
	tool: BaseLineTool<HorzScaleItem>,
	chart: IChartApiBase<HorzScaleItem>,
	stackingManager: PriceAxisLabelStackingManager<HorzScaleItem>,
	pointsCount: number
): { price: readonly LineToolPriceAxisLabelView<HorzScaleItem>[]; time: readonly LineToolTimeAxisLabelView<HorzScaleItem>[] } {
	const priceViews: LineToolPriceAxisLabelView<HorzScaleItem>[] = [];
	const timeViews: LineToolTimeAxisLabelView<HorzScaleItem>[] = [];

	// Create one view per logical point, if the tool is bounded.
	if (pointsCount !== -1) {
		for (let i = 0; i < pointsCount; i++) {
			priceViews[i] = new LineToolPriceAxisLabelView(tool, i, chart, stackingManager);
			timeViews[i] = new LineToolTimeAxisLabelView(tool, i, chart);
		}
	}

	return { price: priceViews, time: timeViews };
}