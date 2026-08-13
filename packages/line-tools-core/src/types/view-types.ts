// /src/types/view-types.ts

import { Size, Coordinate } from './geometry-types';
import { HitTestResult } from './hit-test-types';
import { ISeriesPrimitiveAxisView } from 'lightweight-charts';

/**
 * Defines where in the visual layer stack a renderer should be executed relative to the series.
 *
 * - `'bottom'`: Drawn behind the series data.
 * - `'normal'`: Drawn at the same level as the series (default).
 * - `'top'`: Drawn above the series data.
 */
export type PrimitivePaneViewZOrder = 'bottom' | 'normal' | 'top';

/**
 * The fundamental interface for an object that draws on the chart's pane.
 * This mirrors the Lightweight Charts `IPrimitivePaneRenderer` interface.
 *
 * Specific renderers (like `SegmentRenderer` or `RectangleRenderer`) implement this to
 * handle the actual Canvas 2D API calls.
 */
export interface IPrimitivePaneRenderer {
	/**
	 * Method to draw the main content of the element.
	 * @param target - The rendering target provided by Lightweight Charts.
	 */
	draw(target: CanvasRenderingTarget2D): void;
	/**
	 * Optional method to draw the background.
	 * @param target - The rendering target provided by Lightweight Charts.
	 */
	drawBackground?(target: CanvasRenderingTarget2D): void;
    // Note: hitTest is part of IPaneRenderer in our core-plugin, not IPrimitivePaneRenderer in LWChart's internal definitions
	/**
	 * Optional method to clear/reset the renderer's internal state.
	 * Used during tool destruction to prevent memory leaks or stale references.
	 */
	clear?(): void;
}

/**
 * Interface for a view component that provides a renderer for a specific chart pane.
 *
 * Objects returned by `BaseLineTool.paneViews()` must conform to this interface.
 * It links the tool's data model to a visual renderer and defines the Z-order.
 */
export interface IPaneView { // Renaming to IPrimitivePaneView as per LWCharts standard
	/**
	 * Returns a renderer object to be used for drawing this view.
	 * @returns An `IPrimitivePaneRenderer` object, or `null` if nothing to draw.
	 */
	renderer(): IPrimitivePaneRenderer | null;
	/**
	 * Defines where in the visual layer stack the renderer should be executed.
	 * @returns The desired position in the visual layer stack.
	 */
	zOrder?(): PrimitivePaneViewZOrder;
}

/**
 * An extended `IPaneView` that supports explicit update signals.
 *
 * This allows the tool to notify specific views that their data or options have changed
 * and internal caches (like calculated screen coordinates) should be invalidated before the next draw.
 */
export interface IUpdatablePaneView extends IPaneView {
	/**
	 * Signals that the view's data or state has changed and it needs to be updated.
	 * @param updateType - Optional type of update ('data' | 'other' | 'options').
	 */
	update(updateType?: 'data' | 'other' | 'options'): void;

	/**
	 * Optional. Updates the view's internal reference to the series.
	 * Crucial for multi-pane setups where the series API might be re-instantiated or moved.
	 * @param series - The new ISeriesApi instance.
	 */
	updateSeries?(series: any): void; // We use 'any' here to avoid circular generic type complexity
}

/**
 * Context provided to a renderer callback when drawing in **media coordinates** (CSS pixels).
 *
 * In this scope, 1 unit equals 1 CSS pixel. The canvas logic handles the device pixel ratio scaling
 * automatically. This is the preferred scope for most line tool drawing operations.
 */
export interface MediaCoordinatesRenderingScope {
	context: CanvasRenderingContext2D;
	mediaSize: Size;
}

/**
 * Context provided to a renderer callback when drawing in **bitmap coordinates** (physical device pixels).
 *
 * In this scope, coordinates map 1:1 to the canvas buffer pixels. You must manually account for
 * `horizontalPixelRatio` and `verticalPixelRatio` to ensure sharp rendering on high-DPI screens.
 * Used for crisp rendering of 1px lines or pixel-perfect alignment.
 */
