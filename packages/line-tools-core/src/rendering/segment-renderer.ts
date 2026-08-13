// /rendering/segment-renderer.ts

/**
 * This file contains the SegmentRenderer: a generic, reusable canvas renderer for
 * straight line segments (Trend Lines, Rays, Arrows, Parallel Channels, etc.),
 * which can be composited to build more complex line tools.
 *
 * Extracted verbatim from the "Segment Renderer" region of generic-renderers.ts.
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
	drawArrowEnd, drawLine, drawVerticalLine, drawHorizontalLine,
	setLineStyle, drawCircleEnd
} from '../utils/canvas-helpers';
import { Point, extendAndClipLineSegment, distanceToSegment } from '../utils/geometry';
import { AnchorPoint } from './line-anchor-renderer';


// Common interaction tolerance for hit-testing lines and borders
const interactionTolerance = {
	line: 4, // Make the line hit-test a bit more forgiving
};

// #region Segment Renderer
// =================================================================================================================
// Used for drawing line segments (like Trend Lines, Rays, Arrows, Parallel Channels, etc.)

/**
 * Data structure required by the {@link SegmentRenderer}.
 *
 * It defines the geometry of a straight line segment, including its two defining points
 * and the complete set of styling options for drawing the line and its end caps.
 */
export interface SegmentRendererData {
	points: [AnchorPoint, AnchorPoint];
	line: LineOptions;
	toolDefaultHoverCursor?: PaneCursorType;
	toolDefaultDragCursor?: PaneCursorType;
}

/**
 * Renders a single straight line segment between two points.
 *
 * This renderer is highly versatile, supporting infinite extensions (Rays, Extended Lines, Horizontal/Vertical Lines),
 * line dashing/styling, and custom end caps (Arrows, Circles). It implements robust hit testing along the line path.
 *
 * @typeParam HorzScaleItem - The type of the horizontal scale item.
 */
export class SegmentRenderer<HorzScaleItem> implements IPaneRenderer {
	private _data: SegmentRendererData | null = null;
	private _mediaSize: { width: number; height: number; } = { width: 0, height: 0 };
	private _hitTest: HitTestResult<LineToolHitTestData>;
	
	/**
	 * Initializes the Segment Renderer.
	 *
	 * @param hitTest - An optional, pre-configured {@link HitTestResult} template that will be returned on a successful hit.
	 */
	public constructor(hitTest?: HitTestResult<LineToolHitTestData>) {
		this._hitTest = hitTest || new HitTestResult(HitTestType.MovePoint);
	}
	
	/**
	 * Sets the data payload required to draw and hit-test the segment.
	 *
	 * @param data - The {@link SegmentRendererData} containing the points and styling options.
	 * @returns void
	 */
	public setData(data: SegmentRendererData): void {
		this._data = data;
	}
	
	/**
	 * Draws the line segment onto the chart pane.
	 *
	 * This method calculates any necessary line extensions or viewport clipping before drawing
	 * the final segment, ensuring that the line stays within the visible area.
	 *
	 * @param target - The {@link CanvasRenderingTarget2D} provided by Lightweight Charts.
	 * @returns void
	 */
	public draw(target: CanvasRenderingTarget2D): void {
		if (!this._data || !this._data.points || this._data.points.length < 2) {
			return;
		}
		
		target.useMediaCoordinateSpace(({ context: ctx, mediaSize }: MediaCoordinatesRenderingScope) => {
			this._mediaSize = mediaSize; // Store mediaSize for hitTest
			const { line, points } = this._data!;
			const [point0, point1] = points;
			
			// Ensure LineWidth is treated as a number for ctx.lineWidth
			const lineWidth: number = line.width as number || 1;
			const lineColor = line.color || 'white';
			const lineStyle = line.style || LineStyle.Solid;
			
			ctx.lineCap = line.cap || 'butt'; // Apply lineCap from options, default to 'butt'
			ctx.lineJoin = line.join || 'miter'; // Apply lineJoin from options, default to 'miter'
			ctx.strokeStyle = lineColor;
			ctx.lineWidth = lineWidth;
			
			setLineStyle(ctx, lineStyle);
			
			// Draw line caps (arrows, circles) based on EndOptions
			// drawArrowEnd and drawCircleEnd assume ctx.lineWidth has been set.
			this._drawEnds(ctx, points, lineWidth, lineStyle); // Pass lineStyle to drawArrowEnd
			
			// Extend and clip the line segment based on options
			const extendedClippedSegment = extendAndClipLineSegment(
			point0,
			point1,
			mediaSize.width,
			mediaSize.height,
			!!line.extend?.left, // Convert boolean to real boolean
			!!line.extend?.right // Convert boolean to real boolean
			);
			
			if (extendedClippedSegment !== null && lineWidth > 0) {
				if (extendedClippedSegment instanceof Point) {
					// Segment degenerated to a single point. Do not draw a line.
					return;
				}
				
				const [start, end] = extendedClippedSegment; // Safe destructuring as it's not a Point
				
				// Use generic drawLine, which correctly picks solid/dashed
				// drawVerticalLine and drawHorizontalLine do not take style, they are low-level pixel operations
				if (start.x === end.x) {
					drawVerticalLine(ctx, start.x, start.y, end.y);
				} else if (start.y === end.y) {
					drawHorizontalLine(ctx, start.y, start.x, end.x);
				} else {
					drawLine(ctx, start.x, start.y, end.x, end.y, lineStyle);
				}
			}
		});
	}
	
