// /src/index.ts
//
// Line drawing tools built on @mp/line-tools-core.
// Registers the 6 priority line tools with the core plugin and re-exports their
// classes so consumers (e.g. the adapter's toolRegistry) can register them.

import { ILineToolsPlugin, LineToolType } from '@mp/line-tools-core';
import { LineToolTrendLine } from './model/LineToolTrendLine';
import { LineToolRay } from './model/LineToolRay';
import { LineToolExtendedLine } from './model/LineToolExtendedLine';
import { LineToolHorizontalLine } from './model/LineToolHorizontalLine';
import { LineToolVerticalLine } from './model/LineToolVerticalLine';
import { LineToolCrossLine } from './model/LineToolCrossLine';

const TREND_LINE_NAME: LineToolType = 'TrendLine';
const RAY_NAME: LineToolType = 'Ray';
const EXTENDED_LINE_NAME: LineToolType = 'ExtendedLine';
const HORIZONTAL_LINE_NAME: LineToolType = 'HorizontalLine';
const VERTICAL_LINE_NAME: LineToolType = 'VerticalLine';
const CROSS_LINE_NAME: LineToolType = 'CrossLine';

/**
 * Registers all standard line tools (TrendLine, Ray, ExtendedLine, HorizontalLine,
 * VerticalLine, CrossLine) with the provided Core Plugin instance.
 *
 * @param corePlugin - The instance of the Core Line Tools Plugin (created via `createLineToolsPlugin`).
 * @returns void
 */
export function registerLinesPlugin<HorzScaleItem>(corePlugin: ILineToolsPlugin): void {
	corePlugin.registerLineTool(TREND_LINE_NAME, LineToolTrendLine);
	corePlugin.registerLineTool(RAY_NAME, LineToolRay);
	corePlugin.registerLineTool(EXTENDED_LINE_NAME, LineToolExtendedLine);
	corePlugin.registerLineTool(HORIZONTAL_LINE_NAME, LineToolHorizontalLine);
	corePlugin.registerLineTool(VERTICAL_LINE_NAME, LineToolVerticalLine);
	corePlugin.registerLineTool(CROSS_LINE_NAME, LineToolCrossLine);
}

// Re-export the classes for direct use / type referencing and individual registration.
export {
	LineToolTrendLine,
	LineToolRay,
	LineToolExtendedLine,
	LineToolHorizontalLine,
	LineToolVerticalLine,
	LineToolCrossLine,
};

export default registerLinesPlugin;
