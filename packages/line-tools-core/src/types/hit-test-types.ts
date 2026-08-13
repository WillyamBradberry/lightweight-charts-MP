// /src/types/hit-test-types.ts

import { Point } from './geometry-types';

/**
 * Enum defining the standard CSS cursor styles supported by the chart.
 *
 * These values are returned by `hitTest` to instruct the chart to change the mouse cursor
 * (e.g., to 'pointer', 'grabbing', or 'ew-resize') when hovering over a tool.
 */
export enum PaneCursorType {
	Default = 'default',
	Crosshair = 'crosshair',
	Pointer = 'pointer',
	Grabbing = 'grabbing',
	VerticalResize = 'n-resize',
	HorizontalResize = 'e-resize',
	DiagonalNeSwResize = 'nesw-resize',
	DiagonalNwSeResize = 'nwse-resize',
	NotAllowed = 'not-allowed',
	Move = 'move',
	Auto = 'auto',
	None = 'none',
	ContextMenu = 'context-menu',
	Help = 'help',
	Progress = 'progress',
	Wait = 'wait',
	Cell = 'cell',
	Text = 'text',
	VerticalText = 'vertical-text',
	Alias = 'alias',
	Copy = 'copy',
	NoDrop = 'no-drop',
	Grab = 'grab',
	EResize = 'e-resize',
	NResize = 'n-resize',
	NeResize = 'ne-resize',
	NwResize = 'nw-resize',
	SResize = 's-resize',
	SeResize = 'se-resize',
	SwResize = 'sw-resize',
	WResize = 'w-resize',
	EwResize = 'ew-resize',
	NsResize = 'ns-resize',
	NeswResize = 'nesw-resize',
	NwseResize = 'nwse-resize',
	ColResize = 'col-resize',
	RowResize = 'row-resize',
	AllScroll = 'all-scroll',
	ZoomIn = 'zoom-in',
	ZoomOut = 'zoom-out',	
}

/**
 * Represents the successful result of a hit test on a rendered object.
 *
 * It encapsulates:
 * 1. The `type` of hit (e.g., did we hit an anchor point or the body?).
 * 2. Associated `data` (e.g., which specific anchor point index was clicked?).
 */
export class HitTestResult<T> {
	private _data: T | null;
	private _type: HitTestType;

	public constructor(type: HitTestType, data?: T) {
		this._type = type;
		this._data = data || null;
	}

	public type(): HitTestType {
		return this._type;
	}

	public data(): T | null {
		return this._data;
	}
}

/**
 * Categorizes the nature of a hit test result.
 *
 * - `Regular`: General hover (defaults to pointer).
 * - `MovePoint`: Hit an anchor or handle intended for resizing/moving a specific point.
 * - `MovePointBackground`: Hit the body/background intended for dragging the entire tool.
 * - `ChangePoint`: Specific variation often used for anchor resizing.
 * - `Custom`: Generic fallback for specialized tools.
 */
export enum HitTestType {
    Regular = 1,
    MovePoint = 2,
	MovePointBackground = 3,
    ChangePoint = 4,
    Custom = 5
}

/**
 * Defines the current state of user interaction with a line tool.
 *
 * This is used by the `InteractionManager` and the tool's constraint logic (e.g., `getShiftConstrainedPoint`)
 * to determine how input should be handled.
 *
 * - `Creation`: The user is actively drawing the tool (placing points).
 * - `Editing`: The user is dragging a specific anchor point to resize/reshape the tool.
 * - `Move`: The user is dragging the entire tool body to translate it.
 */
export enum InteractionPhase {
    /** The tool is currently being drawn by the user (ghost point is active). */
    Creation = 'creation',
    /** A point anchor is being dragged to modify the tool's geometry. */
    Editing = 'editing',
    /** The entire tool is being dragged/translated. (Shift constraint usually ignored here). */
    Move = 'move',
}

/**
 * Indicates which logical axis is currently controlling a geometric snap.
 *
 * - `'time'`: Snapping to a vertical time line (X-axis).
 * - `'price'`: Snapping to a horizontal price line (Y-axis).
 * - `'none'`: No specific axis snap is active.
 */
export type SnapAxis = 'time' | 'price' | 'none';

/**
 * The result returned by a geometric constraint calculation.
 *
 * When a user holds Shift while drawing, the tool calculates a corrected position.
 * This object contains:
 * 1. `point`: The new, constrained screen coordinates.
 * 2. `snapAxis`: A hint indicating if the constraint aligned to the Time or Price axis,
 *    allowing the `InteractionManager` to perform perfect logical locking.
 */
export interface ConstraintResult {
    point: Point;
    snapAxis: SnapAxis;
}

/**
 * Defines the user action required to finish creating a specific line tool.
 *
 * - `PointCount`: Automatically finishes when the required number of points (e.g., 2 for a Rectangle) are placed.
 * - `MouseUp`: Finishes immediately when the mouse button is released (used for "Drag-to-Create" or freehand tools like Brush).
 * - `DoubleClick`: Finishes when the user double-clicks (used for Polyline/Path tools with variable point counts).
 */
export enum FinalizationMethod {
	PointCount = 'pointCount',   // Finalize when BaseLineTool.pointsCount is reached (e.g., TrendLine, Rectangle)
	MouseUp = 'mouseUp',         // Finalize on mouse-up event after drag starts (e.g., Brush, Highlighter)
	DoubleClick = 'doubleClick', // Finalize on double-click (e.g., Path)
}

/**
 * The data payload returned when a hit test succeeds on a line tool.
 *
 * It provides context to the `InteractionManager` about what specifically was hit:
 * - `pointIndex`: If an anchor was hit, this is its index. `null` if the body was hit.
 * - `suggestedCursor`: The specific CSS cursor the tool requests for this hit (e.g., 'nwse-resize').
 */
export interface LineToolHitTestData {
	pointIndex: number | null;
	suggestedCursor?: PaneCursorType;
}
