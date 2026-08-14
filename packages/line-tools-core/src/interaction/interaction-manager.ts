// /src/interaction/interaction-manager.ts

import {
	IChartApiBase,
	ISeriesApi,
	MouseEventParams,
	SeriesType,
	IHorzScaleBehavior,
	Coordinate,
	IPaneApi,
	TouchMouseEventData,
	Time,
	Logical,
} from 'lightweight-charts';
import { LineToolsCorePlugin } from '../core-plugin';
import { BaseLineTool } from '../model/base-line-tool';
import { ToolRegistry } from '../model/tool-registry';
import { LineToolPartialOptionsMap, LineToolType, InteractionPhase, HitTestType, HitTestResult, SnapAxis, FinalizationMethod, PaneCursorType } from '../types';
import { Point, interpolateTimeFromLogicalIndex, interpolateLogicalIndexFromTime } from '../utils/geometry';
import { LineToolPoint } from '../api/public-api';
import { ensureNotNull, deepCopy, roundPriceToStep } from '../utils/helpers';

// Method bodies are delegated to these helper modules. State ownership lives here.
import { finalizeToolCreation, resetCreationGestureStateOnly, resetCommonGestureState } from './creation';
import { resetEditingGestureStateOnly } from './editing';
import { handleKey, handleMouseDown, handleMouseMove, handleMouseUp, handleStandaloneClick, handleDblClick, handleCrosshairMove, handleMouseLeave, hitTest } from './events';
import { getSnappedYForManager } from './magnet';
import { eventToPointForManager, getActivePaneYOffset, getActivePaneHeight, isMouseInActivePane, getPaneYOffsetForTool } from './coordinate';

/**
 * Defines the parameters for an active tool waiting for user interaction.
 */
interface ActiveToolParams<T extends LineToolType> {
	type: T;
	options?: LineToolPartialOptionsMap[T];
}

export const DRAG_THRESHOLD = 10; // Pixels to classify movement as drag
export const CLICK_TIMEOUT = 300; // Milliseconds (max time between down and up for a click)

/**
 * Manages all user interactions with line tools, including creation, selection,
 * editing, and event propagation. It acts as the central router for mouse and touch
 * events. Bulk interaction method bodies are delegated to the `./creation`,
 * `./editing`, `./events`, `./magnet`, and `./coordinate` helpers.
 */
export class InteractionManager<HorzScaleItem> {
	private _plugin: LineToolsCorePlugin<HorzScaleItem>;
	private _chart: IChartApiBase<HorzScaleItem>;
	private _series: ISeriesApi<SeriesType, HorzScaleItem>;
	private _tools: Map<string, BaseLineTool<HorzScaleItem>>;
	private _toolRegistry: ToolRegistry<HorzScaleItem>;
	private _horzScaleBehavior: IHorzScaleBehavior<HorzScaleItem>;

	// State Management
	private _currentToolCreating: BaseLineTool<HorzScaleItem> | null = null;
	private _selectedTool: BaseLineTool<HorzScaleItem> | null = null;
	private _hoveredTool: BaseLineTool<HorzScaleItem> | null = null;

	// Interaction State (Editing)
	private _isEditing: boolean = false;
	private _draggedTool: BaseLineTool<HorzScaleItem> | null = null;
	private _draggedPointIndex: number | null = null;
	private _originalDragPoints: LineToolPoint[] | null = null;
	private _dragStartPoint: Point | null = null;
	// Cache for logical indices to ensure gap-proof translation
	private _originalDragLogicalIndices: (Logical | null)[] | null = null;
	// Store the cursor that started the interaction
	private _activeDragCursor: PaneCursorType | null = null;

	// Interaction State (Creation - Raw DOM Listeners)
	private _isCreationGesture: boolean = false;
	private _creationTool: BaseLineTool<HorzScaleItem> | null = null;
	private _mouseDownPoint: Point | null = null;
	private _mouseDownTime: number = 0;
	private _isDrag: boolean = false;
	private _isShiftKeyDown: boolean = false;

