// /rendering/rectangle-renderer.ts

/**
 * This file contains the RectangleRenderer: a generic, reusable canvas renderer for
 * axis-aligned rectangles (Rectangle tool, Fib Retracement / Price Range band fills),
 * which can be composited to build more complex line tools.
 *
 * Extracted verbatim from the "Rectangle Renderer" region of generic-renderers.ts.
 */

import { Coordinate, LineStyle } from 'lightweight-charts';
import {
	CanvasRenderingTarget2D,
	MediaCoordinatesRenderingScope,
	IPaneRenderer,
	LineToolHitTestData,
	HitTestResult,
	HitTestType,
	PaneCursorType,
} from '../types';
import { fillRectWithBorder } from '../utils/canvas-helpers';
import { Point, Box, distanceToSegment, pointInBox } from '../utils/geometry';
import { AnchorPoint } from './line-anchor-renderer';


// Common interaction tolerance for hit-testing lines and borders
const interactionTolerance = {
	line: 4, // Make the line hit-test a bit more forgiving
};

// #region Rectangle Renderer
// =================================================================================================================
// Used for drawing axis-aligned rectangles (like Rectangle tool, Fib bands, etc.)

/**
 * Data structure required by the {@link RectangleRenderer}.
 *
 * It defines the axis-aligned rectangle via its two defining diagonal points, styling (border/background),
 * and behavior (horizontal extensions for Fibs or Price Range tools).
 */
export interface RectangleRendererData {
	points: [AnchorPoint, AnchorPoint]; // Top-left and bottom-right defining points
	background?: { color: string; inflation?: { x: number; y: number; } }; // Optional background, including inflation
	border?: { color: string; width: number; style: LineStyle; radius?: number | number[]; highlight?: boolean }; // Optional border
	extend?: { left: boolean; right: boolean }; // Optional line extensions
	hitTestBackground?: boolean;
	toolDefaultHoverCursor?: PaneCursorType; // For hovering over border
	toolDefaultDragCursor?: PaneCursorType;  // For dragging background
}

/**
 * Renders an axis-aligned rectangular shape.
 *
 * This renderer is primarily used for the Rectangle drawing tool, as well as for drawing the
 * background fills of range tools like Fib Retracements and Price Ranges.
 *
 * @typeParam HorzScaleItem - The type of the horizontal scale item.
 */
export class RectangleRenderer<HorzScaleItem> implements IPaneRenderer {
	protected _data: RectangleRendererData | null = null;
	private _mediaSize: { width: number; height: number; } = { width: 0, height: 0 };
	private _hitTest: HitTestResult<LineToolHitTestData>;
	
	/**
	 * Initializes the Rectangle Renderer.
	 *
	 * @param hitTest - An optional, pre-configured {@link HitTestResult} template that will be returned on a successful hit.
	 */
	public constructor(hitTest?: HitTestResult<LineToolHitTestData>) {
		this._hitTest = hitTest || new HitTestResult(HitTestType.MovePoint);
	}
	
	/**
	 * Sets the data payload required to draw and hit-test the rectangle.
	 *
	 * @param data - The {@link RectangleRendererData} containing the points and styling options.
	 * @returns void
	 */
	public setData(data: RectangleRendererData): void {
		this._data = data;
	}
	
	/**
	 * Draws the rectangle onto the chart pane, handling background fill, borders, and horizontal extensions.
	 *
	 * This relies on the core `fillRectWithBorder` canvas helper for drawing the shape with proper pixel alignment.
	 *
	 * @param target - The {@link CanvasRenderingTarget2D} provided by Lightweight Charts.
	 * @returns void
	 */
	public draw(target: CanvasRenderingTarget2D): void {
		if (!this._data || this._data.points.length < 2) return;
		
		target.useMediaCoordinateSpace(({ context: ctx, mediaSize }: MediaCoordinatesRenderingScope) => {
			this._mediaSize = mediaSize; // Store mediaSize for hitTest
			const { border, background, extend, points } = this._data!;
			const [point0, point1] = points;
			
			const borderWidth: number = border?.width as number || 0;
			const borderColor = border?.color;
			const backgroundColor = background?.color;
			const borderStyle = border?.style || LineStyle.Solid;
			const borderRadius = border?.radius || 0;
			
			if (borderWidth <= 0 && !backgroundColor) return; // Nothing to draw
			
			// Call fillRectWithBorder, passing all relevant options
			fillRectWithBorder(
			ctx,
			point0,
			point1,
			backgroundColor,
			borderColor,
			borderWidth,
			borderStyle,
			borderRadius,
			'center', // Border alignment, often 'center' for rects
			!!extend?.left,
			!!extend?.right,
			mediaSize.width
			);
		});
	}
	
