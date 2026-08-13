// /src/types/core-types.ts

import { Size, Logical, FirstValue, Point, Coordinate } from './geometry-types';
import { PaneCursorType } from './hit-test-types';
import { IPriceAxisView, IPaneView, ITimeAxisView } from './view-types';
import { TextOptions } from './options-types';
import { AnchorPoint } from '../rendering/line-anchor-renderer';
import { IPriceScaleApi, LineStyle } from 'lightweight-charts';

/**
 * A simplified interface representing the public API of a chart pane.
 * Used to identify which pane a tool is attached to and retrieve its index.
 */
export interface IPaneApi {
    paneIndex(): number;
    // Add other IPaneApi methods if your plugin needs to call them (e.g., addSeries, removeSeries)
    // For dimensions, we will use IChartWidgetBase.paneSize()
}

/**
 * Interface for the internal ChartWidget structure.
 * Provides access to pane dimensions and the underlying chart model.
 */
export interface IChartWidgetBase {

	// This method returns a list of objects that represent individual pane widgets.
    // Each pane widget object will expose a 'getSize()' method for its dimensions.
    paneWidgets(): { getSize(): Size }[]; // Returns array of objects with getSize() method
    // Add other properties/methods from ChartWidget that LineToolsCorePlugin might eventually need
    // For instance, a direct reference to the ChartModel can be useful:
    model(): any; // Return type of model() is ChartModel<HorzScaleItem> (internal type)
                  // We use 'any' here as we're defining this interface abstractly.
                  // This is a trade-off: allows compile without full ChartModel import chain.

    // If you need applyOptions or other chart-level functions on the widget, they should be added here
    // applyOptions(options: any): void; // If core-plugin calls this on _chartWidget
}

/**
 * Defines the margins (in pixels or percentages) to apply above and below
 * the visible price range during autoscaling.
 */
export interface AutoScaleMargins {
    below: number;
    above: number;
}

/**
 * Represents the calculated price range and margins required to display
 * a specific set of data or tools within the current viewport.
 */
export interface AutoscaleInfo {
    priceRange: any; // Simplified: type should be PriceRange, but not strictly necessary here.
    margins?: AutoScaleMargins;
}

/**
 * Internal interface for objects that calculate autoscale information.
 * Includes methods to retrieve the raw `AutoscaleInfo` structure.
 */
export interface AutoscaleInfoImpl {
    priceRange(): any; // Simplified
    margins(): AutoScaleMargins | null;
    toRaw(): AutoscaleInfo;
}

/**
 * Interface for formatting price values into strings.
 * Used by axis views to generate the labels displayed on the price scale.
 */
export interface IPriceFormatter {
    format(price: number): string;
    formatTickmarks(prices: readonly number[]): string[];
}

/**
 * Represents a data source attached to the chart model.
 * A data source is responsible for providing renderable views (pane, price axis, time axis)
 * and calculating its own autoscale requirements.
 */
export interface IDataSource {
    priceScale(): IPriceScaleApi | null;
    zorder(): number;
    setZorder(value: number): void;
    updateAllViews(): void;
    priceAxisViews(): readonly IPriceAxisView[];
    paneViews(): readonly IPaneView[];
    timeAxisViews(): readonly ITimeAxisView[];
    visible(): boolean;
    labelPaneViews?(): readonly IPaneView[];
    topPaneViews?(): readonly IPaneView[];
    autoscaleInfo(startTimePoint: Logical, endTimePoint: Logical): AutoscaleInfo | null; // Ensure this line is present and correct
    base(): number;
    firstValue(): FirstValue | null;
    formatter(): IPriceFormatter;
    priceLineColor(lastBarColor: string): string;
    model(): any; // Reference to Chart Model, as needed by PriceDataSource
}

/**
 * Data required by the `RectangleRenderer` to draw a rectangular shape.
 *
 * This structure defines the geometry (via two defining points), styling (background/border),
 * and behavior (extensions, cursors) for tools like Rectangles, Price Ranges, or specialized
 * fills like Fibonacci bands.
 */
