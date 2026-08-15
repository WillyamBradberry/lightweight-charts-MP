// /src/index.ts
//
// Rectangle drawing tool built on @mp/line-tools-core.
// Exports the LineToolRectangle class so consumers (e.g. the adapter's
// toolRegistry) can register it with the core plugin.

import { LineToolRectangle } from './model/LineToolRectangle';
import { LineToolRectanglePaneView } from './views/LineToolRectanglePaneView';

export { LineToolRectangle, LineToolRectanglePaneView };

/**
 * Registers the Rectangle tool with the provided Core Plugin instance.
 *
 * @param corePlugin - The instance of the Core Line Tools Plugin (created via `createLineToolsPlugin`).
 * @returns void
 */
export function registerRectangleTool<HorzScaleItem>(
	corePlugin: {
		registerLineTool: (
			type: string,
			toolClass: new (...args: any[]) => any
		) => void;
	}
): void {
	corePlugin.registerLineTool('Rectangle', LineToolRectangle);
}

export default LineToolRectangle;
