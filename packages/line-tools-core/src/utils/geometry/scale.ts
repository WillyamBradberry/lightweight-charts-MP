// /src/utils/geometry/scale.ts

import { Coordinate, ITimeScaleApi, Logical, IChartApiBase, ISeriesApi, SeriesType, Time, UTCTimestamp, BarPrice } from 'lightweight-charts';
import { convertDateStringToUTCTimestamp, convertUTCTimestampToDateString } from './time';
import { BaseLineTool } from '../../model/base-line-tool';

const _seriesIntervalCache = new WeakMap<any, { direction: string, start: number, interval: number }>();

/**
 * Internal Helper: Proves the chart's true time interval by checking up to 10 adjacent bars.
 * 
 * This method is essential for "Blank Space" extrapolation. It ensures that we don't 
 * accidentally use a weekend gap (e.g., Friday to Monday) as the chart's base interval.
 * By verifying that two consecutive gaps are identical, we confirm the true timeframe.
 *
 * @param series - The series API instance.
 * @param direction - 'last' to verify future interval, 'first' to verify past interval.
 * @param firstLogical - The index of the first candle.
 * @param lastLogical - The index of the last candle.
 * @returns The confirmed interval in seconds, or the last detected interval as a fallback.
 */
function _getVerifiedBarInterval<HorzScaleItem>(
	series: ISeriesApi<SeriesType, HorzScaleItem>,
	direction: 'first' | 'last',
	firstLogical: number,
	lastLogical: number
): number | null {
	const maxChecks = 10;
	const startIndex = direction === 'last' ? lastLogical : firstLogical;
	const step = direction === 'last' ? -1 : 1; 

	// 2. ADD THIS FAST CACHE RETURN
	const cacheRecord = _seriesIntervalCache.get(series);
	if (cacheRecord && cacheRecord.direction === direction && cacheRecord.start === startIndex) {
		return cacheRecord.interval;
	}

	let prevInterval: number | null = null;

	for (let i = 0; i < maxChecks; i++) {
		const barA = series.dataByIndex(startIndex + (i * step) as any, 0);
		const barB = series.dataByIndex(startIndex + ((i + 1) * step) as any, 0);

		if (!barA || !barB) break;

		const tA = typeof barA.time === 'string' ? convertDateStringToUTCTimestamp(barA.time) : Number(barA.time);
		const tB = typeof barB.time === 'string' ? convertDateStringToUTCTimestamp(barB.time) : Number(barB.time);
		
		const interval = Math.abs(tA - tB);

		if (prevInterval !== null && interval === prevInterval) {
			// 3. CACHE IT BEFORE RETURNING
			_seriesIntervalCache.set(series, { direction, start: startIndex, interval });
			return interval;
		}
		prevInterval = interval;
	}

	// 4. CACHE FALLBACK
	if (prevInterval !== null) {
		_seriesIntervalCache.set(series, { direction, start: startIndex, interval: prevInterval });
	}
	return prevInterval;
}

/**
 * Converts a Logical Index (including fractional decimals) into a precise pixel Coordinate.
 * 
 * **Why this exists:** 
 * Lightweight Charts' native `logicalToCoordinate` often returns 0 or fails when passed 
 * a decimal index. This helper bypasses that bug by requesting the integer coordinates 
 * of the two neighboring candles and manually interpolating the pixel distance.
 * 
 * @param timeScale - The chart's TimeScale API.
 * @param index - The fractional logical index.
 * @returns The precise pixel coordinate, or `null` if the index is too far off-chart.
 */
