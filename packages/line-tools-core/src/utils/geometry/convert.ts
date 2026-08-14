// /src/utils/geometry/convert.ts

import { IChartApiBase, ISeriesApi, Coordinate, UTCTimestamp } from 'lightweight-charts';
import { LineToolPoint } from '../../api/public-api';
import { Point, interpolateLogicalIndexFromTime, interpolateTimeFromLogicalIndex, logicalIndexToCoordinate } from '.';
import { roundPriceToStep } from '../helpers';

/**
 * Pure helper: convert a logical LineToolPoint to screen Point using chart+series.
 */
export function convertPointToScreenPoint<HorzScaleItem>(
    chart: IChartApiBase<HorzScaleItem>,
    series: ISeriesApi<any, HorzScaleItem>,
    point: LineToolPoint
): Point | null {
    const logicalIndex = interpolateLogicalIndexFromTime(chart, series, point.timestamp as UTCTimestamp);
    if (logicalIndex === null) return null;

    const x = logicalIndexToCoordinate(chart.timeScale(), logicalIndex);
    const y = series.priceToCoordinate(point.price);

    if (x === null || y === null || !isFinite(x) || isNaN(x) || isNaN(y)) return null;
    return new Point(x, y);
}

/**
 * Pure helper: convert a screen Point to logical LineToolPoint using chart+series+horzScaleBehavior.
 * `minMove` is the price rounding step (optional).
 */
export function convertScreenPointToPoint<HorzScaleItem>(
    chart: IChartApiBase<HorzScaleItem>,
    series: ISeriesApi<any, HorzScaleItem>,
    horzScaleBehavior: any,
    point: Point,
    minMove: number = 0.01
): LineToolPoint | null {
    const timeScale = chart.timeScale();
    const rawPrice = series.coordinateToPrice(point.y as Coordinate);
    const logical = timeScale.coordinateToLogical(point.x as Coordinate);

    if (logical === null || rawPrice === null) return null;

    const finalPrice = roundPriceToStep(rawPrice as number, minMove);
    const interpolatedTime = interpolateTimeFromLogicalIndex(chart, series, logical);
    if (interpolatedTime === null) return null;

    return {
        timestamp: horzScaleBehavior.key(interpolatedTime as HorzScaleItem) as number,
        price: finalPrice,
    };
}
// /src/utils/geometry/convert.ts
// Pure coordinate-conversion helpers extracted from BaseLineTool.
//
// These functions contain no `this`; they operate purely on the API references
// (chart, series, horzScaleBehavior) and the logical/screen point passed in.
// BaseLineTool delegates to them (see pointToScreenPoint / screenPointToPoint).

import {
	Coordinate,
	IChartApiBase,
	IHorzScaleBehavior,
	ISeriesApi,
	SeriesType,
	UTCTimestamp,
} from 'lightweight-charts';

import {
	interpolateLogicalIndexFromTime,
	interpolateTimeFromLogicalIndex,
	logicalIndexToCoordinate,
} from './scale';
import { Point } from './point';
import { roundPriceToStep } from '../helpers';
import { LineToolPoint } from '../../api/public-api';

/**
 * Transforms a logical data point (timestamp/price) into pixel screen coordinates.
 *
 * Uses unified logical-to-coordinate interpolation to ensure timeframe immunity
 * and bypass native LWCharts API decimal (fractional logical index) bugs.
 *
 * @typeParam HorzScaleItem - The type of the horizontal scale item (e.g., `Time` or `number`).
 * @param chart - The Lightweight Charts chart API instance.
 * @param series - The series API instance the tool is attached to.
 * @param point - The logical point to convert.
 * @returns A `Point` with screen coordinates, or `null` if the conversion fails.
 */
export function pointToScreenPoint<HorzScaleItem>(
	chart: IChartApiBase<HorzScaleItem>,
	series: ISeriesApi<SeriesType, HorzScaleItem>,
	point: LineToolPoint
): Point | null {
	// 1. Resolve the Logical Index (float) for the timestamp.
	const logicalIndex = interpolateLogicalIndexFromTime(chart, series, point.timestamp as UTCTimestamp);
	if (logicalIndex === null) return null;

	// 2. Convert Index to X-pixel using our unified helper.
	const x = logicalIndexToCoordinate(chart.timeScale(), logicalIndex);

	// 3. Convert Price to Y-pixel.
	const y = series.priceToCoordinate(point.price);

	// 4. Final Validation.
	if (x === null || y === null || !isFinite(x) || isNaN(x) || isNaN(y)) {
		return null;
	}

	return new Point(x, y);
}

/**
 * Transforms a pixel screen coordinate into a logical data point (timestamp/price).
 *
 * This function is the inverse of {@link pointToScreenPoint}. It is primarily used by the
 * {@link InteractionManager} to determine the final logical coordinates of a user click or drag.
 *
 * @typeParam HorzScaleItem - The type of the horizontal scale item (e.g., `Time` or `number`).
 * @param chart - The Lightweight Charts chart API instance.
 * @param series - The series API instance the tool is attached to.
 * @param horzScaleBehavior - The horizontal scale behavior used to recover a timestamp key from the interpolated time.
 * @param point - The {@link Point} with screen coordinates.
 * @returns A logical {@link LineToolPoint}, or `null` if conversion fails.
 */
export function screenPointToLogicalPoint<HorzScaleItem>(
	chart: IChartApiBase<HorzScaleItem>,
	series: ISeriesApi<SeriesType, HorzScaleItem>,
	horzScaleBehavior: IHorzScaleBehavior<HorzScaleItem>,
	point: Point
): LineToolPoint | null {
	const timeScale = chart.timeScale();
	const rawPrice = series.coordinateToPrice(point.y as Coordinate);

	// Get the logical index from the screen X coordinate.
	const logical = timeScale.coordinateToLogical(point.x as Coordinate);

	if (logical === null || rawPrice === null) {
		return null;
	}

	// --- INTERJECTED ROUNDING LOGIC ---
	// Round the raw price to the series' minimum move (tick size) so the snapped
	// point always lands on a clean, grid-aligned price.
	const options = series.options() as any;
	const minMove = options?.priceFormat?.minMove || 0.01;
	const finalPrice = roundPriceToStep(rawPrice as number, minMove);

	// Use our interpolation function to get a timestamp from the logical index.
	const interpolatedTime = interpolateTimeFromLogicalIndex(chart, series, logical);

	if (interpolatedTime === null) {
		console.warn(`[BaseLineTool] screenPointToPoint: Could not determine interpolated time for screen point: ${JSON.stringify(point)}.`);
		return null;
	}

	return {
		timestamp: horzScaleBehavior.key(interpolatedTime as HorzScaleItem) as number,
		price: finalPrice,
	};
}
