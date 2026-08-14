// /src/interaction/creation.ts
// Tool creation flow logic extracted from InteractionManager.
// The InteractionManager (owner of all state) delegates creation handling here by
// invoking these functions with `this` bound to the manager instance.
// Public API of InteractionManager remains unchanged.

/**
 * Finalizes a tool that just finished drawing: commits the tool, fires the
 * "lineToolFinished" event, selects it, normalizes geometry if implemented,
 * and resets all creation-related state.
 *
 * Extracted from `InteractionManager._finalizeToolCreation`.
 */
export function finalizeToolCreation(this: any, tool: any): void {
	tool.tryFinish();

	// Ensure the tool's ghost point is cleared, regardless of finalization method
	tool.clearGhostPoint();

	this._plugin.fireAfterEditEvent(tool, 'lineToolFinished');

	this.deselectAllTools();
	this._selectedTool = tool;
	this._selectedTool.setSelected(true);

	// Fire the 'selected' event for the newly created tool
	this._plugin.fireSingleClickEvent(this._selectedTool, 'selected');

	// --- NEW FIX: Call normalize() if implemented by the tool ---
	const toolWithNormalize = tool as any;
	if (toolWithNormalize.normalize) {
		toolWithNormalize.normalize();
		console.log(`[InteractionManager] Normalized tool after creation: ${tool.id()}`);
	}
	// --- END NEW FIX ---

	// Reset creation-related state
	this._isCreationGesture = false;
	this._creationTool = null;
	this._isDrag = false;
	this._mouseDownPoint = null;
	this._mouseDownTime = 0;
	this.setCurrentToolCreating(null);
	this._chart.applyOptions({ handleScroll: { pressedMouseMove: true } });

	this._plugin.requestUpdate();
}

/**
 * Clears the creation-gesture flags only, wiping drag flags so external clicks
 * don't trigger phantom deselects. Does NOT touch `_currentToolCreating`.
 *
 * Extracted from `InteractionManager._resetCreationGestureStateOnly`.
 */
export function resetCreationGestureStateOnly(this: any): void {
	this._isCreationGesture = false;

	// FIX: Wipe out the drag flags so external clicks don't trigger phantom deselects
	this._resetCommonGestureState();
}

/**
 * Clears the most fundamental mouse gesture state variables: drag flag,
 * mouse down point, and time.
 *
 * Extracted from `InteractionManager._resetCommonGestureState`.
 */
export function resetCommonGestureState(this: any): void {
	this._isDrag = false;
	this._mouseDownPoint = null;
	this._mouseDownTime = 0;
}