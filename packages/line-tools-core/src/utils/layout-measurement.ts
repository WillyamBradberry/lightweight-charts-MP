// /src/utils/layout-measurement.ts

import { IChartApiBase } from 'lightweight-charts';

/**
 * Represents the physical layout and series mapping for a single chart pane.
 *
 * This structure links a specific Lightweight Charts pane to its calculated
 * screen coordinates and the data series it contains.
 */
export interface PaneLayout {
	/** The native Lightweight Charts API reference for the pane. */
	paneApi: any;
	/** The vertical pixel offset (Y-coordinate) from the top of the chart container to the start of this pane. */
	top: number;
	/** The internal drawing height of the pane in pixels, excluding the time scale area. */
	height: number;
	/** A collection of ISeriesApi instances currently residing within this specific pane. */
	series: any[];
}

/**
 * A holistic, point-in-time snapshot of the entire chart's physical dimensions and pane structure.
 *
 * This object serves as the "Single Source of Truth" for layout-dependent calculations
 * (like hit testing and culling), ensuring that dimensions are synchronized across
 * the entire plugin during a single render frame.
 */
export interface ChartLayoutSnapshot {
	/** The high-resolution timestamp (via performance.now()) indicating when this measurement was performed. */
	timestamp: number;
	/** The global drawing width of all chart panes in pixels, accurately excluding the width of the price axis. */
	width: number;
	/** An array containing the individual layout details for every pane currently present in the chart. */
	panes: PaneLayout[];
}

/**
 * Measures the physical layout (top, height, series) of every pane in the chart.
 *
 * This is the pure DOM-measurement core extracted from the plugin's layout snapshot.
 * The chart's panes are probed via the internal `panes()` accessor; if the DOM is
 * inaccessible, the function fails silently and returns an empty pane list.
 *
 * @param chart - The chart API whose panes should be measured.
 * @param chartRect - The bounding client rect of the chart container, used to compute each pane's relative top offset.
 * @returns An array of {@link PaneLayout} entries, one per pane.
 */
export function measurePaneLayouts<HorzScaleItem>(chart: IChartApiBase<HorzScaleItem>, chartRect: DOMRect): PaneLayout[] {
	const panes: PaneLayout[] = [];
	try {
		const chartPanes = (chart as any).panes?.();
		if (chartPanes) {
			chartPanes.forEach((pane: any) => {
				const paneEl = pane.getHTMLElement?.();
				if (paneEl) {
					const rect = paneEl.getBoundingClientRect();
					panes.push({
						paneApi: pane,
						top: rect.top - chartRect.top,
						height: paneEl.clientHeight,
						series: pane.getSeries?.() || []
					});
				}
			});
		}
	} catch (e) {
		// Fail silently; if DOM is inaccessible, return the existing (empty or cached) pane list.
	}
	return panes;
}
