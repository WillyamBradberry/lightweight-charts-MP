// /rendering/text-renderer.ts

/**
 * This file contains the TextRenderer: a generic, reusable canvas renderer for
 * text labels and their surrounding boxes (multi-line wrap, alignment, rotation,
 * scaling, borders, backgrounds, drop shadows, and rotated-box hit testing).
 *
 * Extracted verbatim from the "Text Renderer" region of generic-renderers.ts.
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
	TextRendererData,
	TextAlignment,
	BoxHorizontalAlignment,
	BoxVerticalAlignment,
} from '../types';
import { drawRoundRect } from '../utils/canvas-helpers';
import {
	getScaledBoxPaddingX,
	getScaledBoxPaddingY,
	getScaledBackgroundInflationX,
	getScaledBackgroundInflationY,
	getScaledPadding,
	getScaledFontSize,
	getBoxWidth,
	getBoxHeight,
	textWrap,
	isFullyTransparent,
	isRtl,
	getFontAwareScale,
	cacheCanvas,
	createCacheCanvas,
} from '../utils/text-helpers';
import { ensureNotNull, ensureDefined } from '../utils/helpers';
import {
	Point,
	Box,
	distanceToSegment,
	pointInBox,
	pointInPolygon,
	rotatePoint,
	equalPoints,
} from '../utils/geometry';
import { LinesInfo, FontInfo, BoxSize, InternalData } from './text-renderer-types';


// #region Text Renderer
// =================================================================================================================
// Used for drawing text labels with boxes, rotation, etc.

/**
 * Renders complex text and its surrounding box.
 *
 * This powerful renderer supports multi-line word wrapping, custom alignment to a parent rectangle,
 * rotation, scaling, borders, background fills, and drop shadows, making it suitable for all text-based tools.
 *
 * @typeParam HorzScaleItem - The type of the horizontal scale item.
 */
export class TextRenderer<HorzScaleItem> implements IPaneRenderer {

	protected _internalData: InternalData | null = null;
	protected _polygonPoints: Point[] | null = null;
	protected _linesInfo: LinesInfo | null = null;
	protected _fontInfo: FontInfo | null = null;
	protected _boxSize: BoxSize | null = null;
	// _data is already present from previous implementation
	protected _data: TextRendererData | null = null;
	private _forceInvalidate: boolean = false; 

	protected _hitTest: HitTestResult<LineToolHitTestData>; // Uses LineToolHitTestData now
	private _mediaSize: { width: number; height: number; } = { width: 0, height: 0 }; // Still needed for screen dimensions

	/**
	 * Initializes the Text Renderer.
	 *
	 * @param hitTest - An optional, pre-configured {@link HitTestResult} template.
	 */	
	public constructor(hitTest?: HitTestResult<LineToolHitTestData>) {
		// HitTestResult for MovePoint will be the default for the text box body
		this._hitTest = hitTest || new HitTestResult(HitTestType.MovePoint);
	}

	/**
	 * Forces the renderer to ignore its internal cache during the next setData call.
	 */
	public forceInvalidate(): void {
		this._forceInvalidate = true;
	}	