export function logicalIndexToCoordinate(timeScale: ITimeScaleApi<any>, index: number): Coordinate | null {
	const leftLogical = Math.floor(index);
	const rightLogical = Math.ceil(index);

	// 1. Handle exact integer match.
	if (leftLogical === rightLogical) {
		return timeScale.logicalToCoordinate(leftLogical as Logical);
	}

	// 2. Handle fractional match (interpolation).
	// Get the pixel coordinates of the two integer neighbors.
	const xLeft = timeScale.logicalToCoordinate(leftLogical as Logical);
	const xRight = timeScale.logicalToCoordinate(rightLogical as Logical);

	if (xLeft !== null && xRight !== null) {
		// Calculate the exact sub-pixel position manually.
		const fraction = index - leftLogical;
		return (xLeft + fraction * (xRight - xLeft)) as Coordinate;
	}

	// 3. Fallback: If neighbors are off-screen, round to the nearest visible candle.
	return timeScale.logicalToCoordinate(Math.round(index) as Logical);
}

/**
 * **Critical Core Utility: Time Extrapolation (3-Zone Architecture)**
 * 
 * Converts a fractional Logical Index into a precise UNIX Timestamp or Date String.
 * 
 * ### Performance Architecture:
 * 1. **Zero-Allocation:** This function strictly avoids `series.data()`. By using the 
 *    `series.dataByIndex()` API, it points directly to existing objects in the chart's 
 *    memory, preventing massive array copies and Garbage Collection (GC) lag.
 * 2. **Timeframe Immunity:** Within the History Zone, it performs local neighbor interpolation. 
 *    This allows a tool drawn on a 1m chart to maintain its exact visual proportions when 
 *    viewed on a 15m or 1H chart, regardless of the gap size.
 * 3. **Gap Resilience:** By using local neighbors for interpolation and a verified 
 *    interval for extrapolation, this math gracefully glides over weekends and overnight 
 *    halts without visual distortion.
 * 
 * @typeParam HorzScaleItem - The type of the horizontal scale item (Time, UTCTimestamp, or string).
 * @param chart - The Lightweight Charts API instance.
 * @param series - The series API instance providing the data context.
 * @param logicalIndex - The fractional index to convert into a time value.
 * @returns The extrapolated `Time` matching the series format, or `null` if the series is empty.
 */
