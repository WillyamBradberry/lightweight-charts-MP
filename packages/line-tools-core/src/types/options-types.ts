// /src/types/options-types.ts

import { LineStyle } from 'lightweight-charts';
import { IPoint, BoxVerticalAlignment, BoxHorizontalAlignment, TextAlignment, LineJoin, LineCap, LineEnd } from './geometry-types';

/**
 * Configuration for extending lines infinitely in either direction.
 */
export interface ExtendOptions {
	right: boolean;
	left: boolean;
}

/**
 * Configuration for decorative shapes (like arrows) at the start or end of a line.
 */
export interface EndOptions {
	left: LineEnd;
	right: LineEnd;
}

/**
 * Visual configuration for drop shadows applied to shapes or text boxes.
 */
export interface ShadowOptions {
	blur: number;
	color: string;
	offset: IPoint;
}

/**
 * Configuration for drawing borders around shapes, including stroke style, width, and corner radius.
 */
export interface BorderOptions {
	color: string;
	width: number;
	radius: number | number[];
	highlight: boolean;
	style: LineStyle;
}

/**
 * Configuration for background fills, including color and optional inflation (padding) beyond the defined points.
 */
export interface BackgroundOptions {
	color: string;
	inflation: IPoint;
}

/**
 * Grouping interface for defining both vertical and horizontal alignment of a box.
 */
export interface BoxAlignmentOptions {
	vertical: BoxVerticalAlignment;
	horizontal: BoxHorizontalAlignment;
}

/**
 * Configuration for text typography, including family, size, color, and weight.
 */
export interface TextFontOptions {
	color: string;
	size: number;
	bold: boolean;
	italic: boolean;
	family: string;
}

/**
 * Comprehensive configuration for the container box surrounding text, including borders, background, and alignment.
 */
export interface TextBoxOptions {
	alignment: BoxAlignmentOptions;
	angle: number;
	scale: number;
	offset?: IPoint;
	padding?: IPoint;
	maxHeight?: number;
	shadow?: ShadowOptions;
	border?: BorderOptions;
	background?: BackgroundOptions;
}

/**
 * The master configuration object for text elements, combining the text content value with font and box styling.
 */
export interface TextOptions {
	value: string;
	alignment: TextAlignment;
	font: TextFontOptions;
	box: TextBoxOptions;
	padding: number;
	wordWrapWidth: number;
	forceTextAlign: boolean;
	forceCalculateMaxLineWidth: boolean;
}

/**
 * Standard configuration for line drawing, encompassing color, width, style, end decorations, and infinite extension.
 */
export interface LineOptions {
	color: string;
	width: number;
	style: LineStyle;
	join: LineJoin;
	cap: LineCap;
	end: EndOptions;
	extend: ExtendOptions;
}

/**
 * Configuration specific to rectangle shapes, defining background fill, borders, and horizontal extension.
 */
export interface RectangleOptions {
	background: Omit<BackgroundOptions, 'inflation'>;
	border: Omit<BorderOptions, 'highlight'>;
	extend: ExtendOptions;
}

/**
 * Configuration specific to circle shapes, defining background fill and borders.
 */
export interface CircleOptions {
	background: Omit<BackgroundOptions, 'inflation'>;
	border: Omit<BorderOptions, 'radius' | 'highlight'>;
}

/**
 * Configuration specific to triangle shapes, defining background fill and borders.
 */
export interface TriangleOptions {
	background: Omit<BackgroundOptions, 'inflation'>;
	border: Omit<BorderOptions, 'radius' | 'highlight'>;
}

/**
 * Configuration for the Long/Short Position tool.
 * Defines the appearance of the profit/loss rectangles and their associated text labels.
 */
export interface LongShortPositionOptions {
	entryStopLossRectangle: RectangleOptions;
	entryStopLossText: TextOptions;
	entryPtRectangle: RectangleOptions;
	entryPtText: TextOptions;
	showAutoText: boolean;
}

/**
 * Configuration for the Price Range tool.
 * Controls the rectangle, center/boundary lines, and the visibility of price labels.
 */
export interface PriceRangeOptions {
	rectangle: RectangleOptions;
	verticalLine: LineOptions;
	horizontalLine: LineOptions;
	showCenterHorizontalLine: boolean;
	showCenterVerticalLine: boolean;
	showTopPrice: boolean;
	showBottomPrice: boolean;
}

/**
 * Represents a single aggregated data point (price level) for Market Depth visualization.
 */
export interface MarketDepthSingleAggregatesData {
	EarliestTime: string;
	LatestTime: string;
	Side: string;
	Price: string;
	TotalSize: string;
	BiggestSize: string;
	SmallestSize: string;
	NumParticipants: number;
	TotalOrderCount: number;
}

/**
 * Container for the full set of Bids and Asks data used by the Market Depth tool.
 */
export interface MarketDepthAggregatesData {
	Bids: MarketDepthSingleAggregatesData[];
	Asks: MarketDepthSingleAggregatesData[];
}

/**
 * Configuration for the Market Depth tool.
 * Includes visual settings (colors, line widths) and the underlying data source.
 */
export interface MarketDepthOptions {
	lineWidth: number;
	lineStyle: LineStyle;
	lineOffset: number;
	lineLength: number;
	lineBidColor: string;
	lineAskColor: string;
	totalBidAskCalcMethod: string;
	timestampStartOffset: number;
	marketDepthData: MarketDepthAggregatesData;
}

/**
 * Configuration for a single level within a Fibonacci Retracement tool.
 * Defines the coefficient (e.g., 0.618), color, and label settings.
 */