	/**
	 * Sets the data payload required to draw and hit-test the text.
	 *
	 * This method includes logic to invalidate internal caches only when the relevant 
	 * parts of the new data differ from the old data, or if a manual invalidation 
	 * has been requested via forceInvalidate().
	 *
	 * @param data - The {@link TextRendererData} containing the content and styling.
	 * @returns void
	 */
	public setData(data: TextRendererData): void {
		// eslint-disable-next-line complexity
		function checkUnchanged(before: TextRendererData | null, after: TextRendererData | null): boolean {
			if (null === before || null === after) { return before === after;} // If both null, or one null one not
			if (before.points === undefined !== (after.points === undefined)) { return false; }

			if (before.points !== undefined && after.points !== undefined) {
				if (before.points.length !== after.points.length) { return false; }
				for (let i = 0; i < before.points.length; ++i) {
					if (before.points[i].x !== after.points[i].x || before.points[i].y !== after.points[i].y) { return false; }
				}
			}

			// Perform deep comparison for text options and cursor data
			// This part is crucial for cache invalidation
			return before.text?.forceCalculateMaxLineWidth === after.text?.forceCalculateMaxLineWidth
				&& before.text?.forceTextAlign === after.text?.forceTextAlign
				&& before.text?.wordWrapWidth === after.text?.wordWrapWidth
				&& before.text?.padding === after.text?.padding
				&& before.text?.value === after.text?.value
				&& before.text?.alignment === after.text?.alignment
				&& before.text?.font?.bold === after.text?.font?.bold
				&& before.text?.font?.size === after.text?.font?.size
				&& before.text?.font?.family === after.text?.font?.family
				&& before.text?.font?.italic === after.text?.font?.italic
				&& before.text?.box?.angle === after.text?.box?.angle
				&& before.text?.box?.scale === after.text?.box?.scale
				&& before.text?.box?.offset?.x === after.text?.box?.offset?.x
				&& before.text?.box?.offset?.y === after.text?.box?.offset?.y
				&& before.text?.box?.maxHeight === after.text?.box?.maxHeight
				&& before.text?.box?.padding?.x === after.text?.box?.padding?.x
				&& before.text?.box?.padding?.y === after.text?.box?.padding?.y
				&& before.text?.box?.alignment?.vertical === after.text?.box?.alignment?.vertical
				&& before.text?.box?.alignment?.horizontal === after.text?.box?.alignment?.horizontal
				// Check background inflation (now used)
				&& before.text?.box?.background?.inflation?.x === after.text?.box?.background?.inflation?.x
				&& before.text?.box?.background?.inflation?.y === after.text?.box?.background?.inflation?.y
				// Check border properties (now including radius and highlight)
				&& before.text?.box?.border?.highlight === after.text?.box?.border?.highlight
				&& JSON.stringify(before.text?.box?.border?.radius) === JSON.stringify(after.text?.box?.border?.radius) // For array comparison
				// Check new cursor properties
				&& before.toolDefaultHoverCursor === after.toolDefaultHoverCursor
				&& before.toolDefaultDragCursor === after.toolDefaultDragCursor
				// Check hitTestBackground
				&& before.hitTestBackground === after.hitTestBackground;
		}

		// LOGIC: If the tripwire is NOT set and nothing has changed geometrically, we keep the cache.
		if (!this._forceInvalidate && checkUnchanged(this._data, data)) {
			this._data = data; // If unchanged, just reassign for reference consistency
		} else {
			this._data = data; // Assign new data

			// Reset the tripwire so we don't clear the cache on every subsequent frame.
			this._forceInvalidate = false; 

			// Invalidate all caches
			this._polygonPoints = null;
			this._internalData = null;
			this._linesInfo = null;
			this._fontInfo = null;
			this._boxSize = null;
		}
	}

	/**
	 * Performs a hit test on the text box area.
	 *
	 * The logic first checks if the point falls inside the rotated box polygon and then checks proximity
	 * to the box's border segments. A border hit suggests moving the parent tool anchor(s), and an
	 * internal hit suggests dragging the entire text box (translation).
	 *
	 * @param x - The X coordinate for the hit test.
	 * @param y - The Y coordinate for the hit test.
	 * @returns A {@link HitTestResult} if the text box is hit, otherwise `null`.
	 */
	public hitTest(x: Coordinate, y: Coordinate): HitTestResult<LineToolHitTestData> | null {
		if (this._data === null || this._data.points === undefined || this._data.points.length === 0) {
			return null;
		}

		const hitPoint = new Point(x, y);
		const { text, toolDefaultHoverCursor, toolDefaultDragCursor, hitTestBackground } = this._data;

		// The calculated polygon points (4 corners of the rotated text box)
		const polygonPoints = this._getPolygonPoints();

		// Check if the point is inside the calculated polygon
		const isInsidePolygon = pointInPolygon(hitPoint, polygonPoints);
		
		// CRUCIAL FIX: Implement Border Hit Test for robustness, especially on zero-area input
		const borderWidth = text.box?.border?.width || 0;
		const borderHitTolerance = 4; // Add a small pixel tolerance for border clicks (e.g. 4px)
		let isNearBorder = false;

		// Check proximity to the four segments of the polygon
		for (let i = 0; i < polygonPoints.length; i++) {
			const p1 = polygonPoints[i];
			const p2 = polygonPoints[(i + 1) % polygonPoints.length];

			// Calculate the distance from the clicked point to the line segment
			const distance = distanceToSegment(p1, p2, hitPoint).distance;

			// If distance is within tolerance, it's a border hit
			if (distance <= borderWidth + borderHitTolerance) {
				isNearBorder = true;
				break;
			}
		}


		// --- Determine Hit Type based on location ---

		// 1. Hit the border (or near it) - This implies moving the line tool itself
		if (isNearBorder) {
			const suggestedCursor = toolDefaultHoverCursor || PaneCursorType.Pointer;
			// Use HitTestType.MovePoint for the border or general hover/drag.
			return new HitTestResult(HitTestType.MovePoint, { pointIndex: null, suggestedCursor });
		}
		
		// 2. Hit inside the polygon (background) - This implies dragging the whole tool
		if (isInsidePolygon && hitTestBackground) {
			const suggestedCursor = toolDefaultDragCursor || PaneCursorType.Grabbing;
			// Use HitTestType.MovePointBackground for drag.
			return new HitTestResult(HitTestType.MovePointBackground, { pointIndex: null, suggestedCursor });
		}
		

		return null;
	}	

