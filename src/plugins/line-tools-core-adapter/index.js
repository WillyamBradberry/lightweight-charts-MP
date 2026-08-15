/**
 * line-tools-core-adapter — Minimal adapter for @mp/line-tools-core plugin.
 *
 * Provides the createLineToolsAdapter factory and the LineToolsCoreAdapter class,
 * plus registerPriorityTools for registering real line tool classes from
 * @mp/line-tools-lines and @mp/line-tools-rectangle.
 *
 * Usage:
 *   import { createLineToolsAdapter, registerPriorityTools } from '@mp/line-tools-core-adapter';
 *
 *   const adapter = createLineToolsAdapter(chart, series);
 *   adapter.init(registerPriorityTools);
 *   adapter.startTool('Rectangle');
 *   adapter.clearTools();
 */

export * from './toolRegistry';
export * from './LineToolsCoreAdapter';