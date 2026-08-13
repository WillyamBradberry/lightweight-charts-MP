// /rendering/polygon-renderer.ts

/**
 * This file contains the PolygonRenderer: a generic, reusable canvas renderer for
 * multi-point shapes and paths (like Brush, Highlighter, and Path/Polyline tools),
 * which can be composited to build more complex line tools.
 *
 * Extracted verbatim from the "Polygon Renderer" region of generic-renderers.ts.
 */

import { Coordinate, LineStyle } from 'lightweight-charts';
import {
	CanvasRenderingTarget2D,
	MediaCoordinatesRenderingScope,
	IPaneRenderer,
	LineToolHitTestData,
	LineOptions,
	LineEnd,
	HitTestResult,
	HitTestType,
	PaneCursorType,
} from '../types';
import {
	drawArrowEnd, setLineStyle, drawCircleEnd
} from '../utils/canvas-helpers';
import { Point, distanceToSegment, pointInPolygon } from '../utils/geometry';
import { AnchorPoint } from './line-anchor-renderer';


// Common interaction tolerance for hit-testing lines and borders
const interactionTolerance = {
	line: 4, // Make the line hit-test a bit more forgiving
};

// #region Polygon Renderer
// =================================================================================================================
// Used for drawing multi-point shapes that can be filled (like Brush and Path tools)

/**
 * Data structure required by the {@link PolygonRenderer}.
 *
 * It defines a shape or path consisting of multiple points, including the line style
 * for the perimeter and background options for the fill.
 */
export interface PolygonRendererData {
	points: AnchorPoint[];
	line: LineOptions; // Uses complete LineOptions from types.ts
	background?: { color: string }; // Simplified BackgroundOptions for direct color
	hitTestBackground?: boolean;
	toolDefaultHoverCursor?: PaneCursorType;
	toolDefaultDragCursor?: PaneCursorType;
	enclosePerimeterWithLine?: boolean;
}

/**
 * Renders an open or closed shape/path defined by an array of points.
 *
 * This is used for complex freehand tools like Brush, Highlighter, and Path/Polyline.
 * It supports drawing the line perimeter, filling the background, and defining line end decorations.
 *
 * @typeParam HorzScaleItem - The type of the horizontal scale item.
 */
export class PolygonRenderer<HorzScaleItem> implements IPaneRenderer {
	protected _data: PolygonRendererData | null = null;
	protected _hitTest: HitTestResult<LineToolHitTestData>;
	private _mediaSize: { width: number; height: number; } = { width: 0, height: 0 };
	
	/**
	 * Initializes the Polygon Renderer.
	 *
	 * @param hitTest - An optional, pre-configured {@link HitTestResult} template that will be returned on a successful hit.
	 */
	public constructor(hitTest?: HitTestResult<LineToolHitTestData>) {
		this._hitTest = hitTest || new HitTestResult(HitTestType.MovePoint);
	}
	
	/**
	 * Sets the data payload required to draw and hit-test the polygon.
	 *
	 * @param data - The {@link PolygonRendererData} containing the points and styling options.
	 * @returns void
	 */
	public setData(data: PolygonRendererData): void {
		this._data = data;
	}
	
