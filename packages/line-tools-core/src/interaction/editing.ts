// /src/interaction/editing.ts
// Editing flow logic extracted from InteractionManager.
// The InteractionManager (owner of all state) delegates editing handling here by
// invoking these functions with `this` bound to the manager instance.
// Public API of InteractionManager remains unchanged.

/**
 * Clears flags and state related to an active tool editing/dragging session, including
 * clearing the cursor override and re-enabling the chart's built-in scroll/pan.
 *
 * Extracted from `InteractionManager._resetEditingGestureStateOnly`.
 */
export function resetEditingGestureStateOnly(this: any): void {
	// Clear Override
	// Important: Clear the override BEFORE nulling _draggedTool
	if (this._draggedTool) {
		this._draggedTool.setOverrideCursor(null);
	}
	// Clear the stored cursor state so the next click starts fresh
	this._activeDragCursor = null;

	this._isEditing = false;
	this._draggedTool = null;
	this._draggedPointIndex = null;
	this._dragStartPoint = null;
	this._originalDragLogicalIndices = null;
	this._originalDragPoints = null;
	this._chart.applyOptions({ handleScroll: { pressedMouseMove: true } });

	// FIX: Wipe out the drag flags so the next click on a React button
	// isn't interpreted as the end of a chart drag.
	this._resetCommonGestureState();
}