	/**
	 * Calculates and retrieves the final pixel dimensions of the rendered text box.
	 *
	 * @returns The {@link BoxSize} (width and height) of the rendered element.
	 */
	public measure(): BoxSize {
		if (this._data === null) { return { width: 0, height: 0 }; }
		return this._getBoxSize();
	}

	/**
	 * Retrieves the bounding rectangle (x, y, width, height) of the text box in screen coordinates.
	 *
	 * This uses the cached internal data for position and size.
	 *
	 * @returns An object containing the top-left coordinate, width, and height of the bounding box.
	 */	
	public rect(): { x: number; y: number; width: number; height: number; } { // Using a simplified Rect type
		if (this._data === null) { return { x: 0, y: 0, width: 0, height: 0 }; }
		const internalData = this._getInternalData();
		return { x: internalData.boxLeft, y: internalData.boxTop, width: internalData.boxWidth, height: internalData.boxHeight };
	}

	/**
	 * Determines if the entire text box is positioned off-screen.
	 *
	 * This check first uses a simple AABB comparison and then, for more robust culling of rotated boxes,
	 * checks if all four corners of the rotated polygon are outside the viewport.
	 *
	 * @param width - The width of the visible pane area.
	 * @param height - The height of the visible pane area.
	 * @returns `true` if the text box is entirely off-screen, `false` otherwise.
	 */	
	public isOutOfScreen(width: number, height: number): boolean {
		if (null === this._data || void 0 === this._data.points || 0 === this._data.points.length) { return true; }

		const internalData = this._getInternalData();
		if (internalData.boxLeft + internalData.boxWidth < 0 || internalData.boxLeft > width) {
			const screenBox = new Box(new Point(0 as Coordinate, 0 as Coordinate), new Point(width as Coordinate, height as Coordinate));
			return this._getPolygonPoints().every((point: Point) => !pointInBox(point, screenBox));
		}
		return false;
	}

	/**
	 * Retrieves the cached CSS font string used for rendering and measurement (e.g., 'bold 12px sans-serif').
	 *
	 * @returns The computed font style string.
	 */	
	public fontStyle(): string {
		return this._data === null ? '' : this._getFontInfo().fontStyle;
	}

	/**
	 * Executes the word-wrapping logic for a given string, font, and maximum line width.
	 *
	 * This is primarily a proxy for the external `textWrap` utility function.
	 *
	 * @param test - The raw string content to wrap.
	 * @param wrapWidth - The maximum pixel width for a single line before wrapping.
	 * @param font - Optional font string to use for measurement.
	 * @returns An array of strings representing the final, wrapped lines.
	 */	
	public wordWrap(test: string, wrapWidth?: number, font?: string): string[] {
		// Calls the external textWrap helper function
		return textWrap(test, font || this.fontStyle(), wrapWidth);
	}

