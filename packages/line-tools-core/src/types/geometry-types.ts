// /src/types/geometry-types.ts

import { Coordinate, Logical, Nominal } from 'lightweight-charts';
import { Point } from '../utils/geometry';

export { Coordinate, Logical, Nominal } from 'lightweight-charts';
export { Point } from '../utils/geometry';

/**
 * A nominal type representing a distinct index within the Time Scale's logical range.
 * Used to ensure type safety when handling time scale indices.
 */
export type TimePointIndex = Nominal<number, 'TimePointIndex'>;

/**
 * Represents the first value in a data series, linking a numerical value
 * to a specific logical time point. Used for percentage-based scaling.
 */
// From LWCharts model/price-data-source.ts
export interface FirstValue {
    value: number;
    timePoint: Logical;
}

/**
 * A basic interface representing a 2D point with x and y coordinates.
 */
export interface IPoint {
	x: number;
	y: number;
}

/**
 * Represents the dimensions (width and height) of a canvas or element.
 */
export interface Size {
	width: number;
	height: number;
}

/**
 * Defines vertical alignment options for box-like elements (e.g., text boxes).
 */
export enum BoxVerticalAlignment {
	Top = 'top',
	Middle = 'middle',
	Bottom = 'bottom',
}

/**
 * Defines horizontal alignment options for box-like elements relative to a reference point.
 */
export enum BoxHorizontalAlignment {
	Left = 'left',
	Center = 'center',
	Right = 'right',
}

/**
 * Defines the alignment of text content within its bounding box.
 */
export enum TextAlignment {
	Start = 'start',
	Center = 'center',
	End = 'end',
	Left = 'left',
	Right = 'right',
}

/**
 * Defines the shape used to join two line segments where they meet.
 * Matches standard Canvas API `lineJoin` property.
 */
export enum LineJoin {
	Bevel = 'bevel',
	Round = 'round',
	Miter = 'miter',
}

/**
 * Defines the shape used to draw the end points of lines.
 * Matches standard Canvas API `lineCap` property.
 */
export enum LineCap {
	Butt = 'butt',
	Round = 'round',
	Square = 'square',
}

/**
 * Defines specific decorative shapes to render at the start or end of a line tool
 * (e.g., Arrow heads or Circles).
 */
export enum LineEnd {
	Normal,
	Arrow,
	Circle,
}
