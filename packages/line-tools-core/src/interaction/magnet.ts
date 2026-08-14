// /src/interaction/magnet.ts
// Magnet/snapping logic extracted from InteractionManager._getSnappedY.
// The InteractionManager (owner of all state) delegates snapping here with `this`
// bound to the manager instance.

import { Coordinate } from 'lightweight-charts';

/**
 * Manager-bound version of `InteractionManager._getSnappedY`.
 * Computes the "Snapped" Y-coordinate and exact price based on data in the active
 * pane, using a high-performance column cache with a "Live Candle Bypass".
 */
export function getSnappedYForManager(this: any, x: number, y: number): { y: Coordinate; price?: number } {
	// --- 1. THRESHOLD RESOLUTION ---
	const activeTool = this._draggedTool || this._currentToolCreating;
	const toolThreshold = activeTool?.options().magnetThreshold;
	const effectiveThreshold = (toolThreshold !== undefined && toolThreshold > 0)
		? toolThreshold
		: this._plugin.getMagnetThreshold();

	// If snapping is disabled, return the raw mouse Y as a Coordinate.
	if (effectiveThreshold <= 0) return { y: y as Coordinate };

	// --- 2. PANE & COLUMN RESOLUTION ---
	const layout = this._plugin.getLayout();
	const targetPane = layout.panes.find((p: any) => y >= p.top && y <= (p.top + p.height));
	if (!targetPane) return { y: y as Coordinate };

	const timeScale = this._chart.timeScale();
	const logical = timeScale.coordinateToLogical(x as Coordinate);
	if (logical === null) return { y: y as Coordinate };
	const roundedLogical = Math.round(logical);

	// --- 3. LIVE CANDLE DETECTION ---
	const latestBar = this._plugin.getLatestBar();
	let isLiveCandle = false;

	if (latestBar) {
		const latestLogical = timeScale.coordinateToLogical(timeScale.timeToCoordinate(latestBar.time as any)!);
		if (latestLogical !== null && roundedLogical === Math.round(latestLogical)) {
			isLiveCandle = true;
		}
	}

	// --- 4. CACHE ARBITRATION & LOGGING ---
	// We store the raw prices alongside their series references to avoid scaling-related pixel drift.
	let candidateSources: { price: number; series: any }[] = [];

	if (!isLiveCandle && this._lastSnapLogical === roundedLogical) {
		// --- FAST PATH: CACHE HIT ---
		candidateSources = this._lastSnapCandidates;
	} else {
		targetPane.series.forEach((s: any) => {
			const dataAtTime = s.dataByIndex(roundedLogical as any, 0) as any;
			if (!dataAtTime) return;

			if (dataAtTime.close !== undefined) {
				// OHLC Candle Data: Extract all 4 potential snap points
				const ohlc = [dataAtTime.open, dataAtTime.high, dataAtTime.low, dataAtTime.close];
				for (const val of ohlc) {
					if (val !== undefined) {
						candidateSources.push({ price: val, series: s });
					}
				}
			} else if (dataAtTime.value !== undefined) {
				// Line/Area Series: Snap to the single data value
				candidateSources.push({ price: dataAtTime.value, series: s });
			}
		});

		// Only store in the persistent cache if this is a historical (static) candle.
		if (!isLiveCandle) {
			this._lastSnapLogical = roundedLogical;
			this._lastSnapCandidates = candidateSources;
		}
	}

	// Recalculate converted pixel coordinates fresh for the current frame to prevent zoom-related drift
	const paneTop = targetPane.top;
	const candidates: { y: number; price: number }[] = [];

	candidateSources.forEach((source: any) => {
		const localY = source.series.priceToCoordinate(source.price);
		if (localY !== null) {
			candidates.push({ y: localY + paneTop, price: source.price });
		}
	});

	if (candidates.length === 0) return { y: y as Coordinate };

	// --- 5. PROXIMITY MATH ---
	let nearestY = y;
	let nearestPrice: number | undefined = undefined;
	let minDistance = Infinity;

	for (let i = 0; i < candidates.length; i++) {
		const cand = candidates[i];
		const dist = Math.abs(y - cand.y);
		if (dist < minDistance) {
			minDistance = dist;
			nearestY = cand.y;
			nearestPrice = cand.price; // Capture the exact price associated with this pixel
		}
	}

	// If the closest point is within the threshold, return the snapped position and price.
	if (minDistance <= effectiveThreshold) {
		return {
			y: nearestY as Coordinate,
			price: nearestPrice
		};
	}

	// Fallback to original mouse position
	return { y: y as Coordinate };
}