	private _lastCrosshairText: string = '';
	private _lastCrosshairX: Coordinate | null = null;

	private _lastSnapLogical: number | null = null;
	private _lastSnapCandidates: { price: number; series: any }[] = [];

	/**
	 * Lock State — when true, all mouse interactions are suppressed.
	 * Tools remain visible but cannot be selected, moved, or drawn.
	 * @private
	 */
	private _locked: boolean = false;

	/**
	 * Tracks the last known chart-relative mouse position. Used to determine which
	 * pane the mouse is hovering over, bypassing the resetting Y coordinates of
	 * native crosshair events.
	 * @private
	 */
	private _currentGlobalPoint: Point | null = null;

	/**
	 * Flag used to track if our supplemental crosshair time label is currently visible.
	 * Used to throttle requestUpdate() calls so we only repaint when state changes.
	 * @private
	 */
	private _crosshairSupplementalVisible: boolean = false;

	// --- Stable Event Listener References for Cleanup ---
	private _isDestroyed: boolean = false;
	private readonly _boundHandleMouseDown = (event: MouseEvent): void => this._handleMouseDown(event);
	private readonly _boundHandleMouseMove = (event: MouseEvent): void => this._handleMouseMove(event);
	private readonly _boundHandleMouseUp = (event: MouseEvent): void => this._handleMouseUp(event);
	private readonly _boundHandleMouseLeave = (event: MouseEvent): void => this._handleMouseLeave(event);
	private readonly _boundHandleDblClick = (params: MouseEventParams<HorzScaleItem>): void => this._handleDblClick(params);
	private readonly _boundHandleCrosshairMove = (params: MouseEventParams<HorzScaleItem>): void => this._handleCrosshairMove(params);
	private readonly _boundHandleKeyDown = (event: KeyboardEvent): void => this._handleKey(event);
	private readonly _boundHandleKeyUp = (event: KeyboardEvent): void => this._handleKey(event);

	/**
	 * Initializes the Interaction Manager, setting up all internal references and
	 * subscribing to necessary DOM and Lightweight Charts events.
	 */
	public constructor(
		plugin: LineToolsCorePlugin<HorzScaleItem>,
		chart: IChartApiBase<HorzScaleItem>,
		series: ISeriesApi<SeriesType, HorzScaleItem>,
		tools: Map<string, BaseLineTool<HorzScaleItem>>,
		toolRegistry: ToolRegistry<HorzScaleItem>,
	) {
		this._plugin = plugin;
		this._chart = chart;
		this._series = series;
		this._tools = tools;
		this._toolRegistry = toolRegistry;
		this._horzScaleBehavior = chart.horzBehaviour();

		this._subscribeToChartEvents();
	}