	/**
	 * Draws the complete text box element onto the chart pane.
	 *
	 * This method:
	 * 1. Saves the canvas context and applies rotation/translation transforms based on the box's configuration.
	 * 2. Draws the shadow, background fill, and border.
	 * 3. Draws each of the wrapped text lines.
	 * 4. Restores the canvas context.
	 *
	 * @param target - The {@link CanvasRenderingTarget2D} provided by Lightweight Charts.
	 * @returns void
	 */
	public draw(target: CanvasRenderingTarget2D): void {
		if (this._data === null || this._data.points === undefined || this._data.points.length === 0) { return; }

		target.useMediaCoordinateSpace(({ context: ctx, mediaSize }: MediaCoordinatesRenderingScope) => {
			this._mediaSize = mediaSize;
			const cssWidth = mediaSize.width;
			const cssHeight = mediaSize.height;

			if (this.isOutOfScreen(cssWidth, cssHeight)) { return; }

			const data = ensureNotNull(this._data); // Ensure _data is not null
			const textData = ensureNotNull(data.text);
			const internalData = this._getInternalData();
			const pivot = internalData.rotationPivot; // Use the stored rotationPivot
			const angleDegrees = textData.box?.angle || 0;
			const angle = -angleDegrees * Math.PI / 180; // Convert to radians, negative for clockwise rotation

			ctx.save(); // Save context before rotation/translation
			ctx.translate(pivot.x, pivot.y);
			ctx.rotate(angle);
			ctx.translate(-pivot.x, -pivot.y);

			// These variables are now ready for use, directly reflecting internalData.boxLeft/Top
			const scaledBoxLeft = internalData.boxLeft;
			const scaledBoxTop = internalData.boxTop;

			const scaledBoxWidth = internalData.boxWidth;
			const scaledBoxHeight = internalData.boxHeight;

			const borderRadius = textData.box?.border?.radius || 0; // Ensure radius is passed
			const boxBorderStyle = textData.box?.border?.style || LineStyle.Solid;

			// --- Shadow, Background, and Border Drawing ---
			// Draw order: Shadow (cast by fill) -> Fill -> Border -> Text

			// 1. Apply shadow properties if they exist and blur/color is set
			let shadowApplied = false; 
			if (textData.box?.shadow) {
				const shadow = textData.box.shadow;
				if (shadow.blur > 0 || !isFullyTransparent(shadow.color)) {
					ctx.shadowColor = shadow.color;
					ctx.shadowBlur = shadow.blur;
					ctx.shadowOffsetX = shadow.offset.x;
					ctx.shadowOffsetY = shadow.offset.y;
					shadowApplied = true;
				}
			}

			// 2. Draw box background (this will cast the shadow)
			if (textData.box?.background?.color && !isFullyTransparent(textData.box.background.color)) {
                ctx.fillStyle = textData.box.background.color;
                drawRoundRect(ctx, scaledBoxLeft, scaledBoxTop, scaledBoxWidth, scaledBoxHeight, borderRadius, boxBorderStyle);
                ctx.fill();
            }

			// 3. Reset shadow properties BEFORE drawing the border, so the border itself doesn't cast a shadow
			// and so the shadow only appears from the filled background.
			if (shadowApplied) { // Only reset if shadow was applied
				ctx.shadowColor = 'rgba(0, 0, 0, 0)';
				ctx.shadowBlur = 0;
				ctx.shadowOffsetX = 0;
				ctx.shadowOffsetY = 0;
			}

			// 4. Draw border
            if ((textData.box?.border?.width || 0) > 0 && textData.box?.border?.color && !isFullyTransparent(textData.box.border.color)) {
                ctx.strokeStyle = textData.box.border.color;
                ctx.lineWidth = textData.box.border.width;
                drawRoundRect(ctx, scaledBoxLeft, scaledBoxTop, scaledBoxWidth, scaledBoxHeight, borderRadius, boxBorderStyle);
                ctx.stroke();
            }

			// Draw text
			ctx.fillStyle = textData.font?.color;
			ctx.font = this._getFontInfo().fontStyle; // Use cached font string
			
			// FIX: Robustly map the stored string enum value to the correct Canvas literal string.
			// This addresses the issue of the tertiary operator failing to correctly resolve the center case.
			const alignValue = internalData.textAlign;
			let canvasAlign: CanvasTextAlign;

			if (alignValue === TextAlignment.Center) {
				canvasAlign = 'center';
			} else if (alignValue === TextAlignment.End || alignValue === TextAlignment.Right) {
				canvasAlign = 'right';
			} else { // Catches TextAlignment.Start, TextAlignment.Left, and any ambiguous default
				canvasAlign = 'left'; 
			}

			ctx.textAlign = canvasAlign; // Apply the explicit alignment
			ctx.textBaseline = 'middle';
			

			const { lines } = this._getLinesInfo();
			const linePadding = getScaledPadding(data);
			const scaledFontSize = getScaledFontSize(data);
			const extraSpace = 0.05 * scaledFontSize;

			// Apply extraSpace to the initial Y position
			let currentTextY = internalData.boxTop + internalData.textTop + extraSpace; // Start Y for first line

			for (const line of lines) {
				const textX = internalData.boxLeft + internalData.textStart; // Text X is always based on box position
				// Draw text with scaling to handle non-integer pixel ratios
				ctx.fillText(line, textX, currentTextY); // No need for drawScaled in V5 media space
				currentTextY += scaledFontSize + linePadding;
			}

			ctx.restore(); // Restore context to remove rotation/translation
		});
	}

	// #region Private/Protected Helper Methods (from V3.8)