export function interpolateTimeFromLogicalIndex<HorzScaleItem>(
	chart: IChartApiBase<HorzScaleItem>,
	series: ISeriesApi<SeriesType, HorzScaleItem>,
	logicalIndex: number
): Time | null {
	if (!chart || !series) return null;

	const timeScale = chart.timeScale();

	// 1. Resolve Chart Boundaries using O(1) direct index probes.
	// We ask for indices at infinity to grab the absolute edge candles without an array copy.
	const firstBar = series.dataByIndex(-Number.MAX_SAFE_INTEGER as any, 1);
	const lastBar = series.dataByIndex(Number.MAX_SAFE_INTEGER as any, -1);
	
	if (!firstBar || !lastBar) return null;

	// 2. Resolve the Integer Logical Bounds (0 to N-1).
	// We convert the edge timestamps into coordinates and then back to logical indices.
	const firstCoord = timeScale.timeToCoordinate(firstBar.time as unknown as HorzScaleItem);
	const lastCoord = timeScale.timeToCoordinate(lastBar.time as unknown as HorzScaleItem);
	
	if (firstCoord === null || lastCoord === null) return null;

	// We round the results to ensure we have strict integers for the dataByIndex API.
	const firstLogical = Math.round(timeScale.coordinateToLogical(firstCoord) as number);
	const lastLogical = Math.round(timeScale.coordinateToLogical(lastCoord) as number);

	// 3. Normalize edge timestamps into numeric UNIX seconds for the math engine.
	const firstTimeNum = typeof firstBar.time === 'string' ? convertDateStringToUTCTimestamp(firstBar.time as string) : Number(firstBar.time);
	const lastTimeNum = typeof lastBar.time === 'string' ? convertDateStringToUTCTimestamp(lastBar.time as string) : Number(lastBar.time);

	let interpolatedTime: number;

	// --- ZONE 1 & 2: THE HISTORY ZONE (Between the first and last candle) ---
	if (logicalIndex >= firstLogical && logicalIndex <= lastLogical) {
		
		// Zone 1: Exact integer match (Native Truth).
		if (Number.isInteger(logicalIndex)) {
			const exactBar = series.dataByIndex(logicalIndex as any, 0);
			if (exactBar) return exactBar.time as unknown as Time;
		}

		// Zone 2: Fractional History (Neighbor Interpolation).
		// We find the two exact candles the index falls between.
		const leftIndex = Math.floor(logicalIndex);
		let rightIndex = Math.ceil(logicalIndex);
		
		// Prevent division-by-zero if the index is somehow exactly between 
		// the same integer (should be caught by isInteger above).
		if (leftIndex === rightIndex) rightIndex = leftIndex + 1; 
		
		// Fetch neighbors directly from memory.
		const leftBar = series.dataByIndex(leftIndex as any, 0);
		const rightBar = series.dataByIndex(rightIndex as any, 0);

		if (!leftBar || !rightBar) return null;

		const tLeft = typeof leftBar.time === 'string' ? convertDateStringToUTCTimestamp(leftBar.time as string) : Number(leftBar.time);
		const tRight = typeof rightBar.time === 'string' ? convertDateStringToUTCTimestamp(rightBar.time as string) : Number(rightBar.time);

		// Interpolate the time based on the local gap between these two specific neighbors.
		// This makes the math immune to historical weekend gaps.
		const fraction = logicalIndex - leftIndex;
		interpolatedTime = tLeft + (fraction * (tRight - tLeft));
	} 
	// --- ZONE 3: THE BLANK SPACE (Verified Extrapolation) ---
	else {
		// Identify direction and request a verified interval (avoiding weekend-straddle errors).
		const isFuture = logicalIndex > lastLogical;
		const verifiedInterval = _getVerifiedBarInterval(series, isFuture ? 'last' : 'first', firstLogical, lastLogical);
		
		if (verifiedInterval === null || verifiedInterval === 0) return null;

		if (isFuture) {
			// Project forward from the last known candle timestamp.
			const logicalDelta = logicalIndex - lastLogical;
			interpolatedTime = lastTimeNum + (logicalDelta * verifiedInterval);
		} else {
			// Project backward from the first known candle timestamp.
			const logicalDelta = firstLogical - logicalIndex;
			interpolatedTime = firstTimeNum - (logicalDelta * verifiedInterval);
		}
	}

	// 4. Format the final result back into the series' native format (Date String or UTCTimestamp).
	if (typeof firstBar.time === 'string') {
		return convertUTCTimestampToDateString(interpolatedTime as UTCTimestamp) as unknown as Time;
	} else {
		return Math.round(interpolatedTime) as unknown as Time;
	}
}

/**
 * **Critical Core Utility: Viewport & Culling Price Range**
 * 
 * Calculates the absolute visible price range of the specific chart pane 
 * where the provided tool is located. It maps the physical top (y=0) and 
 * bottom (y=height) pixel edges directly to logical price values.
 * 
 * ### Unified Layout Integration
 * This utility utilizes the tool's `getChartDrawingHeight()` method, which is 
 * powered by the Core Plugin's unified layout snapshot. This ensures:
 * 1. **Multi-Pane Accuracy:** It correctly calculates the range for sub-panes 
 *    (e.g., RSI, Volume) by using pane-specific heights.
 * 2. **Performance:** It is safe to call at 60fps during panning/zooming as it 
 *    avoids layout thrashing by reading from a 16ms micro-cache rather than 
 *    hitting the DOM directly.
 * 
 * @typeParam HorzScaleItem - The type of the horizontal scale item.
 * @param tool - The tool instance providing the series context and access to cached pane dimensions.
 * @returns An object containing `from` (the price at the bottom edge) and `to` (the price at the top edge), or `null` if the series is not yet attached.
 */