	/**
	 * Performs a hit test along the entire rendered path of the line segment.
	 *
	 * This includes any extended or clipped portions of the line, providing a large enough
	 * tolerance to make clicking on the line easy.
	 *
	 * @param x - The X coordinate for the hit test.
	 * @param y - The Y coordinate for the hit test.
	 * @returns A {@link HitTestResult} if the coordinates are within the line's tolerance, otherwise `null`.
	 */
	public hitTest(x: Coordinate, y: Coordinate): HitTestResult<LineToolHitTestData> | null {
		if (!this._data || this._data.points.length < 2 || !this._mediaSize.width || !this._mediaSize.height) {
			return null;
		}
		
		const { line, points, toolDefaultHoverCursor } = this._data;
		const [point0, point1] = points;
		
		const extendedClippedSegment = extendAndClipLineSegment(
		point0,
		point1,
		this._mediaSize.width,
		this._mediaSize.height,
		!!line.extend?.left,
		!!line.extend?.right
		);
		
		if (extendedClippedSegment === null) {
			return null;
		}
		
		if (extendedClippedSegment instanceof Point) {
			if (extendedClippedSegment.subtract(new Point(x, y)).length() <= interactionTolerance.line) {
				const suggestedCursor = toolDefaultHoverCursor || PaneCursorType.Pointer;
				return new HitTestResult(this._hitTest.type(), { pointIndex: null, suggestedCursor });
			}
			return null;
		}
		
		// If it's a Segment (array of two points), proceed with segment hit-test.
		const [start, end] = extendedClippedSegment;
		if (distanceToSegment(start, end, new Point(x, y)).distance <= interactionTolerance.line) {
			const suggestedCursor = toolDefaultHoverCursor || PaneCursorType.Pointer;
			return new HitTestResult(this._hitTest.type(), { pointIndex: null, suggestedCursor });
		}
		
		return null;
	}
	
	/**
	 * Helper method to draw the decorative end caps (Arrow, Circle) specified in the `LineOptions`.
	 *
	 * This is performed before the main line segment to ensure Z-order correctness.
	 *
	 * @param ctx - The CanvasRenderingContext2D.
	 * @param points - The two defining points of the line.
	 * @param width - The line width for sizing the end caps.
	 * @param style - The line style, passed for correct arrow dashing consistency.
	 * @private
	 */
	private _drawEnds(ctx: CanvasRenderingContext2D, points: Point[], width: number, style: LineStyle): void {
		const lineOptions = this._data?.line;
		if (!lineOptions) return;
		
		// Note: drawArrowEnd needs the style to ensure consistent dashing for the arrow itself.
		if (lineOptions.end?.left === LineEnd.Arrow) {
			drawArrowEnd(points[1], points[0], ctx, width, style);
		} else if (lineOptions.end?.left === LineEnd.Circle) {
			drawCircleEnd(points[0], ctx, width);
		}
		
		if (lineOptions.end?.right === LineEnd.Arrow) {
			drawArrowEnd(points[0], points[1], ctx, width, style);
		} else if (lineOptions.end?.right === LineEnd.Circle) {
			drawCircleEnd(points[1], ctx, width);
		}
	}
}

// #endregion