	/**
	 * Calculates and caches the master internal state (`InternalData`) for positioning and drawing.
	 *
	 * This is a heavy calculation that:
	 * 1. Determines the final position (`boxLeft`, `boxTop`) based on the tool's anchor points and text box alignment/offset.
	 * 2. Determines the text alignment and start position within the box.
	 * 3. Calculates the `rotationPivot`.
	 *
	 * @returns The cached {@link InternalData} object.
	 * @private
	 */
	private _getInternalData(): InternalData {
		if (this._internalData !== null) { return this._internalData; }

		const data = ensureNotNull(this._data);

		const paddingX = getScaledBoxPaddingX(data);
		const paddingY = getScaledBoxPaddingY(data);
		const inflationPaddingX = getScaledBackgroundInflationX(data) + paddingX;
		const inflationPaddingY = getScaledBackgroundInflationY(data) + paddingY;

		//Check if two points are present but identical.
		const isDegenerate = data.points && data.points.length >= 2 && equalPoints(data.points[0], data.points[1]); 


		// Ensure we have at least one point, which is now expected to be the rectangle's top-left in the pane view context
		// However, for the new logic, we expect two points (rectangle's corners) to calculate parent bounds.
		//console.log('data.points', data.points)

		if (!data.points || data.points.length < 2 || isDegenerate) {
			// Fallback: Treat the first point as the anchor/reference for positioning.
			//console.warn('[TextRenderer] _getInternalData called with less than 2 points or degenerate. Using anchor-based alignment.');
			const boxSize = this._getBoxSize();
			const boxWidth = boxSize.width;
			const boxHeight = boxSize.height;
			const defaultAnchor = data.points && data.points.length > 0 ? data.points[0] : new Point(0 as Coordinate, 0 as Coordinate);

			// Recompute paddings (safe to re-call; mirrors main path)
			const paddingX = getScaledBoxPaddingX(data);
			const paddingY = getScaledBoxPaddingY(data);
			const inflationPaddingX = getScaledBackgroundInflationX(data) + paddingX;
			const inflationPaddingY = getScaledBackgroundInflationY(data) + paddingY;

			// --- Mirror Step 1: refX/Y from "degenerate rectangle" (single point as min=max) ---
			// For degenerate, rect bounds = defaultAnchor (no min/max calc needed)
			let refX: number = defaultAnchor.x as number;
			let refY: number = defaultAnchor.y as number;

			// But for HorizontalLine context, refX is already the desired pivot (0/center/paneWidth from pane view),
			// so no switch needed here—refX is the "attachment point".

			// --- Mirror Step 2: Offset boxLeft/Top from refX/Y based on box.alignment ---
			let textBoxFinalX = refX;
			let textBoxFinalY = refY;

			// Horizontal: Position box left edge relative to refX
			switch ((data.text?.box?.alignment?.horizontal || '').toLowerCase()) {
				case 'left':
					textBoxFinalX = refX; // Left edge at refX, expands right
					break;
				case 'center':
					textBoxFinalX = refX - boxWidth / 2; // Center at refX
					break;
				case 'right':
					textBoxFinalX = refX - boxWidth; // Right edge at refX, expands left
					break;
			}

			// Vertical: Position box top edge relative to refY (unchanged from original)
			switch ((data.text?.box?.alignment?.vertical || '').toLowerCase()) {
				case 'top':
					textBoxFinalY = refY - boxHeight; // Top at refY? Wait, original: Bottom at refY, expands up? No:
					// Per original: For Top: textBoxFinalY = refY - boxHeight (bottom at refY? Wait, clarify:
					// Original Vertical Top: "Bottom edge of text box aligns with refY. It expands up." → textBoxFinalY = refY - boxHeight
					// (Assuming Y increases down; box top at Y - height, bottom at Y)
					break;
				case 'middle':
					textBoxFinalY = refY - boxHeight / 2;
					break;
				case 'bottom':
					textBoxFinalY = refY;
					break;
			}

			// --- Mirror Step 3: Apply offset ---
			textBoxFinalX += (data.text?.box?.offset?.x || 0);
			textBoxFinalY += (data.text?.box?.offset?.y || 0);

			// --- Mirror Step 4: Internal text alignment/textStart (your existing switch) ---
			const rawAlignment = (ensureDefined(data.text?.alignment) || 'start').toLowerCase().trim();
			let textStart: number = inflationPaddingX; // Safe init
			let textAlign: TextAlignment = TextAlignment.Start;

			switch (rawAlignment) {
				case TextAlignment.Start:
				case TextAlignment.Left: {
					// FIX: Always assign TextAlignment.Start to maintain clean enum value.
					textAlign = TextAlignment.Start;
					textStart = inflationPaddingX;
					if (isRtl()) {
						if (data.text?.forceTextAlign) {
							// FIX: Ensure clean enum. Since it's forcing LTR start in RTL, use Start.
							textAlign = TextAlignment.Start; 
						} else {
							textStart = boxWidth - inflationPaddingX;
							// FIX: Use clean enum for RTL end.
							textAlign = TextAlignment.End; 
						}
					}
					break;
				}
				case TextAlignment.Center: {
					// FIX: Always assign TextAlignment.Center.
					textAlign = TextAlignment.Center;
					textStart = boxWidth / 2;
					break;
				}
				case TextAlignment.End:
				case TextAlignment.Right: {
					// FIX: Always assign TextAlignment.End.
					textAlign = TextAlignment.End;
					textStart = boxWidth - inflationPaddingX;
					if (isRtl() && data.text?.forceTextAlign) {
						// FIX: Ensure clean enum. Since it's forcing LTR end in RTL, use End.
						textAlign = TextAlignment.End; 
					}
					break;
				}
				default: {
					console.warn(`[TextRenderer] Unknown text alignment "${data.text?.alignment}" in fallback; defaulting to Start.`);
					textStart = inflationPaddingX;
					// FIX: Explicitly set default to clean enum.
					textAlign = TextAlignment.Start; 
				}
			}

			// Text Y (unchanged)
			const textTop = inflationPaddingY + getScaledFontSize(data) / 2;

			// --- Rotation Pivot: Use ref point (anchor) ---
			const rotationPivot = defaultAnchor;

			this._internalData = {
				boxLeft: textBoxFinalX,
				boxTop: textBoxFinalY,
				boxWidth: boxWidth,
				boxHeight: boxHeight,
				textAlign: textAlign,
				textTop: textTop,
				textStart: textStart,
				rotationPivot: rotationPivot,
			};
			return this._internalData;
		}

		const [rectPointA, rectPointB] = data.points; // These are the two defining points of the parent rectangle
		
		// Calculate the actual bounding box of the parent rectangle
		const rectMinX = Math.min(rectPointA.x, rectPointB.x);
		const rectMaxX = Math.max(rectPointA.x, rectPointB.x);
		const rectMinY = Math.min(rectPointA.y, rectPointB.y);
		const rectMaxY = Math.max(rectPointA.y, rectPointB.y);

		const boxSize = this._getBoxSize();
		const boxWidth = boxSize.width;
		const boxHeight = boxSize.height;

		let refX: number = 0; // Reference point on the parent rectangle for the text box
		let refY: number = 0;

		// --- Step 1: Determine the Reference Point on the Parent Rectangle ---
		switch ((data.text?.box?.alignment?.horizontal || '').toLowerCase()) {
			case BoxHorizontalAlignment.Left:
				refX = rectMinX;
				break;
			case BoxHorizontalAlignment.Center:
				refX = (rectMinX + rectMaxX) / 2;
				break;
			case BoxHorizontalAlignment.Right:
				refX = rectMaxX;
				break;
		}

		switch ((data.text?.box?.alignment?.vertical || '').toLowerCase()) {
			case BoxVerticalAlignment.Top:
				refY = rectMinY;
				break;
			case BoxVerticalAlignment.Middle:
				refY = (rectMinY + rectMaxY) / 2;
				break;
			case BoxVerticalAlignment.Bottom:
				refY = rectMaxY;
				break;
		}

		// --- Store this calculated reference point as the rotation pivot immediately ---
        const rotationPivot = new Point(refX as Coordinate, refY as Coordinate);

		let textBoxFinalX = refX;
		let textBoxFinalY = refY;

		// --- Step 2: Position the Text Box's Top-Left based on its own size and alignment to the Reference Point ---
		switch ((data.text?.box?.alignment?.horizontal || '').toLowerCase()) {
			case BoxHorizontalAlignment.Left:
				// Left edge of text box aligns with refX. It expands right.
				textBoxFinalX = refX;
				break;
			case BoxHorizontalAlignment.Center:
				// Center of text box aligns with refX.
				textBoxFinalX = refX - boxWidth / 2;
				break;
			case BoxHorizontalAlignment.Right:
				// Right edge of text box aligns with refX. It expands left.
				textBoxFinalX = refX - boxWidth;
				break;
		}

		switch ((data.text?.box?.alignment?.vertical || '').toLowerCase()) {
			case BoxVerticalAlignment.Top:
				// Bottom edge of text box aligns with refY. It expands up.
				textBoxFinalY = refY - boxHeight;
				break;
			case BoxVerticalAlignment.Middle:
				// Middle of text box aligns with refY.
				textBoxFinalY = refY - boxHeight / 2;
				break;
			case BoxVerticalAlignment.Bottom:
				// Top edge of text box aligns with refY. It expands down.
				textBoxFinalY = refY;
				break;
		}

		// --- Step 3: Apply `text.box.offset` as a final adjustment ---
		textBoxFinalX += (data.text?.box?.offset?.x || 0);
		textBoxFinalY += (data.text?.box?.offset?.y || 0);


		//let textX = 0; // X position for text rendering relative to textbox left
		//let textAlign = TextAlignment.Start;

		// --- Step 4: Determine internal text alignment within the textbox ---
		const rawAlignment = (ensureDefined(data.text?.alignment) || 'start').toLowerCase().trim(); // Normalize + fallback to 'start' + trim whitespace
		let textX: number = inflationPaddingX; // Safe init: padded left (better than 0)
		let textAlign: TextAlignment = TextAlignment.Start;

		switch (rawAlignment) {
			case 'start':
			case 'left': {
				textAlign = TextAlignment.Start;
				textX = inflationPaddingX;

				if (isRtl()) {
					if (data.text?.forceTextAlign) {
						textAlign = TextAlignment.Start;
					} else {
						textX = boxWidth - inflationPaddingX;
						textAlign = TextAlignment.End;
					}
				}
				break;
			}
			case 'center': {
				textAlign = TextAlignment.Center;
				textX = boxWidth / 2;
				break;
			}
			case 'end':
			case 'right': {
				textAlign = TextAlignment.End;
				textX = boxWidth - inflationPaddingX;

				if (isRtl() && data.text?.forceTextAlign) {
					textAlign = TextAlignment.End;
				}
				break;
			}
			default: {
				// Fallback + log for debugging
				console.warn(`[TextRenderer] Unknown text alignment "${data.text?.alignment}"; defaulting to Start (padded left).`);
				textX = inflationPaddingX;
				// Optionally force center for unknown: textAlign = TextAlignment.Center; textX = boxWidth / 2;
			}
		}

		// Calculate text start Y relative to box top. textBaseline is 'middle'
		const textY = inflationPaddingY + getScaledFontSize(data) / 2;


		this._internalData = {
			boxLeft: textBoxFinalX,
			boxTop: textBoxFinalY,
			boxWidth: boxWidth,
			boxHeight: boxHeight,
			textAlign: textAlign,
			textTop: textY, // Offset from box top to text middle
			textStart: textX, // Offset from box left to text start
			rotationPivot: rotationPivot,
		};

		return this._internalData;
	}