	/**
	 * Performs a hit test on the four border segments and the optional background fill area of the rectangle.
	 *
	 * It correctly accounts for horizontal extensions when checking the top and bottom borders.
	 *
	 * @param x - The X coordinate for the hit test.
	 * @param y - The Y coordinate for the hit test.
	 * @returns A {@link HitTestResult} if the rectangle is hit, otherwise `null`.
	 */
	public hitTest(x: Coordinate, y: Coordinate): HitTestResult<LineToolHitTestData> | null {
		
		//console.log(`[RectangleRenderer] hitTest called at X:${x}, Y:${y}`);
		
		// FIX: Corrected initial null/data/point length check
		if (!this._data || this._data.points.length < 2 || !this._mediaSize.width || !this._mediaSize.height) {
			return null;
		}
		
		const { extend, points, hitTestBackground, toolDefaultHoverCursor, toolDefaultDragCursor } = this._data!;
		const [point0, point1] = points;
		
		// Extract min/max values for coordinates, ensuring they are typed as Coordinate again
		const minX = Math.min(point0.x, point1.x) as Coordinate;
		const maxX = Math.max(point0.x, point1.x) as Coordinate;
		const minY = Math.min(point0.y, point1.y) as Coordinate;
		const maxY = Math.max(point0.y, point1.y) as Coordinate;
		
		const clickedPoint = new Point(x, y);
		
		const lineTolerance = interactionTolerance.line;
		
		// Re-calculate the specific corner points as Coordinates
		const topLeft = new Point(minX, minY);
		const topRight = new Point(maxX, minY);
		const bottomLeft = new Point(minX, maxY);
		const bottomRight = new Point(maxX, maxY);
		
		// Hit-testing the actual segments of the rectangle's border
		// Note: extend?.left/right are booleans, so the !! conversion is fine.
		// The logic can be simplified by defining temporary points for start/end of segment for hit test.
		
		// Hit-testing the actual segments of the rectangle's border
		const suggestedHoverCursor = toolDefaultHoverCursor || PaneCursorType.Pointer;
		
		// Top line: check between (minX, minY) and (maxX, minY), with extension accounted for
		const htTopLeft = new Point(extend?.left ? 0 as Coordinate : minX, minY);
		const htTopRight = new Point(extend?.right ? this._mediaSize.width as Coordinate : maxX, minY);
		if (distanceToSegment(htTopLeft, htTopRight, clickedPoint).distance <= lineTolerance) {
			//console.log(`[RectangleRenderer] *** HIT DETECTED on top border! Suggesting cursor: ${suggestedHoverCursor}`);
			return new HitTestResult(HitTestType.MovePoint, { pointIndex: null, suggestedCursor: suggestedHoverCursor });
		}
		
		// Bottom line: check between (minX, maxY) and (maxX, maxY), with extension accounted for
		const htBottomLeft = new Point(extend?.left ? 0 as Coordinate : minX, maxY);
		const htBottomRight = new Point(extend?.right ? this._mediaSize.width as Coordinate : maxX, maxY);
		if (distanceToSegment(htBottomLeft, htBottomRight, clickedPoint).distance <= lineTolerance) {
			//console.log(`[RectangleRenderer] *** HIT DETECTED on bottom border! Suggesting cursor: ${suggestedHoverCursor}`);
			return new HitTestResult(HitTestType.MovePoint, { pointIndex: null, suggestedCursor: suggestedHoverCursor });
		}
		
		// Left line: check between (minX, minY) and (minX, maxY) (no horizontal extension here for vertical lines)
		if (distanceToSegment(topLeft, bottomLeft, clickedPoint).distance <= lineTolerance) {
			//console.log(`[RectangleRenderer] *** HIT DETECTED on left border! Suggesting cursor: ${suggestedHoverCursor}`);
			return new HitTestResult(HitTestType.MovePoint, { pointIndex: null, suggestedCursor: suggestedHoverCursor });
		}
		
		// Right line: check between (maxX, minY) and (maxX, maxY) (no horizontal extension here for vertical lines)
		if (distanceToSegment(topRight, bottomRight, clickedPoint).distance <= lineTolerance) {
			//console.log(`[RectangleRenderer] *** HIT DETECTED on right border! Suggesting cursor: ${suggestedHoverCursor}`);
			return new HitTestResult(HitTestType.MovePoint, { pointIndex: null, suggestedCursor: suggestedHoverCursor });
		}
		
		// Check if point is inside the rectangle (for background hit)
		// FIX: Corrected Box constructor call to pass two Point objects
		if (hitTestBackground && pointInBox(clickedPoint, new Box(topLeft, bottomRight))) {
			const suggestedDragCursor = toolDefaultDragCursor || PaneCursorType.Grabbing;
			//console.log(`[RectangleRenderer] *** HIT DETECTED on background! Suggesting cursor: ${suggestedDragCursor}`);
			return new HitTestResult(HitTestType.MovePointBackground, { pointIndex: null, suggestedCursor: suggestedDragCursor });
		}
		
		return null;
	}
}

// #endregion
