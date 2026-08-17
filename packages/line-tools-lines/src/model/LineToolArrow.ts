// /src/model/LineToolArrow.ts

import {
	IChartApiBase,
	ISeriesApi,
	IHorzScaleBehavior,
	SeriesType,
} from 'lightweight-charts';

import {
	BaseLineTool,
	LineToolPoint,
	LineToolOptionsInternal,
	LineToolType,
	DeepPartial,
	LineToolsCorePlugin,
	merge,
	deepCopy,
	PriceAxisLabelStackingManager,
	LineEnd,
} from '@mp/line-tools-core';

// Import the base class model and its default options structure
import { LineToolTrendLine, TrendLineOptionDefaults } from './LineToolTrendLine';
import { LineToolArrowPaneView } from '../views/LineToolArrowPaneView';


/**
 * Defines the specific configuration overrides that turn a standard Trend Line into an Arrow tool.
 *
 * Instead of creating a whole new class with new drawing logic, we simply take the
 * base Trend Line options and override specific properties. Here, we force the
 * `line.end.right` property to be `LineEnd.Arrow`.
 */
const ArrowSpecificOverrides = {
	line: {
		end: { right: LineEnd.Arrow }, // Key change: Arrow end on the right side
	}
};


/**
 * Concrete implementation of the Arrow drawing tool.
 *
 * The Arrow tool is structurally identical to a standard Trend Line (it connects a start
 * point to an end point). It only differs visually by forcing the "Right End" to be drawn
 * as an Arrow head by default.
 */
export class LineToolArrow<HorzScaleItem> extends LineToolTrendLine<HorzScaleItem> {
	/**
	 * The unique identifier for this tool type ('Arrow').
	 *
	 * @override
	 */
	public override readonly toolType: LineToolType = 'Arrow';

	/**
	 * Defines the number of anchor points required to draw this tool.
	 *
	 * @override
	 */
	public override readonly pointsCount: number = 2; // Still a 2-point tool

	/**
	 * Initializes the Arrow tool.
	 *
	 * Option merging hierarchy:
	 * 1. **Base Defaults:** Start with `TrendLineOptionDefaults` to get standard line/text settings.
	 * 2. **Subclass Overrides:** Merge `ArrowSpecificOverrides` (which sets `line.end.right = LineEnd.Arrow`).
	 * 3. **User Options:** Merge the `options` passed by the user.
	 *
	 * @param coreApi - The Core Plugin API.
	 * @param chart - The Lightweight Charts Chart API.
	 * @param series - The Series API this tool is attached to.
	 * @param horzScaleBehavior - The horizontal scale behavior.
	 * @param options - Configuration overrides.
	 * @param points - Initial points.
	 * @param priceAxisLabelStackingManager - The manager for label collision.
	 */
	public constructor(
		coreApi: LineToolsCorePlugin<HorzScaleItem>,
		chart: IChartApiBase<HorzScaleItem>,
		series: ISeriesApi<SeriesType, HorzScaleItem>,
		horzScaleBehavior: IHorzScaleBehavior<HorzScaleItem>,
		options: DeepPartial<LineToolOptionsInternal<'Arrow'>> = {},
		points: LineToolPoint[] = [],
		priceAxisLabelStackingManager: PriceAxisLabelStackingManager<HorzScaleItem>
	) {
		// 1. Start with a deep copy of the base TrendLine defaults.
		const finalOptions = deepCopy(TrendLineOptionDefaults) as LineToolOptionsInternal<'Arrow'>;

		// 2. Merge the ArrowSpecificOverrides over the base defaults.
		merge(finalOptions, deepCopy(ArrowSpecificOverrides));

		// 3. Merge the user's provided options last (User wins).
		merge(finalOptions, options as DeepPartial<LineToolOptionsInternal<'Arrow'>>);

		// 4. Call the parent (LineToolTrendLine) constructor.
		super(
			coreApi,
			chart,
			series,
			horzScaleBehavior,
			finalOptions,
			points,
			priceAxisLabelStackingManager
		);

		// 5. Set the specific PaneView for this tool.
		this._setPaneViews([new LineToolArrowPaneView(this, this._chart, this._series)]);

		console.log(`Arrow Tool created with ID: ${this.id()}`);
	}

	// NOTE: All core logic (hitTest, shift constraints, normalize) is inherited from LineToolTrendLine.
}