	/**
	 * Calculates the maximum pixel width among all wrapped lines of text.
	 *
	 * If word wrap is configured, this uses the fixed `wordWrapWidth` instead of measuring.
	 *
	 * @param lines - The array of wrapped text strings.
	 * @returns The maximum width in pixels.
	 * @private
	 */	
	private _getLinesMaxWidth(lines: string[]): number {
		const data = ensureNotNull(this._data); // Ensure data is not null for helper functions

		// Use text-helpers' createCacheCanvas and cacheCanvas
		createCacheCanvas();
		const ctx = ensureNotNull(cacheCanvas);
		ctx.font = this.fontStyle(); // Set font for accurate measurement

		if (data.text?.wordWrapWidth && !data.text?.forceCalculateMaxLineWidth) {
			return data.text.wordWrapWidth * getFontAwareScale(data);
		}

		let maxWidth = 0;
		for (const line of lines) {
			maxWidth = Math.max(maxWidth, ctx.measureText(line).width);
		}
		return maxWidth;
	}

	/**
	 * Calculates and caches the {@link LinesInfo} structure.
	 *
	 * This performs the word wrapping, checks for max height constraints (truncating lines if necessary),
	 * and calculates the max line width.
	 *
	 * @returns The cached {@link LinesInfo} object.
	 * @private
	 */	
	private _getLinesInfo(): LinesInfo {
		if (null === this._linesInfo) {
			const data = ensureNotNull(this._data);
			let lines = textWrap(ensureDefined(data.text?.value), this.fontStyle(), data.text?.wordWrapWidth);

			if (data.text?.box?.maxHeight !== undefined && data.text.box.maxHeight > 0) {
				const maxHeight = ensureDefined(data.text?.box?.maxHeight);
				const scaledFontSize = getScaledFontSize(data);
				const scaledPadding = getScaledPadding(data);

				// MODIFIED: Use V3.8's maxHeight calculation for maxLines
				// V3.8: maxLines = Math.floor((maxHeight + scaledPadding) / (scaledFontSize + scaledPadding));
				// This interprets maxHeight as the space *for the content*, and scaledPadding accounts for the space *between* lines.
				// If scaledPadding is 0, this simplifies to maxHeight / scaledFontSize.
				const lineHeightWithSpacing = scaledFontSize + scaledPadding;
				let maxLines: number;
				if (lineHeightWithSpacing > 0) { // Avoid division by zero
					maxLines = Math.floor((maxHeight + scaledPadding) / lineHeightWithSpacing);
				} else {
					maxLines = Infinity; // If no height/spacing per line, assume unlimited lines
				}
				
				if (lines.length > maxLines) {
					lines = lines.slice(0, maxLines); // Truncate lines
				}
			}

			this._linesInfo = { linesMaxWidth: this._getLinesMaxWidth(lines), lines };
		}
		return this._linesInfo;
	}