export function getExtendedVisiblePriceRange<HorzScaleItem>(
	tool: BaseLineTool<HorzScaleItem>
): { from: BarPrice | null; to: BarPrice | null; } | null {
	const series = tool.getSeries();

	// We utilize the unified height getter which automatically identifies 
	// the correct pane and handles the performance caching logic.
	const paneHeight = tool.getChartDrawingHeight();

	// Note: In pixel space, height (e.g. 600) is the bottom of the screen 
	// and 0 is the top. We map these to their respective logical prices.
	return {
		from: series.coordinateToPrice(paneHeight as Coordinate), // Bottom Price
		to: series.coordinateToPrice(0 as Coordinate),           // Top Price
	};
}

/**
 * **Critical Core Utility: Logical Index Recovery (3-Zone Architecture)**
 * 
 * Calculates the exact or estimated Logical Index for a specific Timestamp.
 * 
 * ### Architecture Benefits:
 * 1. **Zero-Allocation Memory Safety:** This function strictly avoids `series.data()`. By using 
 *    the `series.dataByIndex()` API and coordinate mapping, it calculates indices without 
 *    copying the chart array into RAM. This ensures high performance even with millions 
 *    of bars loaded.
 * 2. **Timeframe Immunity:** By finding the exact left and right neighbor candles for 
 *    a timestamp, tools drawn on a lower timeframe (e.g., 1m) will proportionately 
 *    float at the correct fractional position on a higher timeframe (e.g., 15m).
 * 3. **Gap Awareness:** This method is immune to weekends and holiday gaps. Because 
 *    it searches the actual data array using Binary Search, it glides over empty 
 *    time periods without adding phantom indices to the visual representation.
 * 
 * @typeParam HorzScaleItem - The type of the horizontal scale item.
 * @param chart - The Lightweight Charts API instance.
 * @param series - The series API instance providing the data context.
 * @param timestamp - The target timestamp to convert into an index.
 * @returns The calculated `Logical` index (including fractions), or `null`.
 */
