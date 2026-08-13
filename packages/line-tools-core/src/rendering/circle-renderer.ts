// /rendering/circle-renderer.ts

/**
 * This file contains the CircleRenderer: a generic, reusable canvas renderer for
 * drawing circles defined by a center point and a point on the circumference
 * (like the Circle tool), which can be composited to build more complex line tools.
 *
 * Extracted verbatim from the "Circle Renderer" region of generic-renderers.ts.
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
import { setLineStyle } from '../utils/canvas-helpers';
import { Point } from '../utils/geometry';
import { AnchorPoint } from './line-anchor-renderer';


// Common interaction tolerance for hit-testing lines and borders
const interactionTolerance = {
	line: 4, // Make the line hit-test a bit more forgiving
};

// #region Circle Renderer
// =================================================================================================================
// Used for drawing circles (like the Circle tool)

/**
 * Data structure required by the {@link CircleRenderer}.
 *
 * It defines the circle's geometry via two points (Center Point and a point on the Circumference),
 * and includes styling for the background fill and border stroke.
 */
export interface CircleRendererData {
	points: [AnchorPoint, AnchorPoint]; // Point0: center, Point1: a point on circumference
	background?: { color: string };
	border?: { color: string; width: number; style: LineStyle; };
	hitTestBackground?: boolean;
	toolDefaultHoverCursor?: PaneCursorType;
	toolDefaultDragCursor?: PaneCursorType; 
}

/**
 * Renders an arbitrary circle defined by two points.
 *
 * This supports hit testing on both the circle's perimeter (border) and its interior (background fill).
 *
 * @typeParam HorzScaleItem - The type of the horizontal scale item.
 */
export class CircleRenderer<HorzScaleItem> implements IPaneRenderer {
	protected _data: CircleRendererData | null = null;
	private _mediaSize: { width: number; height: number; } = { width: 0, height: 0 };
	protected _hitTest: HitTestResult<LineToolHitTestData>;
	
	/**
	 * Initializes the Circle Renderer.
	 *
	 * @param hitTest - An optional, pre-configured {@link HitTestResult} template.
	 */
	public constructor(hitTest?: HitTestResult<LineToolHitTestData>) {
		this._hitTest = hitTest || new HitTestResult(HitTestType.MovePoint);
		// console.log("CircleRenderer constructor called");
	}
	
	/**
	 * Sets the data payload required to draw and hit-test the circle.
	 *
	 * @param data - The {@link CircleRendererData} containing the points and styling options.
	 * @returns void
	 */
	public setData(data: CircleRendererData): void {
		this._data = data;
		// console.log("CircleRenderer setData", data);
	}
	
	/**
	 * Draws the circle onto the chart pane, handling both the background fill and the border stroke.
	 *
	 * The radius is dynamically calculated as the distance between the two input points.
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
			const { background, border, points } = this._data!;
			const [point0, point1] = points;
			
			const centerX = point0.x;
			const centerY = point0.y;
			const radius = point0.subtract(point1).length(); // Distance from center to circumference point
			
			if (radius <= 0) { // Don't draw if radius is zero or negative
				return;
			}
			
			// Background fill
			if (background?.color) {
				ctx.fillStyle = background.color;
				ctx.beginPath();
				ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
				ctx.fill();
			}
			
			// Border stroke
			if (border?.width && border.width > 0 && border.color) {
				ctx.strokeStyle = border.color;
				ctx.lineWidth = border.width as number; // Ensure LineWidth is number
				setLineStyle(ctx, border.style || LineStyle.Solid); // Apply line style
				ctx.beginPath();
				ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
				ctx.stroke();
			}
		});
	}
	
	/**
	 * Performs a hit test on the circle's perimeter and its optional background fill area.
	 *
	 * Perimeter hit testing uses a tolerance around the calculated radius.
	 *
	 * @param x - The X coordinate for the hit test.
	 * @param y - The Y coordinate for the hit test.
	 * @returns A {@link HitTestResult} if the circle is hit, otherwise `null`.
	 */
	public hitTest(x: Coordinate, y: Coordinate): HitTestResult<LineToolHitTestData> | null {
		if (!this._data || !this._data.points || this._data.points.length < 2 || !this._mediaSize.width || !this._mediaSize.height) {
			return null;
		}
		
		const { points, hitTestBackground, toolDefaultHoverCursor, toolDefaultDragCursor } = this._data;
		const [point0, point1] = points;
		
		const clickedPoint = new Point(x, y);
		const centerX = point0.x;
		const centerY = point0.y;
		const radius = point0.subtract(point1).length();
		
		if (radius <= 0) {
			return null;
		}
		
		const distanceToCenter = new Point(centerX, centerY).subtract(clickedPoint).length();
		const lineWidth = this._data.border?.width || 0;
		const hitTestTolerance = interactionTolerance.line; // Use general line tolerance
		
		// Check if point is near the circle's outline (border)
		if (Math.abs(distanceToCenter - radius) <= hitTestTolerance) {
			// NEW: Return LineToolHitTestData with suggestedCursor
			const suggestedCursor = toolDefaultHoverCursor || PaneCursorType.Pointer;
			return new HitTestResult(HitTestType.MovePoint, { pointIndex: null, suggestedCursor });
		}
		
		// Check if point is inside the circle (for background hit)
		if (hitTestBackground && distanceToCenter < radius) {
			// NEW: Return LineToolHitTestData with suggestedCursor
			const suggestedCursor = toolDefaultDragCursor || PaneCursorType.Grabbing;
			return new HitTestResult(HitTestType.MovePointBackground, { pointIndex: null, suggestedCursor });
		}
		
		return null;
	}
}

// #endregion
