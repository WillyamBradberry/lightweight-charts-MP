// /src/interaction/coordinate.ts
// Pure helper functions for coordinate conversion and manager-bound pane helpers.
// The InteractionManager (owner of all state) delegates coordinate/pane math here.

import { Point } from '../utils/geometry';
import { Coordinate } from 'lightweight-charts';

/**
 * Manager-bound: converts a browser MouseEvent into a chart-relative Point.
 * Extracted from `InteractionManager._eventToPoint`.
 */
export function eventToPointForManager(this: any, event: MouseEvent): Point | null {
	const rect = this._chart.chartElement().getBoundingClientRect();
	return new Point(event.clientX - rect.left, event.clientY - rect.top);
}

/**
 * Manager-bound: vertical offset (top) of the active series' pane.
 * Extracted from `InteractionManager._getActivePaneYOffset`.
 */
export function getActivePaneYOffset(this: any): number {
	const layout = this._plugin.getLayout();
	const myPane = layout.panes.find((p: any) => p.series.indexOf(this._series) !== -1);
	return myPane ? myPane.top : 0;
}

/**
 * Manager-bound: height of the active series' pane.
 * Extracted from `InteractionManager._getActivePaneHeight`.
 */
export function getActivePaneHeight(this: any): number {
	const layout = this._plugin.getLayout();
	const myPane = layout.panes.find((p: any) => p.series.indexOf(this._series) !== -1);
	return myPane ? myPane.height : 10000;
}

/**
 * Manager-bound: whether a global Y sits within the active series' pane bounds.
 * Extracted from `InteractionManager._isMouseInActivePane`.
 */
export function isMouseInActivePane(this: any, y: number): boolean {
	const layout = this._plugin.getLayout();
	const myPane = layout.panes.find((p: any) => p.series.indexOf(this._series) !== -1);
	if (!myPane) return true;
	return y >= myPane.top && y <= (myPane.top + myPane.height);
}

/**
 * Manager-bound: vertical offset for a specific tool's pane.
 * Extracted from `InteractionManager._getPaneYOffsetForTool`.
 */
export function getPaneYOffsetForTool(this: any, tool: any): number {
	const layout = this._plugin.getLayout();
	const toolPane = layout.panes.find((p: any) => p.series.indexOf(tool.getSeries()) !== -1);
	return toolPane ? toolPane.top : 0;
}

/**
 * Pure conversion: screen point -> logical point. Kept from the original split for
 * completeness so call/responsibility of the manager-bound conversion stays explicit.
 */
export function screenPointToLineToolPointCore(
	screenPoint: Point,
	timeScale: any,
	series: any,
	getActivePaneYOffset: () => number,
	getActivePaneHeight: () => number,
): { timestamp: number; price: number } | null {
	let targetY: Coordinate = screenPoint.y as Coordinate;
	let normalizedY = (targetY - getActivePaneYOffset()) as Coordinate;
	const paneHeight = getActivePaneHeight();
	if (normalizedY < 0) normalizedY = 0 as Coordinate;
	else if (normalizedY > paneHeight) normalizedY = paneHeight as Coordinate;
	const rawPrice = series.coordinateToPrice(normalizedY);
	const logical = timeScale.coordinateToLogical(screenPoint.x as Coordinate);
	if (logical === null || rawPrice === null) return null;
	let timestamp: number = 0;
	if (timeScale.coordinateToLogical) {
		const logicalResult = timeScale.coordinateToLogical(screenPoint.x as Coordinate);
		if (logicalResult !== null) {
			timestamp = typeof screenPoint.x === 'number' ? screenPoint.x : 0;
		}
	}
	return { timestamp, price: rawPrice as number };
}