	// Add an optional bypass parameter to keep magnet active for unconstrained points
	public screenPointToLineToolPoint(screenPoint: Point, bypassMagnet: boolean = false): LineToolPoint | null {
		const timeScale = this._chart.timeScale();

		// --- 1. DETERMINE INPUT Y (Price) ---
		let targetY: Coordinate = screenPoint.y as Coordinate;
		let snappedPrice: number | undefined = undefined;

		// Prioritize Shift Key constraint over the Magnet Engine only if bypassed
		if (!bypassMagnet) {
			const snapResult = this._getSnappedY(screenPoint.x, screenPoint.y);
			targetY = snapResult.y;
			snappedPrice = snapResult.price;
		}

		// --- THE MULTI-PANE OFFSET NORMALIZATION ---
		let normalizedY = (targetY - this._getActivePaneYOffset()) as Coordinate;

		// --- BOUNDARY CLAMPING (unless we have a snapped price) ---
		const paneHeight = this._getActivePaneHeight();
		if (snappedPrice === undefined) {
			if (normalizedY < 0) {
				normalizedY = 0 as Coordinate;
			} else if (normalizedY > paneHeight) {
				normalizedY = paneHeight as Coordinate;
			}
		}

		const rawPrice = this._series.coordinateToPrice(normalizedY);
		const logical = timeScale.coordinateToLogical(screenPoint.x as Coordinate);

		if (logical === null || rawPrice === null) {
			return null;
		}

		// --- INTERJECTED ROUNDING LOGIC ---
		let finalPrice: number;
		if (snappedPrice !== undefined) {
			finalPrice = snappedPrice;
		} else {
			const options = this._series.options() as any;
			const minMove = options?.priceFormat?.minMove || 0.01;
			finalPrice = roundPriceToStep(rawPrice as number, minMove);
		}

		// --- 2. TIERED TIME LOOKUP ---
		let finalTime: any = null;
		const barAtCoordinate = this._plugin.getBarAtCoordinate(screenPoint.x);

		if (barAtCoordinate) {
			finalTime = barAtCoordinate.time;
		} else {
			finalTime = interpolateTimeFromLogicalIndex(this._chart, this._series, logical);
		}

		if (finalTime === null) {
			return null;
		}

		// --- 3. FORMAT AND RETURN ---
		return {
			timestamp: this._horzScaleBehavior.key(finalTime as HorzScaleItem) as number,
			price: finalPrice,
		};
	}
/**
	 * Sets the specific tool instance currently being drawn interactively.
	 */
	public setCurrentToolCreating(tool: BaseLineTool<HorzScaleItem> | null): void {
		this._currentToolCreating = tool;
	}

	/**
	 * Sets the global lock state for all drawing interactions. When locking, any
	 * in-progress interaction is safely aborted.
	 */
	public setLocked(locked: boolean): void {
		this._locked = locked;

		// If locking, proactively clean up any ongoing gestures.
		if (locked) {
			this._resetInteractionStateFully();
		}
	}

	/**
	 * Returns the current lock state of the Interaction Manager.
	 */
	public isLocked(): boolean {
		return this._locked;
	}

	/**
	 * Attaches a line tool primitive to the main series for rendering.
	 * @private
	 */
	private attachTool(tool: BaseLineTool<HorzScaleItem>): void {
		this._series.attachPrimitive(tool);
	}

	/**
	 * Subscribes to all necessary browser DOM events and Lightweight Charts API events.
	 * @private
	 */
	private _subscribeToChartEvents(): void {
		const chartElement = this._chart.chartElement();

		// 1. Raw DOM Events for Drag/Click Detection and Editing (capturing phase)
		chartElement.addEventListener('mousedown', this._boundHandleMouseDown, true);
		chartElement.addEventListener('mousemove', this._boundHandleMouseMove, true);
		chartElement.addEventListener('mouseleave', this._boundHandleMouseLeave, true);

		window.addEventListener('mouseup', this._boundHandleMouseUp);

		// 2. LWC API Events for Ghosting/Hover/DBLClick
		this._chart.subscribeDblClick(this._boundHandleDblClick);
		this._chart.subscribeCrosshairMove(this._boundHandleCrosshairMove);

		// Global Listeners for Persistent Key State
		window.addEventListener('keydown', this._boundHandleKeyDown);
		window.addEventListener('keyup', this._boundHandleKeyUp);
	}
/**
	 * Releases all chart, window, and DOM listeners owned by this interaction manager
	 * and severs internal API references so the chart/series can be garbage collected.
	 */
	public destroy(): void {
		if (this._isDestroyed) { return; }
		this._isDestroyed = true;

		const chartElement = this._chart.chartElement();

		// 1. Remove DOM Listeners (using the exact same capturing flags)
		chartElement.removeEventListener('mousedown', this._boundHandleMouseDown, true);
		chartElement.removeEventListener('mousemove', this._boundHandleMouseMove, true);
		chartElement.removeEventListener('mouseleave', this._boundHandleMouseLeave, true);

		window.removeEventListener('mouseup', this._boundHandleMouseUp);
		window.removeEventListener('keydown', this._boundHandleKeyDown);
		window.removeEventListener('keyup', this._boundHandleKeyUp);

		// 2. Remove Chart Subscriptions
		this._chart.unsubscribeDblClick(this._boundHandleDblClick);
		this._chart.unsubscribeCrosshairMove(this._boundHandleCrosshairMove);

		// 3. Abort any active creation or editing gestures
		this._resetInteractionStateFully();

		// 4. SEVER THE GUTS (break circular references)
		(this._chart as any) = null;
		(this._series as any) = null;
		(this._horzScaleBehavior as any) = null;
		(this._plugin as any) = null;
		(this._tools as any) = null;
		(this._toolRegistry as any) = null;

		// 5. Clear local references
		this._hoveredTool = null;
		this._selectedTool = null;
		this._currentToolCreating = null;
		this._currentGlobalPoint = null;
	}