export interface BitmapCoordinatesRenderingScope {
	context: CanvasRenderingContext2D;
	bitmapSize: Size;
	horizontalPixelRatio: number;
	verticalPixelRatio: number;
	mediaSize: Size; // Often included for reference even in bitmap space
}

/**
 * A wrapper around the HTML Canvas 2D Context provided by Lightweight Charts to plugins.
 *
 * It abstracts the complexity of high-DPI rendering by providing methods to execute drawing code
 * in either a "Media" (CSS pixel) or "Bitmap" (Physical pixel) coordinate space.
 */
export interface CanvasRenderingTarget2D {
	/**
	 * Executes drawing logic within the media coordinate space.
	 * @param callback - A function receiving a `MediaCoordinatesRenderingScope`.
	 */
	useMediaCoordinateSpace(callback: (scope: MediaCoordinatesRenderingScope) => void): void;

	/**
	 * Executes drawing logic within the bitmap coordinate space.
	 * @param callback - A function receiving a `BitmapCoordinatesRenderingScope`.
	 */
	useBitmapCoordinateSpace(callback: (scope: BitmapCoordinatesRenderingScope) => void): void;
}

/**
 * An extended renderer interface that adds Hit Testing capabilities.
 *
 * While `IPrimitivePaneRenderer` handles drawing, `IPaneRenderer` allows the plugin's
 * `InteractionManager` to determine if a mouse event occurred over the rendered object
 * via the `hitTest` method.
 */
export interface IPaneRenderer extends IPrimitivePaneRenderer {
	/**
	 * Performs a hit test on the rendered object. Returns a hit-test result if the coordinates fall within the object.
	 * This must be implemented by concrete renderers.
	 * @param x - The X coordinate to test.
	 * @param y - The Y coordinate to test.
	 * @returns A `HitTestResult` object if hit, otherwise `null`.
	 */
	hitTest?(x: Coordinate, y: Coordinate): HitTestResult<any> | null;
}

/**
 * Interface for a text measurement caching utility.
 *
 * Used by axis renderers to optimize performance by avoiding repetitive canvas `measureText` calls
 * for strings that haven't changed (e.g., price labels during a drag operation).
 */
export interface TextWidthCache {
	measureText(ctx: CanvasRenderingContext2D, text: string, optimizationReplacementRe?: RegExp): number;
	reset(): void;
}

/**
 * Shared data required by a Price Axis View renderer.
 *
 * Contains properties that define the physical position and base styling of the label,
 * including the critical `coordinate` and the optional `fixedCoordinate` used for stacking.
 */
export interface PriceAxisViewRendererCommonData {
	activeBackground?: string;
	background: string;
	color: string;
	coordinate: number;
	fixedCoordinate?: number;
}

/**
 * Specific content data for a single Price Axis View label.
 *
 * Defines the actual text to display, visibility flags, and border colors.
 * This is separated from `CommonData` to allow for split views (e.g., axis label vs. pane label).
 */
export interface PriceAxisViewRendererData {
	visible: boolean;
	text: string;
	tickVisible: boolean;
	moveTextToInvisibleTick: boolean;
	borderColor: string;
	lineWidth?: number;
}

/**
 * Visual styling configuration for Price Axis labels.
 *
 * Encapsulates font settings, padding, border sizes, and tick mark dimensions.
 * Typically derived from the chart's global layout options.
 */
export interface PriceAxisViewRendererOptions {
	baselineOffset: number;
	borderSize: number;
	font: string;
	fontFamily: string;
	color: string;
	fontSize: number;
	paddingBottom: number;
	paddingInner: number;
	paddingOuter: number;
	paddingTop: number;
	tickLength: number;
}

/**
 * Interface for a renderer responsible for drawing labels on the Price Axis.
 *
 * Implementing classes must provide a `draw` method to render the label onto the canvas target
 * and a `height` method to assist with layout calculations.
 */
