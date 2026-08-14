// /src/events/event-bus.ts

import { Delegate } from '../utils/helpers';
import { BaseLineTool } from '../model/base-line-tool';
import {
	LineToolsAfterEditEventHandler,
	LineToolsAfterEditEventParams,
	LineToolsDoubleClickEventHandler,
	LineToolsDoubleClickEventParams,
	LineToolsSingleClickEventHandler,
	LineToolsSingleClickEventParams,
} from '../api/public-api';

/**
 * Owns the event Delegates used to broadcast V3.8-compatible line tool events.
 *
 * The core plugin exposes its subscribe/unsubscribe/fire methods as thin
 * delegates here, keeping the event lifecycle and payload construction in one
 * cohesive module.
 */
export class EventBus<HorzScaleItem> {
	private readonly _doubleClickDelegate = new Delegate<LineToolsDoubleClickEventParams>();
	private readonly _afterEditDelegate = new Delegate<LineToolsAfterEditEventParams>();
	private readonly _selectSingleClickDelegate = new Delegate<LineToolsSingleClickEventParams>();

	// --- Double Click ---
	public subscribeLineToolsDoubleClick(handler: LineToolsDoubleClickEventHandler): void {
		this._doubleClickDelegate.subscribe(handler);
	}

	public unsubscribeLineToolsDoubleClick(handler: LineToolsDoubleClickEventHandler): void {
		this._doubleClickDelegate.unsubscribe(handler);
	}

	// --- After Edit ---
	public subscribeLineToolsAfterEdit(handler: LineToolsAfterEditEventHandler): void {
		this._afterEditDelegate.subscribe(handler);
	}

	public unsubscribeLineToolsAfterEdit(handler: LineToolsAfterEditEventHandler): void {
		this._afterEditDelegate.unsubscribe(handler);
	}

	// --- Single Click (selection) ---
	public subscribeLineToolsSingleClick(handler: LineToolsSingleClickEventHandler): void {
		this._selectSingleClickDelegate.subscribe(handler);
	}

	public unsubscribeLineToolsSingleClick(handler: LineToolsSingleClickEventHandler): void {
		this._selectSingleClickDelegate.unsubscribe(handler);
	}

	// --- Internal fire methods ---
	public fireDoubleClickEvent(tool: BaseLineTool<HorzScaleItem>): void {
		const eventParams: LineToolsDoubleClickEventParams = {
			selectedLineTool: tool.getExportData(),
		};
		this._doubleClickDelegate.fire(eventParams);
	}

	public fireSingleClickEvent(tool: BaseLineTool<HorzScaleItem>, selectionState: 'selected' | 'deselected'): void {
		const eventParams: LineToolsSingleClickEventParams = {
			selectionState: selectionState,
			selectedLineTool: {
				id: tool.id(),
				toolType: tool.toolType,
				// Include points and options only if the tool is being selected
				points: selectionState === 'selected' ? tool.points() : null,
				options: selectionState === 'selected' ? tool.options() : null,
			}
		};
		this._selectSingleClickDelegate.fire(eventParams);
	}

	public fireAfterEditEvent(tool: BaseLineTool<HorzScaleItem>, stage: 'lineToolEdited' | 'pathFinished' | 'lineToolFinished'): void {
		const eventParams: LineToolsAfterEditEventParams = {
			selectedLineTool: tool.getExportData(),
			stage,
		};
		this._afterEditDelegate.fire(eventParams);
	}

	/**
	 * Releases all subscribed callbacks. Called during plugin destruction to
	 * prevent closure leaks of user-provided handlers.
	 */
	public destroy(): void {
		this._doubleClickDelegate.destroy();
		this._afterEditDelegate.destroy();
		this._selectSingleClickDelegate.destroy();
	}
}
