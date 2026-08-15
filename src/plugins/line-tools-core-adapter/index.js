/**
 * line-tools-core-adapter — Minimal adapter for @mp/line-tools-core plugin.
 *
 * Provides the createLineToolsAdapter factory and the LineToolsCoreAdapter class,
 * plus the toolRegistry for registering priority line tools from @mp/line-tools-lines
 * and @mp/line-tools-rectangle.
 *
 * Usage:
 *   import { createLineToolsAdapter, toolRegistry } from '@mp/line-tools-core-adapter';
 *
 *   const adapter = createLineToolsAdapter(chart, series);
 *   adapter.init(toolRegistry);
 *   adapter.startTool('Rectangle');
 *   adapter.clearTools();
 */
export { createLineToolsAdapter, LineToolsCoreAdapter, toolRegistry };

export * from './toolRegistry';
export * from './LineToolsCoreAdapter';