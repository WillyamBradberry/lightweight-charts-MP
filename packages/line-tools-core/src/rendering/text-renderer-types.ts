// /rendering/text-renderer-types.ts

/**
 * Internal cache interfaces shared by the TextRenderer.
 *
 * These are the pre-calculated caches (wrapped lines, font metrics, box
 * dimensions, and the master layout state) used by TextRenderer to avoid
 * recomputing expensive layout numbers on every frame.
 *
 * Extracted verbatim from the "Internal Interfaces for Caching (from V3.8)"
 * region of generic-renderers.ts.
 */

import { TextAlignment } from '../types';
import { Point } from '../utils/geometry';


// #region Internal Interfaces for Caching (from V3.8)

/**
 * Internal utility interface to cache calculated information about text lines after word wrapping.
 *
 * @property lines - An array of strings representing the final, wrapped lines of text.
 * @property linesMaxWidth - The pixel width of the longest line of text.
 */
export interface LinesInfo {
	lines: string[];
	linesMaxWidth: number;
}

/**
 * Internal utility interface to cache the computed font metrics.
 *
 * This prevents repeated calculation of the CSS font string and pixel size.
 *
 * @property fontSize - The computed font size in pixels.
 * @property fontStyle - The complete CSS font string (e.g., `'bold 12px sans-serif'`).
 */
export interface FontInfo {
	fontSize: number;
	fontStyle: string;
}

/**
 * Internal utility interface to cache the final pixel dimensions of the text box.
 *
 * This represents the bounding box required to contain the wrapped text content, including
 * padding, inflation, and border width.
 *
 * @property width - The final calculated width of the text box in pixels.
 * @property height - The final calculated height of the text box in pixels.
 */
export interface BoxSize {
	width: number;
	height: number;
}

/**
 * The master internal state cache for the {@link TextRenderer}.
 *
 * Stores all pre-calculated screen coordinates, dimensions, and text alignment values
 * required to draw the text and its box in the correct position relative to the anchor point.
 */
export interface InternalData {
	boxLeft: number;
	boxTop: number;
	boxWidth: number;
	boxHeight: number;
	textStart: number;
	textTop: number;
	textAlign: TextAlignment;
	rotationPivot: Point;
}

// #endregion Internal Interfaces
