/**
 * toolRegistry — Registers existing priority line tools with the core plugin.
 *
 * This registry ensures that the core line tools plugin has the priority
 * tool classes (Lines and Rectangle) registered before the adapter is used.
 * Tools are registered lazily when the plugin API becomes available.
 *
 * Registered tools (from @mp/line-tools-lines via registerLinesPlugin):
 *   - TrendLine, Ray, ExtendedLine, HorizontalLine, VerticalLine, CrossLine
 *
 * Registered tools (from @mp/line-tools-rectangle via registerRectangleTool):
 *   - Rectangle
 */

import { registerLinesPlugin } from '@mp/line-tools-lines';
import { registerRectangleTool } from '@mp/line-tools-rectangle';

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

  // Register 6 line tools from @mp/line-tools-lines
  try {
    const result = registerLinesPlugin(corePlugin);
    // Log each registration with proper information instead of hardcoded values
    for (const [type, toolClass] of Object.entries(result)) {
      const isFunction = typeof toolClass === 'function';
      const classType = isFunction ? toolClass.name : 'unknown';
      console.log(`[LT] register type=${type} classType=${classType} isFunction=${isFunction}`);
    }
    console.log('toolRegistry: Registered 6 line tools from @mp/line-tools-lines');
  } catch (e) {
    console.warn('toolRegistry: Failed to register line tools from @mp/line-tools-lines', e);
  }

  // Register Rectangle tool from @mp/line-tools-rectangle
  try {
    const result = registerRectangleTool(corePlugin);
    // Log registration with proper information instead of hardcoded values
    if (result && typeof result === 'object') {
      for (const [type, toolClass] of Object.entries(result)) {
        const isFunction = typeof toolClass === 'function';
        const classType = isFunction ? toolClass.name : 'unknown';
        console.log(`[LT] register type=${type} classType=${classType} isFunction=${isFunction}`);
      }
    }
    console.log('toolRegistry: Registered Rectangle tool from @mp/line-tools-rectangle');
  } catch (e) {
    console.warn('toolRegistry: Failed to register Rectangle tool from @mp/line-tools-rectangle', e);
  }
}