	/**
	 * Handles global `keydown`/`keyup` events, tracking the Shift key state.
	 * Delegated to `./events`.
	 * @private
	 */
	private _handleKey(event: KeyboardEvent): void {
		handleKey.call(this, event);
	}

	/**
	 * Detaches a line tool primitive from the chart and cleans up internal references.
	 */
	public detachTool(tool: BaseLineTool<HorzScaleItem>): void {
		// 1. Remove from Lightweight Charts rendering pipeline (from its associated pane)
		try {
			tool.getPane().detachPrimitive(tool);
		} catch (e: any) {
			console.error(`[InteractionManager] Error detaching primitive for tool ${tool.id()}:`, e.message);
		}

		// 2. Clear internal references if this tool was the one being tracked
		if (this._currentToolCreating === tool) {
			this._currentToolCreating = null;
		}
		if (this._selectedTool === tool) {
			// Trigger the deselection event before nulling the variable
			this._plugin.fireSingleClickEvent(this._selectedTool, 'deselected');
			this._selectedTool = null;
		}
		if (this._hoveredTool === tool) {
			this._hoveredTool = null;
		}

		// Reset interaction state if the removed tool was being dragged/edited
		if (this._draggedTool === tool || this._creationTool === tool) {
			this._isEditing = false;
			this._isCreationGesture = false;
			this._draggedTool = null;
			this._creationTool = null;
			this._draggedPointIndex = null;
			this._originalDragLogicalIndices = null;
			this._mouseDownPoint = null;
			this._mouseDownTime = 0;
			this._isDrag = false;

			// Re-enable chart's handleScroll if it was disabled for dragging
			this._chart.applyOptions({
				handleScroll: {
					pressedMouseMove: true,
				},
			});
		}
	}
/**
	 * Calculates the "Snapped" Y-coordinate and exact price based on data in the active
	 * pane. Delegated to `./magnet`.
	 * @private
	 */
	private _getSnappedY(x: number, y: number): { y: Coordinate; price?: number } {
		return getSnappedYForManager.call(this, x, y);
	}

	/**
	 * Finalizes a just-finished tool creation. Delegated to `./creation`.
	 * @private
	 */
	private _finalizeToolCreation(tool: BaseLineTool<HorzScaleItem>): void {
		finalizeToolCreation.call(this, tool);
	}

	/**
	 * Handles the initial `mousedown` event. Delegated to `./events`.
	 * @private
	 */
	private _handleMouseDown(event: MouseEvent): void {
		handleMouseDown.call(this, event);
	}

	/**
	 * Handles the `mousemove` event. Delegated to `./events`.
	 * @private
	 */
	private _handleMouseMove(event: MouseEvent): void {
		handleMouseMove.call(this, event);
	}

	/**
	 * Handles the `mouseup` event. Delegated to `./events`.
	 * @private
	 */
	private _handleMouseUp(event: MouseEvent): void {
		handleMouseUp.call(this, event);
	}