export interface FibRetracementLevel {
	coeff: number;
	color: string;
	opacity: number;
	distanceFromCoeffEnabled: boolean;
	distanceFromCoeff: number;
}

/**
 * Defines a conditional order logic attached to specific Fibonacci levels.
 * Used for strategy planning within the Fibonacci tool.
 */
export interface FibBracketOrder {
	uniqueId: string | null;
	conditionLevelCoeff: number | null;
	conditionLevelPrice: number;
	entryLevelCoeff: number | null;
	entryLevelPrice: number;
	stopMethod: 'fib' | 'price' | 'points';
	stopLevelCoeff: number | null;
	stopPriceInput: number | null;
	stopPointsInput: number | null;
	finalStopPrice: number;
	ptMethod: 'fib' | 'price' | 'points';
	ptLevelCoeff: number | null;
	ptPriceInput: number | null;
	ptPointsInput: number | null;
	finalPtPrice: number;
	isMoveStopToEnabled: boolean;
	moveStopToMethod: 'fib' | 'price' | 'points';
	moveStopToLevelCoeff: number | null;
	moveStopToPriceInput: number | null;
	moveStopToPointsInput: number | null;
	finalMoveStopToPrice: number;
	triggerBracketUniqueId: string | null;
}

/**
 * Encapsulates the complete trading strategy configuration (entries, stops, targets)
 * associated with a Fibonacci Retracement tool.
 */
export interface FibRetracementTradeStrategy {
	enabled: boolean;
	longOrShort: 'long' | 'short' | 'neutral' | '';
	fibBracketOrders: FibBracketOrder[];
}

/**
 * Specific options for Trend Line tools, combining standard text settings with line styling.
 */
export interface LineToolTrendLineOptions { text: TextOptions; line: Omit<LineOptions, 'join' | 'cap'>; }

/**
 * Specific options for the Callout tool.
 * Configures the text label and the pointer line connecting it to a specific point.
 */
export interface LineToolCalloutOptions { text: TextOptions; line: Omit<LineOptions, 'join' | 'cap'>; }

/**
 * Specific options for the Horizontal Line tool.
 * Configures the infinite horizontal line and its optional text label.
 */
export interface LineToolHorizontalLineOptions { text: TextOptions; line: Omit<LineOptions, 'cap' | 'join'>; }

/**
 * Specific options for the Vertical Line tool.
 * Configures the infinite vertical line and its optional text label.
 */
export interface LineToolVerticalLineOptions { text: TextOptions; line: Omit<LineOptions, 'cap' | 'join' >; }

/**
 * Specific options for the Cross Line tool.
 * Configures the visual style of the intersecting horizontal and vertical lines.
 */
export interface LineToolCrossLineOptions { line: Omit<LineOptions, 'cap' | 'join'>; }

/**
 * Specific options for the Rectangle tool.
 * Configures the rectangle shape (border/fill) and an attached text label.
 */
export interface LineToolRectangleOptions { text: TextOptions; rectangle: RectangleOptions; }

/**
 * Specific options for the Circle tool.
 * Configures the circle shape (border/fill) and an attached text label.
 */
export interface LineToolCircleOptions { text: TextOptions; circle: CircleOptions; }

/**
 * Specific options for the Price Range tool.
 * Configures the range visualization components and the associated text label.
 */
export interface LineToolPriceRangeOptions { text: TextOptions; priceRange: PriceRangeOptions; }

/**
 * Specific options for the Market Depth tool.
 * Configures the depth visualization lines/colors and the text label.
 */
export interface LineToolMarketDepthOptions { text: TextOptions; marketDepth: MarketDepthOptions; }

/**
 * Specific options for the Triangle tool.
 * Configures the triangle shape (border/fill).
 */
export interface LineToolTriangleOptions { triangle: TriangleOptions; }

/**
 * Specific options for the Text tool.
 * Configures the content and styling of the standalone text element.
 */
export interface LineToolTextOptions { text: TextOptions; }

/**
 * Specific options for the Brush tool.
 * Configures the freehand line style and optional background fill.
 */
export interface LineToolBrushOptions { line: Omit<LineOptions, 'end' | 'extend'>; background?: Omit<BackgroundOptions, 'inflation'>; }

/**
 * Specific options for the Highlighter tool.
 * Similar to the Brush tool but typically defaults to translucent colors for highlighting.
 */
export interface LineToolHighlighterOptions { line: Omit<LineOptions, 'end' | 'extend'>; background?: Omit<BackgroundOptions, 'inflation'>; }

/**
 * Specific options for the Path (Polyline) tool.
 * Configures the line style connecting the sequence of points.
 */
export interface LineToolPathOptions { line: Omit<LineOptions, 'cap' | 'extend' | 'join'>; }

/**
 * Specific options for the Fibonacci Retracement tool.
 * Configures the trend line, the retracement levels (coefficients/colors), and optional trading strategy displays.
 */
export interface LineToolFibRetracementOptions { line: Omit<LineOptions, 'extend' | 'join' | 'color' | 'cap' | 'end'>; extend: ExtendOptions; levels: FibRetracementLevel[]; tradeStrategy: FibRetracementTradeStrategy; }

/**
 * Specific options for the Parallel Channel tool.
 * Configures the styling for the channel borders, the middle line, and the channel background.
 */
export interface LineToolParallelChannelOptions { 
	channelLine: Omit<LineOptions, 'cap' | 'extend' | 'join' | 'end'>;
	middleLine: Omit<LineOptions, 'cap' | 'extend' | 'join' | 'end'>;
	showMiddleLine: boolean;
	extend: ExtendOptions;
	background?: Omit<BackgroundOptions, 'inflation'>;
}