	/**
	 * Draws the polygon path, including drawing the background fill and stroking the line perimeter.
	 *
	 * This handles both open paths (Polyline, Brush) and closed shapes (if `enclosePerimeterWithLine` is set).
	 *
	 * @param target - The {@link CanvasRenderingTarget2D} provided by Lightweight Charts.
	 * @returns void
	 */
	public draw(target: CanvasRenderingTarget2D): void {
		if (!this._data || !this._data.points || this._data.points.length < 1) { return; }
		
		target.useMediaCoordinateSpace(({ context: ctx, mediaSize }: MediaCoordinatesRenderingScope) => {
			this._mediaSize = mediaSize; // Store mediaSize for hitTest
			const { line, background, points } = this._data!;
			const pointsCount = points.length; // Get points count
			
			ctx.beginPath();
			ctx.lineCap = line.cap || 'butt'; // Apply lineCap from options
			ctx.lineJoin = line.join || 'miter'; // Apply lineJoin from options
			ctx.lineWidth = line.width as number || 1; // Ensure LineWidth is number
			ctx.strokeStyle = line.color || 'white';
			setLineStyle(ctx, line.style || LineStyle.Solid); // Apply lineStyle
			
			ctx.moveTo(points[0].x, points[0].y);
			for (const point of points) {
				ctx.lineTo(point.x, point.y);
			}
			
			if (background?.color) { // Apply background color from options
				ctx.fillStyle = background.color;
				ctx.fill();
			}
			
			if (this._data!.enclosePerimeterWithLine) {
				ctx.closePath();
			}
			
			if (ctx.lineWidth > 0) {
				ctx.stroke();
			}
			
			// LINE ENDS (ARROWHEAD) START
			if (pointsCount >= 2) {
				const startPoint = points[0];     // P0
				const secondPoint = points[1];    // P1
				const endPoint = points[pointsCount - 1]; // Pn
				const segmentStart = points[pointsCount - 2]; // Pn-1
				const lineWidth = line.width as number || 1;
				const style = line.style || LineStyle.Solid;
				
				// End of Path (line.end.right) - Pointing at Pn
				if (line.end?.right === LineEnd.Arrow) {
					// drawArrowEnd(tail, head, ctx, width, style)
					drawArrowEnd(segmentStart, endPoint, ctx, lineWidth, style);
				} else if (line.end?.right === LineEnd.Circle) {
					drawCircleEnd(endPoint, ctx, lineWidth);
				}
				
				// Start of Path (line.end.left) - Pointing at P0
				if (line.end?.left === LineEnd.Arrow) {
					// drawArrowEnd(tail, head, ctx, width, style) -> Draw arrow pointing from P1 to P0
					drawArrowEnd(secondPoint, startPoint, ctx, lineWidth, style);
				} else if (line.end?.left === LineEnd.Circle) {
					drawCircleEnd(startPoint, ctx, lineWidth);
				}
			}
			//LINE ENDS (ARROWHEAD) END
		});
	}
	
	/**
	 * Performs a hit test on the polygon's line segments and its optional background fill area.
	 *
	 * For fills, it uses the robust ray casting algorithm (`pointInPolygon`) to check for hits.
	 *
	 * @param x - The X coordinate for the hit test.
	 * @param y - The Y coordinate for the hit test.
	 * @returns A {@link HitTestResult} if the polygon is hit, otherwise `null`.
	 */
	public hitTest(x: Coordinate, y: Coordinate): HitTestResult<LineToolHitTestData> | null {
		if (!this._data || !this._data.points || this._data.points.length < 1 || !this._mediaSize.width || !this._mediaSize.height) {
			return null;
		}
		
		const point = new Point(x, y);
		const { points, background, hitTestBackground, toolDefaultHoverCursor, toolDefaultDragCursor } = this._data; // NEW: Get default cursors
		
		// Hit test line segments (perimeter)
		for (let i = 1; i < points.length; i++) {
			if (distanceToSegment(points[i - 1], points[i], point).distance <= interactionTolerance.line) {
				const suggestedCursor = toolDefaultHoverCursor || PaneCursorType.Pointer;
				return new HitTestResult(HitTestType.MovePoint, { pointIndex: null, suggestedCursor });
			}
		}
		// Also check from last point to first point to close the shape for hit testing
		if (points.length > 2 && distanceToSegment(points[points.length - 1], points[0], point).distance <= interactionTolerance.line) {
			const suggestedCursor = toolDefaultHoverCursor || PaneCursorType.Pointer;
			return new HitTestResult(HitTestType.MovePoint, { pointIndex: null, suggestedCursor });
		}
		
		// Hit test background
		if (hitTestBackground && background?.color && points.length > 2 && pointInPolygon(point, points)) {
			const suggestedCursor = toolDefaultDragCursor || PaneCursorType.Grabbing;
			return new HitTestResult(HitTestType.MovePointBackground, { pointIndex: null, suggestedCursor });
		}
		
		return null;
	}
}

// #endregion
