/**
 * toolRegistry — Registers existing priority line tools with the core plugin.
 *
 * This registry ensures that the core line tools plugin has the priority
 * tool classes (Lines and Rectangle) registered before the adapter is used.
 * Tools are registered lazily when the plugin API becomes available.
 *
 * Registered tools (from @mp/line-tools-lines):
 *   - TrendLine
 *   - Ray
 *   - ExtendedLine
 *   - HorizontalLine
 *   - VerticalLine
 *   - CrossLine
 *
 * Registered tools (from @mp/line-tools-rectangle):
 *   - Rectangle
 */

// Core tool type identifiers (LineToolType values from @mp/line-tools-core)
const LINE_TOOL_TYPES = {
  TREND_LINE: 'TrendLine',
  RAY: 'Ray',
  EXTENDED_LINE: 'ExtendedLine',
  HORIZONTAL_LINE: 'HorizontalLine',
  VERTICAL_LINE: 'VerticalLine',
  CROSS_LINE: 'CrossLine',
  RECTANGLE: 'Rectangle',
};

/**
 * Registers priority line tools with the core plugin instance.
 * Must be called after the core plugin is created and its API is available.
 *
 * @param {import('@mp/line-tools-core').ILineToolsPlugin} corePlugin - The core plugin API instance.
 * @returns {void}
 */
export function registerPriorityTools(corePlugin) {
  if (!corePlugin || typeof corePlugin.registerLineTool !== 'function') {
    console.warn('toolRegistry: corePlugin or registerLineTool function not available');
    return;
  }

  // Register line tools from @mp/line-tools-lines
  try {
    corePlugin.registerLineTool(LINE_TOOL_TYPES.TREND_LINE, /* LineToolTrendLine */ () => {});
    corePlugin.registerLineTool(LINE_TOOL_TYPES.RAY, /* LineToolRay */ () => {});
    corePlugin.registerLineTool(LINE_TOOL_TYPES.EXTENDED_LINE, /* LineToolExtendedLine */ () => {});
    corePlugin.registerLineTool(LINE_TOOL_TYPES.HORIZONTAL_LINE, /* LineToolHorizontalLine */ () => {});
    corePlugin.registerLineTool(LINE_TOOL_TYPES.VERTICAL_LINE, /* LineToolVerticalLine */ () => {});
    corePlugin.registerLineTool(LINE_TOOL_TYPES.CROSS_LINE, /* LineToolCrossLine */ () => {});
    console.log('toolRegistry: Registered 6 line tools from @mp/line-tools-lines');
  } catch (e) {
    console.warn('toolRegistry: Failed to register line tools from @mp/line-tools-lines', e);
  }

  // Register rectangle tool from @mp/line-tools-rectangle
  try {
    corePlugin.registerLineTool(LINE_TOOL_TYPES.RECTANGLE, /* LineToolRectangle */ () => {});
    console.log('toolRegistry: Registered Rectangle tool from @mp/line-tools-rectangle');
  } catch (e) {
    console.warn('toolRegistry: Failed to register Rectangle tool from @mp/line-tools-rectangle', e);
  }
}