export function interpolateLogicalIndexFromTime<HorzScaleItem>(
	chart: IChartApiBase<HorzScaleItem>,
	series: ISeriesApi<SeriesType, HorzScaleItem>,
	timestamp: Time
): Logical | null {
	if (!series || !chart) return null;

	// Normalize the input timestamp into a numeric value for mathematical comparison.
	const targetTimeNum = typeof timestamp === 'string' ? convertDateStringToUTCTimestamp(timestamp) : Number(timestamp);

	// 1. Resolve absolute chart boundaries using O(1) direct index probes.
	// We probe at negative/positive infinity to find the edges without extracting the full array.
	const firstBar = series.dataByIndex(-Number.MAX_SAFE_INTEGER as any, 1);
	const lastBar = series.dataByIndex(Number.MAX_SAFE_INTEGER as any, -1);
	
	if (!firstBar || !lastBar) return null;

	const timeScale = chart.timeScale();

	// 2. Resolve the Integer Logical Bounds (0 to N-1).
	// We map the edge timestamps to coordinates and then to logical indices.
	// This identifies exactly how many candles are currently loaded.
	const firstCoord = timeScale.timeToCoordinate(firstBar.time as unknown as HorzScaleItem);
	const lastCoord = timeScale.timeToCoordinate(lastBar.time as unknown as HorzScaleItem);
	
	if (firstCoord === null || lastCoord === null) return null;

	const firstLogical = Math.round(timeScale.coordinateToLogical(firstCoord) as number);
	const lastLogical = Math.round(timeScale.coordinateToLogical(lastCoord) as number);

	// 3. Normalize the edge bar times for comparison logic.
	const firstTimeNum = typeof firstBar.time === 'string' ? convertDateStringToUTCTimestamp(firstBar.time as string) : Number(firstBar.time);
	const lastTimeNum = typeof lastBar.time === 'string' ? convertDateStringToUTCTimestamp(lastBar.time as string) : Number(lastBar.time);

	// --- ZONE 1: THE NATIVE TRUTH (With Anti-Clamping) ---
	// We first check if Lightweight Charts natively knows where this timestamp is.
	const coordinate = timeScale.timeToCoordinate(timestamp as unknown as HorzScaleItem);
	
	if (coordinate !== null) {
		const logicalRaw = timeScale.coordinateToLogical(coordinate);
		if (logicalRaw !== null) {
			// Native LWC often clamps a future/past date to the nearest available candle.
			// We verify the actual bar data at this index to ensure it is a perfect match.
			const logical = Math.round(logicalRaw);
			const checkBar = series.dataByIndex(logical as any, 0);
			if (checkBar) {
				const checkTimeNum = typeof checkBar.time === 'string' ? convertDateStringToUTCTimestamp(checkBar.time) : Number(checkBar.time);
				if (checkTimeNum === targetTimeNum) {
					// Exact match found in history. Return the integer index.
					return logical as Logical;
				}
			}
		}
	}

	// --- ZONE 2: THE HISTORY ZONE (Fast Binary Search) ---
	// If the timestamp is between our first and last candle, we find its fractional position.
	if (targetTimeNum >= firstTimeNum && targetTimeNum <= lastTimeNum) {
		
		// Use standard numbers for the search math to satisfy LWC's nominal typing.
		let low: number = firstLogical;
		let high: number = lastLogical;
		let leftNeighborIndex: number = firstLogical;

		// Perform a memory-safe binary search using direct O(1) index probes.
		while (low <= high) {
			const mid = Math.floor((low + high) / 2);
			const midBar = series.dataByIndex(mid as any, 0);
			if (!midBar) break;

			const midTimeNum = typeof midBar.time === 'string' ? convertDateStringToUTCTimestamp(midBar.time as string) : Number(midBar.time);

			if (midTimeNum === targetTimeNum) {
				return mid as Logical; // Found an exact match during the search.
			} else if (midTimeNum < targetTimeNum) {
				leftNeighborIndex = mid;
				low = mid + 1;
			} else {
				high = mid - 1;
			}
		}

		// Calculate the fractional placement between the two discovered neighbors.
		const rightNeighborIndex = leftNeighborIndex + 1;
		const leftBar = series.dataByIndex(leftNeighborIndex as any, 0);
		const rightBar = series.dataByIndex(rightNeighborIndex as any, 0);

		if (leftBar && rightBar) {
			const tLeft = typeof leftBar.time === 'string' ? convertDateStringToUTCTimestamp(leftBar.time as string) : Number(leftBar.time);
			const tRight = typeof rightBar.time === 'string' ? convertDateStringToUTCTimestamp(rightBar.time as string) : Number(rightBar.time);
			
			const interval = tRight - tLeft;
			if (interval > 0) {
				// The fraction represents how far into the candle the timestamp is.
				// This allows for proportional floating between candles on higher timeframes.
				const fraction = (targetTimeNum - tLeft) / interval;
				return (leftNeighborIndex + fraction) as Logical;
			}
		}
	}

	// --- ZONE 3: THE BLANK SPACE (Verified Extrapolation) ---
	// If the timestamp is outside the loaded data, we project it linearly.
	const isFuture = targetTimeNum > lastTimeNum;
	const verifiedInterval = _getVerifiedBarInterval(series, isFuture ? 'last' : 'first', firstLogical, lastLogical);

	if (verifiedInterval === null || verifiedInterval === 0) return null;

	if (isFuture) {
		// Calculate the number of fractional indices past the last bar.
		const timeDelta = targetTimeNum - lastTimeNum;
		const logicalDelta = timeDelta / verifiedInterval;
		return (lastLogical + logicalDelta) as Logical;
	} else {
		// Calculate the number of fractional indices before the first bar.
		const timeDelta = firstTimeNum - targetTimeNum;
		const logicalDelta = timeDelta / verifiedInterval;
		return (firstLogical - logicalDelta) as Logical;
	}
}


