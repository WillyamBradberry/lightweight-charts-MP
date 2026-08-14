// /src/controller/series-data.ts

import {
	IChartApiBase,
	IHorzScaleBehavior,
	ISeriesApi,
	SeriesType,
	Coordinate,
} from 'lightweight-charts';

/**
 * Encapsulates read-only queries over the series data: bar lookups by time,
 * coordinate, and range, plus the optimized binary-search index lookup.
 *
 * The core plugin delegates its `get*Bar`/`getDataInRange`/`getFullTimeRange`
 * methods here. Behavior is identical to the previous inline implementations.
 */
export class SeriesDataController<HorzScaleItem> {
	private readonly _chart: IChartApiBase<HorzScaleItem>;
	private readonly _series: ISeriesApi<SeriesType, HorzScaleItem>;
	private readonly _horzScaleBehavior: IHorzScaleBehavior<HorzScaleItem>;

	public constructor(
		chart: IChartApiBase<HorzScaleItem>,
		series: ISeriesApi<SeriesType, HorzScaleItem>,
		horzScaleBehavior: IHorzScaleBehavior<HorzScaleItem>,
	) {
		this._chart = chart;
		this._series = series;
		this._horzScaleBehavior = horzScaleBehavior;
	}

	public getDataInRange(range: { from: number | string; to: number | string }): any[] {
		const seriesData = this._series.data();
		if (seriesData.length === 0) return [];

		const fromKey = typeof range.from === 'number' ? range.from : this._horzScaleBehavior.key(range.from as any);
		const toKey = typeof range.to === 'number' ? range.to : this._horzScaleBehavior.key(range.to as any);

		const startIndex = this.findBarIndex(fromKey as number, 'ceil');
		const endIndex = this.findBarIndex(toKey as number, 'floor');

		if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) return [];

		return seriesData.slice(startIndex, endIndex + 1) as any[];
	}

	public getBarAtTime(time: number | string): any | null {
		const targetKey = typeof time === 'number' ? time : this._horzScaleBehavior.key(time as any);
		const index = this.findBarIndex(targetKey as number, 'exact');

		// Use dataByIndex instead of data()[index] to avoid copying the full array.
		return index !== -1 ? this._series.dataByIndex(index as any, 0) : null;
	}

	public getClosestBar(time: number | string, mode: 'exact' | 'floor' | 'ceil' | 'nearest'): any | null {
		const targetKey = typeof time === 'number' ? time : this._horzScaleBehavior.key(time as any);
		const index = this.findBarIndex(targetKey as number, mode);

		// Use dataByIndex to avoid massive array allocations during high-frequency lookups.
		return index !== -1 ? this._series.dataByIndex(index as any, 0) : null;
	}

	public getBarAtCoordinate(x: number): any | null {
		const timeScale = this._chart.timeScale();
		const logical = timeScale.coordinateToLogical(x as Coordinate);
		if (logical === null) return null;

		// In v5, dataByIndex is the official way to bridge Logical Index -> Data Row.
		return this._series.dataByIndex(Math.round(logical) as any) || null;
	}

	public getEarliestBar(): any | null {
		// dataByIndex with NearestRight (1) avoids loading the entire array.
		return this._series.dataByIndex(-Number.MAX_SAFE_INTEGER, 1) || null;
	}

	public getLatestBar(): any | null {
		// dataByIndex with NearestLeft (-1) avoids loading the entire array.
		return this._series.dataByIndex(Number.MAX_SAFE_INTEGER, -1) || null;
	}

	public getFullTimeRange(): { from: any; to: any } | null {
		const firstBar = this.getEarliestBar();
		const lastBar = this.getLatestBar();

		if (!firstBar || !lastBar) return null;

		return {
			from: firstBar.time,
			to: lastBar.time,
		};
	}

	/**
	 * Binary-search engine that finds the index of a bar based on a timestamp key.
	 *
	 * Supports 'exact', 'floor', 'ceil', and 'nearest' lookup modes. Time complexity
	 * is O(log n). It uses O(1) direct index probes (`dataByIndex`) so it never
	 * allocates the full series data array.
	 *
	 * @param targetKey - The numeric timestamp key to search for.
	 * @param mode - The search mode ('exact', 'floor', 'ceil', or 'nearest').
	 * @returns The index of the matching bar in the series data array, or -1 if not found.
	 */
	public findBarIndex(targetKey: number, mode: 'exact' | 'floor' | 'ceil' | 'nearest'): number {
		const lastBar = this.getLatestBar();
		if (!lastBar) return -1;

		const timeScale = this._chart.timeScale();
		const lastLogical = timeScale.coordinateToLogical(timeScale.timeToCoordinate(lastBar.time as HorzScaleItem)!);

		if (lastLogical === null) return -1;

		let low = 0;
		let high = Math.round(lastLogical);
		let lastValidIndex = -1;

		// Binary search using direct index probes via dataByIndex.
		while (low <= high) {
			const mid = (low + high) >> 1;

			const midBar = this._series.dataByIndex(mid as any, 0);
			if (!midBar) break;

			const midKey = this._horzScaleBehavior.key(midBar.time as HorzScaleItem);

			if (midKey === targetKey) return mid;

			if (midKey < targetKey) {
				if (mode === 'floor' || mode === 'nearest') lastValidIndex = mid;
				low = mid + 1;
			} else {
				if (mode === 'ceil' || mode === 'nearest') lastValidIndex = mid;
				high = mid - 1;
			}
		}

		if (mode === 'exact' || lastValidIndex === -1) return -1;

		// Refined 'nearest' logic using direct index probes.
		if (mode === 'nearest') {
			const bar1 = this._series.dataByIndex(lastValidIndex as any, 0);

			if (bar1) {
				const k1 = this._horzScaleBehavior.key(bar1.time as HorzScaleItem);
				const otherIndex = k1 < targetKey ? lastValidIndex + 1 : lastValidIndex - 1;

				const bar2 = this._series.dataByIndex(otherIndex as any, 0);
				if (bar2) {
					const k2 = this._horzScaleBehavior.key(bar2.time as HorzScaleItem);
					if (Math.abs(targetKey - k2) < Math.abs(targetKey - k1)) {
						return otherIndex;
					}
				}
			}
		}

		return lastValidIndex;
	}
}