	/**
	 * Clears creation-gesture flags only. Delegated to `./creation`.
	 * @private
	 */
	private _resetCreationGestureStateOnly(): void {
		resetCreationGestureStateOnly.call(this);
	}

	/**
	 * Clears state tied to an active editing/dragging session. Delegated to `./editing`.
	 * @private
	 */
	private _resetEditingGestureStateOnly(): void {
		resetEditingGestureStateOnly.call(this);
	}

	/**
	 * Clears the fundamental mouse gesture state. Delegated to `./creation`.
	 * @private
	 */
	private _resetCommonGestureState(): void {
		resetCommonGestureState.call(this);
	}

	/**
	 * Performs a complete reset of all interaction state flags.
	 * @private
	 */
	private _resetInteractionStateFully(): void {
		this._resetCreationGestureStateOnly();
		this._resetEditingGestureStateOnly();
		this.setCurrentToolCreating(null);
		this.deselectAllTools();
		this._plugin.requestUpdate();
	}

	/**
	 * Processes a discrete click outside an active creation/editing gesture.
	 * Delegated to `./events`.
	 * @private
	 */
	private _handleStandaloneClick(point: Point): void {
		handleStandaloneClick.call(this, point);
	}

	/**
	 * Handles the chart's double-click event broadcast. Delegated to `./events`.
	 * @private
	 */
	private _handleDblClick(params: MouseEventParams<HorzScaleItem>): void {
		handleDblClick.call(this, params);
	}

	/**
	 * Handles the chart's crosshair move event. Delegated to `./events`.
	 * @private
	 */
	private _handleCrosshairMove(params: MouseEventParams<HorzScaleItem>): void {
		handleCrosshairMove.call(this, params);
	}

	/**
	 * Performs a hit test on all visible line tools. Delegated to `./events`.
	 * @private
	 */
	private _hitTest(point: Point): { tool: BaseLineTool<HorzScaleItem>, pointIndex: number | null, suggestedCursor: PaneCursorType | null } | null {
		return hitTest.call(this, point);
	}

	/**
	 * Clears the selection state of the currently selected tool, if one exists.
	 */
	public deselectAllTools(): void {
		if (this._selectedTool) {
			// SNAPSHOT: Store the reference before we nullify it
			const toolToDeselect = this._selectedTool;

			this._selectedTool.setSelected(false);
			this._selectedTool = null;

			// Fire the event using the snapshot so we have access to the ID and type
			this._plugin.fireSingleClickEvent(toolToDeselect, 'deselected');

			this._plugin.requestUpdate();
		}
	}

	/**
	 * Converts a raw browser MouseEvent into a chart-relative Point.
	 * Delegated to `./coordinate`.
	 * @private
	 */
	private _eventToPoint(event: MouseEvent): Point | null {
		return eventToPointForManager.call(this, event);
	}

	/**
	 * Handles the 'mouseleave' event on the chart container. Delegated to `./events`.
	 * @private
	 */
	private _handleMouseLeave(event: MouseEvent): void {
		handleMouseLeave.call(this, event);
	}

	/**
	 * Vertical offset of the current series' pane. Delegated to `./coordinate`.
	 * @private
	 */
	private _getActivePaneYOffset(): number {
		return getActivePaneYOffset.call(this);
	}

	/**
	 * Height of the current series' pane. Delegated to `./coordinate`.
	 * @private
	 */
	private _getActivePaneHeight(): number {
		return getActivePaneHeight.call(this);
	}

	/**
	 * Validates if a global Y-coordinate is within the active pane's bounds.
	 * Delegated to `./coordinate`.
	 * @private
	 */
	private _isMouseInActivePane(y: number): boolean {
		return isMouseInActivePane.call(this, y);
	}

	/**
	 * Vertical offset for a specific tool's pane. Delegated to `./coordinate`.
	 * @private
	 */
	private _getPaneYOffsetForTool(tool: BaseLineTool<HorzScaleItem>): number {
		return getPaneYOffsetForTool.call(this, tool);
	}
}