// /src/utils/geometry/time.ts

import { UTCTimestamp } from 'lightweight-charts';

/**
 * A high-speed memory cache for date string parsing.
 * 
 * Translating strings like '2023-01-01' into UNIX timestamps via new Date() is computationally 
 * expensive. Since time is immutable, we cache the result here so subsequent lookups for the 
 * exact same date string are instantaneous (O(1) memory lookup).
 */
const _dateStringCache = new Map<string, UTCTimestamp>();

/**
 * **Time Format Utility: String to Timestamp**
 * 
 * Converts a standard ISO Date string (e.g., "2023-01-01") into a UNIX Timestamp (seconds).
 * 
 * ### Context
 * Lightweight Charts supports data formats where time is a string (e.g., '2018-12-22'). 
 * However, the plugin's internal geometry and interpolation math strictly requires 
 * numeric values to calculate deltas and intervals.
 * 
 * This helper ensures that string-based series data can be consumed by the math engine,
 * utilizing a high-speed cache to eliminate repetitive Date object allocations.
 * 
 * @param dateString - The date string to convert.
 * @returns The timestamp in seconds (UTCTimestamp).
 */
export function convertDateStringToUTCTimestamp(dateString: string): UTCTimestamp {
	// Check if we already did the heavy math for this exact string
	const cached = _dateStringCache.get(dateString);
	if (cached !== undefined) {
		return cached;
	}

	// If not in cache, do the heavy Date parsing
	const date = new Date(dateString);
	const timestamp = Math.floor(date.getTime() / 1000) as UTCTimestamp;
	
	// Save the answer in our dictionary for next time
	_dateStringCache.set(dateString, timestamp);
	
	return timestamp;
}

/**
 * **Time Format Utility: Timestamp to String**
 * 
 * Converts a numeric UNIX Timestamp back into a standard ISO Date string ("YYYY-MM-DD").
 * 
 * ### Context
 * This is the inverse of {@link convertDateStringToUTCTimestamp}. It is used when the plugin 
 * needs to return a time value that matches the format of the source series data. 
 * 
 * For example, if the chart is configured with string dates, {@link interpolateTimeFromLogicalIndex} 
 * uses this to format its numeric result back into a string so the resulting point matches 
 * the series' native data format.
 * 
 * @param timestamp - The timestamp in seconds.
 * @returns The formatted date string.
 */
export function convertUTCTimestampToDateString(timestamp: UTCTimestamp): string {
	const date = new Date(timestamp * 1000);
	return date.toISOString().split('T')[0];
}
