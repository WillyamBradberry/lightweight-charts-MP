// /src/utils/geometry/hit-cursor.ts

import { HitTestResult, HitTestType, PaneCursorType } from '../../types/hit-test-types';

/**
 * Resolves the cursor type for a hit test result.
 * Pure function — takes explicit arguments; no `this`.
 *
 * Priority:
 *  1. Use the `suggestedCursor` from the hit test data, if provided.
 *  2. Otherwise, fall back to the tool's default cursor options based on hit type.
 *
 * @param internalResult - The hit test result containing the hit type and optional data.
 * @param options - The tool's default cursor options (defaultDragCursor, defaultHoverCursor).
 * @returns The resolved {@link PaneCursorType}.
 */
export function resolveCursorForHit(
	internalResult: HitTestResult<{ suggestedCursor?: PaneCursorType }>,
	options: { defaultDragCursor?: PaneCursorType; defaultHoverCursor?: PaneCursorType }
): PaneCursorType {
	// 1. Use the specific suggestedCursor from the hit data, if provided.
	const suggestedCursor = internalResult.data()?.suggestedCursor;
	if (suggestedCursor !== undefined) {
		return suggestedCursor;
	}

	// 2. Fall back to the tool's default cursor options based on the hit type.
	switch (internalResult.type()) {
		case HitTestType.MovePointBackground:
			return options.defaultDragCursor ?? PaneCursorType.Grabbing;

		case HitTestType.MovePoint:
		case HitTestType.Regular:
			return options.defaultHoverCursor ?? PaneCursorType.Pointer;

		case HitTestType.ChangePoint:
			return PaneCursorType.DiagonalNwSeResize;

		default:
			return PaneCursorType.Default;
	}
}