	/**
	 * Calculates and caches the {@link FontInfo} structure, including the final CSS font string and pixel size.
	 *
	 * This is used once to configure the drawing context and repeatedly for text width measurement.
	 *
	 * @returns The cached {@link FontInfo} object.
	 * @private
	 */	
	private _getFontInfo(): FontInfo {
		if (this._fontInfo === null) {
			const data = ensureNotNull(this._data);
			const fontSize = getScaledFontSize(data);
			const fontStyle = (data.text?.font?.bold ? 'bold ' : '') + (data.text?.font?.italic ? 'italic ' : '') + fontSize + 'px ' + ensureDefined(data.text?.font?.family);
			this._fontInfo = { fontStyle: fontStyle, fontSize: fontSize };
		}
		return this._fontInfo;
	}

	/**
	 * Calculates and caches the total pixel dimensions of the text box.
	 *
	 * This uses the results of `_getLinesInfo` and the configured padding/inflation options.
	 *
	 * @returns The cached {@link BoxSize} object.
	 * @private
	 */	
	private _getBoxSize(): BoxSize {
		if (null === this._boxSize) {
			const linesInfo = this._getLinesInfo();
			const data = ensureNotNull(this._data);
			this._boxSize = {
				width: getBoxWidth(data, linesInfo.linesMaxWidth),
				height: getBoxHeight(data, linesInfo.lines.length),
			};
		}
		return this._boxSize;
	}

