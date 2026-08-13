// /src/types/tool-types.ts

import { DeepPartial } from '../utils/helpers';
import { PaneCursorType } from './hit-test-types';
import {
	LineToolTrendLineOptions,
	LineToolCalloutOptions,
	LineToolHorizontalLineOptions,
	LineToolVerticalLineOptions,
	LineToolCrossLineOptions,
	LineToolRectangleOptions,
	LineToolCircleOptions,
	LineToolPriceRangeOptions,
	LineToolMarketDepthOptions,
	LineToolTriangleOptions,
	LineToolTextOptions,
	LineToolBrushOptions,
	LineToolHighlighterOptions,
	LineToolPathOptions,
	LineToolFibRetracementOptions,
	LineToolParallelChannelOptions,
	LongShortPositionOptions,
} from './options-types';

/**
 * The base configuration interface shared by all line tools.
 * Includes properties for visibility, interactivity (editable), and axis label behavior.
 */
export interface LineToolOptionsCommon {
	visible: boolean;
	editable: boolean;
	ownerSourceId?: string;
	defaultHoverCursor?: PaneCursorType;
	defaultDragCursor?: PaneCursorType;
	defaultAnchorHoverCursor?: PaneCursorType;
	defaultAnchorDragCursor?: PaneCursorType; 
	showPriceAxisLabels: boolean;
	showTimeAxisLabels: boolean;
	priceAxisLabelAlwaysVisible: boolean;
	timeAxisLabelAlwaysVisible: boolean;

	/**
	 * The distance in pixels within which the crosshair and tool anchors 
	 * will snap to the nearest OHLC (Open, High, Low, Close) price of a candle.
	 * 
	 * If the vertical distance between the mouse and a price point is less than 
	 * this threshold, the system overrides the raw mouse position with the 
	 * exact price coordinate. Set to 0 to disable snapping.
	 * 
	 * @defaultValue 0
	 */
	magnetThreshold?: number;

	[key: string]: any;
}

/**
 * A utility type that combines the common options (visibility, interactivity)
 * with the specific options structure for a given tool type `T`.
 */
export type LineToolOptions<T> = T & LineToolOptionsCommon;

/**
 * A utility type representing a Deep Partial version of the complete tool options.
 * This is used for input parameters (like `applyOptions`), allowing users to update
 * specific nested properties without providing the entire object.
 */
export type LineToolPartialOptions<T> = DeepPartial<T & LineToolOptionsCommon>;

/**
 * Alias for the complete options structure of a Path tool.
 */
export type PathToolOptions = LineToolOptions<LineToolPathOptions>;

/**
 * Alias for the complete options structure of a Brush tool.
 */
export type BrushToolOptions = LineToolOptions<LineToolBrushOptions>;

/**
 * Alias for the complete options structure of a Highlighter tool.
 */
export type HighlighterToolOptions = LineToolOptions<LineToolHighlighterOptions>;

/**
 * Alias for the complete options structure of a Text tool.
 */
export type TextToolOptions = LineToolOptions<LineToolTextOptions>;

/**
 * Alias for the complete options structure of a Trend Line tool.
 */
export type TrendLineToolOptions = LineToolOptions<LineToolTrendLineOptions>;

/**
 * Alias for the complete options structure of a Callout tool.
 */
export type CalloutToolOptions = LineToolOptions<LineToolCalloutOptions>;

/**
 * Alias for the complete options structure of a Cross Line tool.
 */
export type CrossLineToolOptions = LineToolOptions<LineToolCrossLineOptions>;

/**
 * Alias for the complete options structure of a Vertical Line tool.
 */
export type VerticalLineToolOptions = LineToolOptions<LineToolVerticalLineOptions>;

/**
 * Alias for the complete options structure of a Horizontal Line tool.
 */
export type HorizontalLineToolOptions = LineToolOptions<LineToolHorizontalLineOptions>;

/**
 * Alias for the complete options structure of a Rectangle tool.
 */
export type RectangleToolOptions = LineToolOptions<LineToolRectangleOptions>;

/**
 * Alias for the complete options structure of a Long/Short Position tool.
 */
export type LongShortPositionToolOptions = LineToolOptions<LongShortPositionOptions>;

/**
 * Alias for the complete options structure of a Circle tool.
 */
export type CircleToolOptions = LineToolOptions<LineToolCircleOptions>;

/**
 * Alias for the complete options structure of a Price Range tool.
 */
export type PriceRangeToolOptions = LineToolOptions<LineToolPriceRangeOptions>;

/**
 * Alias for the complete options structure of a Market Depth tool.
 */
export type MarketDepthToolOptions = LineToolOptions<LineToolMarketDepthOptions>;

/**
 * Alias for the complete options structure of a Triangle tool.
 */
export type TriangleToolOptions = LineToolOptions<LineToolTriangleOptions>;

/**
 * Alias for the complete options structure of a Parallel Channel tool.
 */
export type ParallelChannelToolOptions = LineToolOptions<LineToolParallelChannelOptions>;

/**
 * Alias for the complete options structure of a Fibonacci Retracement tool.
 */
export type FibRetracementToolOptions = LineToolOptions<LineToolFibRetracementOptions>;

/**
 * A central mapping interface that links every valid Line Tool string identifier (key)
 * to its corresponding full options structure (value).
 *
 * This interface is the "source of truth" for the plugin's type system, allowing
 * TypeScript to automatically infer the correct options type based on the tool name provided.
 */
export interface LineToolOptionsMap {
	FibRetracement: FibRetracementToolOptions;
	ParallelChannel: ParallelChannelToolOptions;
	HorizontalLine: HorizontalLineToolOptions;
	VerticalLine: VerticalLineToolOptions;
	Highlighter: HighlighterToolOptions;
	CrossLine: CrossLineToolOptions;
	TrendLine: TrendLineToolOptions;
	Callout: CalloutToolOptions;
	Rectangle: RectangleToolOptions;
	LongShortPosition: LongShortPositionToolOptions;
	Circle: CircleToolOptions;
	PriceRange: PriceRangeToolOptions;
	Triangle: TriangleToolOptions;
	Brush: BrushToolOptions;
	Path: PathToolOptions;
	Text: TextToolOptions;
	Ray: TrendLineToolOptions;
	Arrow: TrendLineToolOptions;
	ExtendedLine: TrendLineToolOptions;
	HorizontalRay: HorizontalLineToolOptions;
	MarketDepth: MarketDepthToolOptions;
}

/**
 * A mapped type that creates a version of {@link LineToolOptionsMap} where all options
 * are deep-partial.
 *
 * This is primarily used for API methods that accept user configuration (like `addLineTool`),
 * allowing users to provide only the specific properties they want to customize without
 * needing to supply the entire configuration object.
 */
export type LineToolPartialOptionsMap = {
	[K in keyof LineToolOptionsMap]: LineToolPartialOptions<LineToolOptionsMap[K]>;
};

/**
 * A utility lookup type that retrieves the full, strict options interface for a specific
 * tool type `T`.
 *
 * @typeParam T - The string identifier of the tool (e.g., 'Rectangle').
 */
export type LineToolOptionsInternal<T extends LineToolType> = LineToolOptionsMap[T];

/**
 * A string union type representing the names of all available line tools registered
 * in the system (e.g., `'TrendLine' | 'Rectangle' | 'FibRetracement'`).
 *
 * Use this type when specifying the `type` argument for methods like `addLineTool`.
 */
export type LineToolType = keyof LineToolOptionsMap;
