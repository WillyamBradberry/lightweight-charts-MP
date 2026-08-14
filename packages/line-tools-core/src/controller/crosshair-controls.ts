// /src/controller/crosshair-controls.ts

import { IChartApiBase, ISeriesApi, SeriesType, Coordinate } from 'lightweight-charts';
import type { InteractionManager } from '../interaction/interaction-manager';
import type { CrosshairTimeAxisLabelView } from '../views/crosshair-time-axis-label-view';
import { Point } from '../utils/geometry';
import { LineToolPoint } from '../api/public-api';

/**
 * Manages the crosshair, its supplemental time-axis label, magnet snapping,
 * time formatting, and the interaction lock state.
 *
 * The core plugin delegates its crosshair/control methods here. This module owns
 * the mutable `_magnetThreshold` and `_customTimeFormatter` state.
 */
export class CrosshairControls<HorzScaleItem> {
	private readonly _chart: IChartApiBase<HorzScaleItem>;
	private readonly _series: ISeriesApi<SeriesType, HorzScaleItem>;
	private readonly _interactionManager: InteractionManager<HorzScaleItem>;
	private readonly _crosshairTimeView: CrosshairTimeAxisLabelView<HorzScaleItem>;

	private _magnetThreshold: number = 0;
	private _customTimeFormatter: ((time: any) => string) | null = null;

	public constructor(
		chart: IChartApiBase<HorzScaleItem>,
		series: ISeriesApi<SeriesType, HorzScaleItem>,
		interactionManager: InteractionManager<HorzScaleItem>,
		crosshairTimeView: CrosshairTimeAxisLabelView<HorzScaleItem>,
	) {
		this._chart = chart;
		this._series = series;
		this._interactionManager = interactionManager;
		this._crosshairTimeView = crosshairTimeView;
	}

	public requestUpdate(): void {
		// Applying empty options is a lightweight way to tell the chart it needs to re-render.
		this._chart.applyOptions({});
	}

	public setCrossHairXY(x: number | null, y: number | null, visible: boolean, providedTime?: HorzScaleItem, providedPrice?: number): void {
		if (!visible) {
			this.clearCrossHair();
			return;
		}

		const chart = this._chart;
		const mainSeries = this._series;

		// DIRECT SYNC BYPASS: If logical values are provided, use them immediately.
		if (providedTime !== undefined && providedPrice !== undefined) {
			chart.setCrosshairPosition(
				providedPrice,
				providedTime,
				mainSeries as ISeriesApi<SeriesType, HorzScaleItem>
			);

			// Update the supplemental time label if x is provided
			if (x !== null) {
				this._crosshairTimeView.update();
			}
			return;
		}

		// STANDARD MOUSE LOGIC: Use conversion and magnet snapping
		if (x !== null && y !== null) {
			const lineToolPoint = this._interactionManager.screenPointToLineToolPoint(new Point(x as Coordinate, y as Coordinate));

			if (lineToolPoint) {
				const horizontalPosition: HorzScaleItem = providedTime
					? providedTime
					: lineToolPoint.timestamp as unknown as HorzScaleItem;

				chart.setCrosshairPosition(
					lineToolPoint.price,
					horizontalPosition,
					mainSeries as ISeriesApi<SeriesType, HorzScaleItem>
				);
			} else {
				this.clearCrossHair();
			}
		}
	}

	public clearCrossHair(): void {
		this._chart.clearCrosshairPosition();
		// Ensure the supplemental label is reset and hidden
		this._crosshairTimeView.updateState('', 0 as Coordinate, false);
	}

	public updateCrosshairTimeLabel(text: string, x: Coordinate, visible: boolean): void {
		this._crosshairTimeView.updateState(text, x, visible);
	}

	public setMagnetThreshold(pixels: number): void {
		this._magnetThreshold = pixels;
		this.requestUpdate();
	}

	public getMagnetThreshold(): number {
		return this._magnetThreshold;
	}

	public getLogicalPoint(x: number, y: number): LineToolPoint | null {
		return this._interactionManager.screenPointToLineToolPoint(new Point(x as Coordinate, y as Coordinate));
	}

	public setTimeFormatter(formatter: ((time: any) => string) | null): void {
		this._customTimeFormatter = formatter;

		// Synchronize the native chart options. Providing a formatter here causes
		// LWC v5 to go "silent" in the blank space, which the InteractionManager repairs.
		this._chart.applyOptions({
			localization: {
				timeFormatter: formatter as any,
			},
		});

		// Trigger an update to refresh all tool labels and the crosshair immediately.
		this.requestUpdate();
	}

	public getTimeFormatter(): ((time: any) => string) | null {
		return this._customTimeFormatter;
	}

	public setLocked(locked: boolean): void {
		this._interactionManager.setLocked(locked);
	}

	public isLocked(): boolean {
		return this._interactionManager.isLocked();
	}
}