export interface RectangleRendererData {
	points: [AnchorPoint, AnchorPoint]; // Top-left and bottom-right defining points
	background?: { color: string }; 
	border?: { color: string; width: number; style: LineStyle; radius?: number | number[]; highlight?: boolean };
	extend?: { left: boolean; right: boolean };
	hitTestBackground?: boolean;
	toolDefaultHoverCursor?: PaneCursorType;
	toolDefaultDragCursor?: PaneCursorType;
}

/**
 * Data required by the `CircleRenderer` to draw a circle.
 *
 * The geometry is defined by two points: the Center point and a Radius point (a point on the circumference).
 * It includes options for filling the circle and stroking the border.
 */
export interface CircleRendererData {
	points: [Point, Point]; // [0] Center Point, [1] Radius Point (in screen coordinates)
	background?: { color: string };
	border?: { color: string; width: number; style: LineStyle; };
	hitTestBackground?: boolean;
	toolDefaultHoverCursor?: PaneCursorType;
	toolDefaultDragCursor?: PaneCursorType;
}

/**
 * Data required by the `TextRenderer` to draw advanced text elements.
 *
 * Unlike simple canvas text, this structure supports rich text features including:
 * - A surrounding box with border/background.
 * - Word wrapping.
 * - Rotation.
 * - Custom padding and alignment relative to the anchor points.
 */
export interface TextRendererData {
	text: TextOptions;
	points: Point[];
	hitTestBackground?: boolean;
	toolDefaultHoverCursor?: PaneCursorType;
	toolDefaultDragCursor?: PaneCursorType;
}

/**
 * Configuration used to instantiate interaction anchors (resize handles).
 *
 * This data is passed to the `createLineAnchor` factory method in views. It defines
 * where the anchors are located and what cursor should be displayed when hovering over them.
 */
export interface LineAnchorCreationData {
	points: AnchorPoint[];
	defaultAnchorHoverCursor?: PaneCursorType;
	defaultAnchorDragCursor?: PaneCursorType;
}

/**
 * Represents the visual state of the supplemental crosshair label.
 * 
 * This is used internally by the Core Plugin to manage the hand-off 
 * between the native chart label and our injected one.
 */
export interface CrosshairLabelState {
	/** The formatted time string (e.g., "2023-05-01 14:30"). */
	text: string;
	/** The pixel X-coordinate on the time axis. */
	coordinate: Coordinate;
	/** Whether the supplemental label should be drawn. */
	visible: boolean;
}

/**
 * Advanced configuration for the Culling Engine (Viewability Check).
 *
 * By default, tools are culled based on their bounding box. For complex shapes (like Polylines),
 * a bounding box check might be too aggressive (hiding the tool when a segment passes through the screen
 * but the corners are off-screen).
 *
 * This interface allows tools to define specific `subSegments` to check against the viewport for accurate visibility.
 */
export interface LineToolCullingInfo {
    /**
     * An array of point index pairs [start_index, end_index] that define line segments.
     * The tool is visible if AT LEAST ONE of these segments is visible.
     * This forces the culling engine to use the robust 2-point extension logic on these segments.
     */
    subSegments?: number[][];
    
    // Add other properties later if needed (e.g., area/polygon visibility check)
}

/**
 * Internal data structure used by the `PriceAxisLabelStackingManager`.
 *
 * Contains the geometry and identification of a price axis label, allowing the manager
 * to detect collisions and calculate vertical offsets to prevent overlapping labels.
 */
export interface LabelDataForStacking {
	id: string; // Unique identifier for this specific label instance (e.g., toolId-pointIndex)
	toolId: string; // The ID of the BaseLineTool this label belongs to
	originalCoordinate: Coordinate; // The Y-coordinate the label *wants* to be at (before stacking)
	height: number; // The height of the label in pixels
	// Callback to update the label's fixed coordinate, provided by the view itself.
	// This allows the manager to tell the view where to actually draw itself.
	setFixedCoordinate: (coordinate: Coordinate | undefined) => void;
	isVisible: () => boolean; // Function to check if the label is currently visible
}

/**
 * Defines the active infinite lines for a single-point tool.
 *
 * Used by tools like "Horizontal Line", "Vertical Line", or "Cross Line".
 * Since a single point has no dimensions, this tells the culling engine that the tool actually
 * extends infinitely in the specified directions, ensuring it isn't hidden when the anchor point is off-screen.
 */
export interface SinglePointOrientation {
	horizontal: boolean;
	vertical: boolean;
}