	/**
	 * Calculates and caches the four corner points of the rotated text box bounding polygon in screen coordinates.
	 *
	 * This polygon is the basis for accurate hit testing on the rotated element.
	 *
	 * @returns An array of four {@link Point} objects defining the rotated bounding box.
	 * @private
	 */	
	private _getPolygonPoints(): Point[] {
		if (null !== this._polygonPoints) { return this._polygonPoints; }
		if (null === this._data) { return []; }

		const { boxLeft, boxTop, boxWidth, boxHeight } = this._getInternalData();
		const pivot = this._getRotationPoint();
		const angleDegrees = this._data.text?.box?.angle || 0;
		const angle = -angleDegrees * Math.PI / 180; // Convert to radians, negative for clockwise rotation

		this._polygonPoints = [
			rotatePoint(new Point(boxLeft as Coordinate, boxTop as Coordinate), pivot, angle),
			rotatePoint(new Point((boxLeft + boxWidth) as Coordinate, boxTop as Coordinate), pivot, angle),
			rotatePoint(new Point((boxLeft + boxWidth) as Coordinate, (boxTop + boxHeight) as Coordinate), pivot, angle),
			rotatePoint(new Point(boxLeft as Coordinate, (boxTop + boxHeight) as Coordinate), pivot, angle),
		];

		return this._polygonPoints;
	}

	/**
	 * Retrieves the pivot point in screen coordinates around which the text box is rotated.
	 *
	 * This point is calculated and stored in the internal data cache by `_getInternalData`.
	 *
	 * @returns A {@link Point} object representing the rotation pivot.
	 * @private
	 */
	private _getRotationPoint(): Point {
        // After changes in _getInternalData, the 'rotationPivot' already holds the correct
        // conceptual anchor point (e.g., line midpoint, or rectangle center).
        // This method now simply retrieves and returns that stored pivot.
		const internalData = this._getInternalData();
		return internalData.rotationPivot;
	}
	

	
}

// #endregion Private/Protected Helper Methods