export interface IPriceAxisViewRenderer {
	draw(
		target: CanvasRenderingTarget2D,
		rendererOptions: PriceAxisViewRendererOptions,
		textWidthCache: TextWidthCache,
		width: number,
		align: 'left' | 'right'
	): void;

	height(rendererOptions: PriceAxisViewRendererOptions, useSecondLine: boolean): number;
	// FIX: Make commonData optional to accommodate renderers that might not need it,
	// like PriceAxisBackgroundRenderer.
	setData(data: PriceAxisViewRendererData, commonData?: PriceAxisViewRendererCommonData): void;
}

/**
 * Visual styling configuration for Time Axis labels.
 *
 * Encapsulates font settings, padding, and border sizes specific to the time scale.
 */
export interface TimeAxisViewRendererOptions {
	baselineOffset: number;
	borderSize: number;
	font: string;
	fontSize: number;
	paddingBottom: number;
	paddingTop: number;
	tickLength: number;
	paddingHorizontal: number;
	widthCache?: TextWidthCache;
}

/**
 * Data payload required to render a label on the Time Axis.
 *
 * Includes the text, x-coordinate, dimensions, and colors for the specific time point.
 */
export interface TimeAxisViewRendererData {
	width: number;
	text: string;
	coordinate: number;
	color: string;
	background: string;
	visible: boolean;
	/**
	 * Controls the visibility of the small vertical line (tick) that appears 
	 * above or in the center of the label box.
	 * 
	 * This is typically enabled for tool anchor points but disabled for 
	 * supplemental crosshair labels to match native chart aesthetics.
	 * 
	 * @defaultValue true
	 */
	tickVisible?: boolean;
}

/**
 * Interface for a renderer responsible for drawing labels on the Time Axis.
 *
 * Implementing classes handle the drawing logic for the time scale labels,
 * typically reacting to the tool's anchor points.
 */
export interface ITimeAxisViewRenderer {
	draw(target: CanvasRenderingTarget2D, rendererOptions: TimeAxisViewRendererOptions): void;
	setData(data: TimeAxisViewRendererData): void;
	height(rendererOptions: TimeAxisViewRendererOptions): number;
}

/**
 * A strictly typed interface for a Price Axis View component.
 *
 * This acts as the bridge between a Line Tool's data model and the visual renderer.
 * It extends the standard `ISeriesPrimitiveAxisView` but enforces the implementation of
 * specific getters (like `text()`, `coordinate()`) and the renderer factory method.
 */
export interface IPriceAxisView extends ISeriesPrimitiveAxisView {
    update(): void;
    getRenderer(): IPriceAxisViewRenderer;
    getPaneRenderer(): IPriceAxisViewRenderer; // For titles on the pane side
    height(rendererOptions: PriceAxisViewRendererOptions, useSecondLine: boolean): number;
    getFixedCoordinate(): Coordinate;
    setFixedCoordinate(value: Coordinate): void;

    // Explicitly re-declare methods from ISeriesPrimitiveAxisView to ensure implementing classes provide them.
    text(): string;
    coordinate(): Coordinate;
    textColor(): string;
    backColor(): string;
    visible(): boolean;
    // tickVisible is optional on ISeriesPrimitiveAxisView, so we don't force it here unless needed internally for all.
}

/**
 * A strictly typed interface for a Time Axis View component.
 *
 * Similar to `IPriceAxisView`, this manages the lifecycle and data provision for
 * labels appearing on the horizontal Time Scale.
 */
export interface ITimeAxisView extends ISeriesPrimitiveAxisView {
    update(): void;
    getRenderer(): ITimeAxisViewRenderer; // For time axis renderer

    // Explicitly re-declare methods from ISeriesPrimitiveAxisView.
    text(): string;
    coordinate(): Coordinate;
    textColor(): string;
    backColor(): string;
    visible(): boolean;
    // tickVisible is optional on ISeriesPrimitiveAxisView.
}

