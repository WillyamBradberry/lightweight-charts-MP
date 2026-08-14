// /src/interaction/events.ts
// Chart event subscription and raw event handler logic extracted from InteractionManager.
// The InteractionManager remains the owner of state and final routing; event handler
// bodies are delegated here, bound to the manager instance via `this`.

import { Coordinate, Logical, Time } from 'lightweight-charts';
import { Point, interpolateTimeFromLogicalIndex, interpolateLogicalIndexFromTime } from '../utils/geometry';
import { ensureNotNull, deepCopy, roundPriceToStep } from '../utils/helpers';
import { SnapAxis, InteractionPhase, FinalizationMethod, PaneCursorType } from '../types';
import { LineToolPoint } from '../api/public-api';
import { DRAG_THRESHOLD, CLICK_TIMEOUT } from './interaction-manager';

/**
 * Handles global `keydown`/`keyup` events, tracking the Shift key state.
 * Extracted from `InteractionManager._handleKey`.
 */
export function handleKey(this: any, event: KeyboardEvent): void {
	if (event.key === 'Shift') {
		const newState = event.type === 'keydown';

		// Only proceed if the state is actually changing
		if (this._isShiftKeyDown !== newState) {
			this._isShiftKeyDown = newState;
		}
	}
}
/**
 * Handles the initial `mousedown` event: starts a creation gesture or an
 * edit/drag gesture on an existing tool.
 * Extracted from `InteractionManager._handleMouseDown`.
 */
export function handleMouseDown(this: any, event: MouseEvent): void {
	if (this._locked) { return; }

	const point = this._eventToPoint(event);
	if (!point) { return; }

	// Reset drag/click state
	this._isDrag = false;
	this._mouseDownPoint = point;
	this._mouseDownTime = performance.now();

	// --- 1. Tool Creation START/CONTINUATION ---
	if (this._currentToolCreating) {
		this._creationTool = this._currentToolCreating;
		this._isCreationGesture = true;

		// Immediately disable chart scroll as we've captured the gesture
		this._chart.applyOptions({ handleScroll: { pressedMouseMove: false } });

		// 1-point tools are finalized on MouseUp; just return here.
		return;
	}

	// --- 2. GESTURE ON EXISTING TOOL START ---
	const hitResult = this._hitTest(point);

	if (hitResult && hitResult.tool) {
		if (!hitResult.tool.options().editable) { return; }

		// A detected hit means this tool must be selected immediately.
		if (!hitResult.tool.isSelected()) {
			this.deselectAllTools();
			this._selectedTool = hitResult.tool;
			this._selectedTool.setSelected(true);

			// Fire the 'selected' event for the new tool
			this._plugin.fireSingleClickEvent(this._selectedTool, 'selected')
		}

		this._draggedTool = hitResult.tool;
		this._draggedPointIndex = hitResult.pointIndex;

		// Smart Cursor Logic
		// 1. Get the cursor suggested by the renderer (e.g., 'nwse-resize' or 'pointer')
		let capturedCursor = hitResult.suggestedCursor || PaneCursorType.Default;

		// 2. "Smart Upgrade": If the renderer says "Pointer" (generic hover) or "Default",
		//    but we are initiating a drag on a tool, upgrade it to the tool's Drag Cursor (Grabbing).
		//    We DO NOT upgrade if it's a specific resize cursor (e.g., 'nwse-resize').
		if (capturedCursor === PaneCursorType.Pointer || capturedCursor === PaneCursorType.Default) {
			const toolDragCursor = hitResult.tool.options().defaultDragCursor;
			capturedCursor = toolDragCursor || PaneCursorType.Grabbing;
		}

		// 3. Lock this cursor for the duration of the drag
		this._activeDragCursor = capturedCursor;

		let allOriginalPoints: LineToolPoint[] = [];

		// If tool is Unbounded (Brush) AND a move is initiated, capture ALL permanent
		// points for a full path translation.
		if (this._draggedTool.pointsCount === -1) {
			// FIX: Take a snapshot to prevent the reference leak
			allOriginalPoints = deepCopy(this._draggedTool.getPermanentPointsForTranslation());

			// CRITICAL: Clear the draggedPointIndex if the hit was on the center anchor
			// so _handleMouseMove enters the correct Translate logic. For Brush, index 0
			// is the center anchor, which should only ever move the tool.
			if (this._draggedTool.anchor0TriggersTranslation() && this._draggedPointIndex === 0) {
				this._draggedPointIndex = null;
			}
		} else {
			// --- Standard Handling for Bounded Tools ---
			const maxAnchorIndex = hitResult.tool.maxAnchorIndex
				? hitResult.tool.maxAnchorIndex()
				: hitResult.tool.pointsCount - 1;

			const originalPointsArray: (LineToolPoint | null)[] = [];
			for (let i = 0; i <= maxAnchorIndex; i++) {
				const p = hitResult.tool.getPoint(i);
				originalPointsArray.push(p ? deepCopy(p) : null);
			}

			allOriginalPoints = originalPointsArray.filter(p => p !== null) as LineToolPoint[];
		}

		// Store the collected points for drag comparison
		this._originalDragPoints = allOriginalPoints;

		// Pre-calculate the logical indices of all points
		this._originalDragLogicalIndices = allOriginalPoints.map(p =>
			interpolateLogicalIndexFromTime(this._chart, this._series, p.timestamp as unknown as Time)
		);

		this._dragStartPoint = point;

		this._chart.applyOptions({ handleScroll: { pressedMouseMove: false } });
	}
}
/**
 * Handles the `mousemove` event: drag/edit updates (including Shift constraints),
 * tool translation, and ghost-point updates during creation.
 * Extracted from `InteractionManager._handleMouseMove`.
 */
export function handleMouseMove(this: any, event: MouseEvent): void {
	// Stop tracking mouse movements and ghost points if locked
	if (this._locked) { return; }

	const point = this._eventToPoint(event);
	if (!point) { return; }

	// Keep a persistent record of the true global mouse position.
	// Critical for crosshair boundary checks and preventing cross-pane contamination.
	this._currentGlobalPoint = point;

	// --- 1. Check for Drag Threshold (If any gesture is active) ---
	if (this._isCreationGesture || this._draggedTool) {
		if (this._mouseDownPoint && point.subtract(this._mouseDownPoint).length() > DRAG_THRESHOLD) {
			this._isDrag = true; // Drag threshold met
		}
	}

	// --- 2. Creation Drag/Ghosting Flow (Single-Drag Creation) ---
	if (this._isCreationGesture && this._creationTool && this._mouseDownPoint) {
		const tool = this._creationTool;
		// Check if the tool supports drag creation AND the constraint is supported
		const isDragCreationSupported = tool.supportsClickDragCreation?.() === true;
		const isShiftConstraintSupported = tool.supportsShiftClickDragConstraint?.() === true;

		// Safety check: If not supported, rely on _handleCrosshairMove for ghosting and exit
		if (!isDragCreationSupported && !this._isDrag) {
			return;
		}

		if (this._isDrag && isDragCreationSupported) {
			// Force magnet snapping for P0 since it is the unconstrained origin point
			const p0LocationLogical = this.screenPointToLineToolPoint(this._mouseDownPoint, false);
			let constrainedScreenPoint: Point = point;

			// Variable to capture the axis hint
			let snapAxis: SnapAxis = 'none';

			// --- SHIFT CONSTRAINT LOGIC FOR CREATION DRAG (P1 is being placed) ---
			if (this._isShiftKeyDown && isShiftConstraintSupported) {
				const anchorIndexBeingDragged = 1; // Always P1 during the first drag creation
				const phase: InteractionPhase = InteractionPhase.Creation;

				// P0's original position is the original logical point in this context
				const originalP0 = p0LocationLogical;

				if (originalP0 && tool.getShiftConstrainedPoint) {
					// The logical points array is either empty or contains just P0 at this moment
					const allOriginalLogicalPointsForCreation = this._originalDragPoints || (originalP0 ? [originalP0] : []);

					const constraintResult = tool.getShiftConstrainedPoint(
						anchorIndexBeingDragged,
						point,
						phase,
						originalP0, // P0's original position is the constraint source
						allOriginalLogicalPointsForCreation as LineToolPoint[]
					);
					constrainedScreenPoint = constraintResult.point;
					snapAxis = constraintResult.snapAxis;

					// --- PANE-AWARE COMPENSATION FIX ---
					// If the tool locked the price, its returned Y is Pane-Relative.
					// We add the pane offset to convert it back to Chart-Relative.
					if (snapAxis === 'price') {
						constrainedScreenPoint.y = (constrainedScreenPoint.y + this._getActivePaneYOffset()) as Coordinate;
					}
				}
			}

			// Pass Shift status to bypass magnet only on the constrained moving point
			let constrainedLogicalPoint = this.screenPointToLineToolPoint(constrainedScreenPoint, this._isShiftKeyDown);

			// --- SYNCHRONOUS LOGICAL SNAP (APPLIED CONTINUOUSLY DURING DRAG) ---
			if (constrainedLogicalPoint && snapAxis !== 'none') {
				const P0 = tool.getPoint(0) || p0LocationLogical; // Prioritize committed point
				if (P0) {
					if (snapAxis === 'time') {
						constrainedLogicalPoint = {
							timestamp: P0.timestamp,
							price: constrainedLogicalPoint.price,
						};
					} else if (snapAxis === 'price') {
						constrainedLogicalPoint = {
							timestamp: constrainedLogicalPoint.timestamp,
							price: P0.price,
						};
					}
				}
			}
			// --- END SYNCHRONOUS LOGICAL SNAP ---

			if (p0LocationLogical && constrainedLogicalPoint) {
				if (tool.pointsCount === -1) {
					// --- FREEHAND TOOL LOGIC (Brush/Highlighter) ---
					// This tool is unbounded, so we call addPoint() continuously
					tool.addPoint(constrainedLogicalPoint);
				} else {
					if (tool.points().length === 0) {
						// First time drag is detected, add both points
						tool.addPoint(p0LocationLogical); // Commit P0 permanently at mousedown location
						tool.addPoint(constrainedLogicalPoint); // Add P1 (to be updated/ghosted)
					} else if (tool.points().length === 2) {
						// Already dragging, update P1
						tool.setPoint(1, constrainedLogicalPoint);
					}
				}
			}

			this._creationTool.updateAllViews();
			this._plugin.requestUpdate();
			return;
		}
	}
// --- 3. Editing Drag Flow (Final Logic for Shift Constraint) ---
	if (this._draggedTool && this._dragStartPoint) {
		// Check if the overall gesture has exceeded the drag threshold
		if (this._isDrag) {
			this._isEditing = true;

			// Lock the cursor to whatever we captured in MouseDown
			if (this._activeDragCursor) {
				this._draggedTool.setOverrideCursor(this._activeDragCursor);
			}
		}

		if (this._isEditing) {
			const tool = this._draggedTool;
			const isAnchorDrag = this._draggedPointIndex !== null;

			// Phase is used for the Model's getShiftConstrainedPoint logic
			const phase: InteractionPhase = isAnchorDrag ? InteractionPhase.Editing : InteractionPhase.Move;

			// --- Anchor Drag Logic (Resizing) ---
			if (isAnchorDrag) {
				const anchorIndex = ensureNotNull(this._draggedPointIndex);

				// --- Determine the Screen Point: Raw Mouse OR Shift-Constrained ---
				let constrainedScreenPoint: Point = point;

				// Declare a variable to capture the axis hint from the constraint engine
				let snapAxis: SnapAxis = 'none';

				// Apply Shift Constraint (N/S, E/W lock logic)
				if (this._isShiftKeyDown) {
					const originalLogicalPoint = this._originalDragPoints![anchorIndex];
					if (originalLogicalPoint && tool.getShiftConstrainedPoint) {
						const constraintResult = tool.getShiftConstrainedPoint(
							anchorIndex,
							point,
							phase,
							originalLogicalPoint,
							this._originalDragPoints!
						);
						constrainedScreenPoint = constraintResult.point;
						snapAxis = constraintResult.snapAxis;

						// --- PANE-AWARE COMPENSATION FIX ---
						if (constraintResult.snapAxis === 'price') {
							constrainedScreenPoint.y = (constrainedScreenPoint.y + this._getActivePaneYOffset()) as Coordinate;
						}
					}
				}

				// Convert the (potentially) constrained screen point to a fully snapped logical point
				let targetLogicalPoint = this.screenPointToLineToolPoint(constrainedScreenPoint);

				// --- START SYNCHRONOUS LOGICAL SNAP FIX (EDITING) ---
				// Bypass the lossy Pixel-to-Price round-trip when Shift locked us to an axis.
				if (targetLogicalPoint && snapAxis !== 'none') {
					const constraintSourceIndex = anchorIndex === 0 ? 1 : 0;
					const referenceLogicalPoint = this._originalDragPoints![constraintSourceIndex];

					if (referenceLogicalPoint) {
						if (snapAxis === 'time') {
							targetLogicalPoint.timestamp = referenceLogicalPoint.timestamp;
						} else if (snapAxis === 'price') {
							targetLogicalPoint.price = referenceLogicalPoint.price;
						}
					}
				}
				// --- END SYNCHRONOUS LOGICAL SNAP FIX ---

				// Final update call
				if (targetLogicalPoint) {
					tool.setPoint(anchorIndex, targetLogicalPoint);
				}
			} else {
// --- Tool Translate Logic (Move Phase) ---
				if (!this._originalDragPoints || this._originalDragPoints.length === 0) return;

				// Calculate new screen points based on delta
				const delta = point.subtract(this._dragStartPoint);

				// --- FIX for Stable Logical Translation Vector ---
				const tool = this._draggedTool;

				// 1. Get the Initial Logical P0 and Initial Screen Point
				const initialLogicalP0 = this._originalDragPoints[0];
				const initialScreenP0 = tool.pointToScreenPoint(initialLogicalP0);

				// If we cannot resolve the starting screen point, something is wrong.
				if (!initialScreenP0) return;

				// 2. Calculate the intended New Screen Point for P0
				const newScreenP0 = initialScreenP0.add(delta);

				// 3. Convert the intended new Screen Point back to a Logical Point
				const newLogicalP0 = tool.screenPointToPoint(newScreenP0);

				if (!newLogicalP0) {
					console.warn(`[InteractionManager] Failed to determine new logical P0.`);
					return;
				}

				// 4. Calculate the Stable Translation Vector in Logical Space (Index and Price)
				const initialP0LogicalIndex = this._originalDragLogicalIndices![0];
				const newP0LogicalIndex = this._chart.timeScale().coordinateToLogical(newScreenP0.x);

				if (initialP0LogicalIndex === null || newP0LogicalIndex === null) {
					console.warn(`[InteractionManager] Failed to determine logical indices for translation.`);
					return;
				}

				const logicalIndexDelta = newP0LogicalIndex - initialP0LogicalIndex;

				// BUG 1 FIX: Calculate the raw vector, but do not use it directly.
				const rawPriceTranslationVector = newLogicalP0.price - initialLogicalP0.price;

				const newLogicalPoints: LineToolPoint[] = [];

				// --- ROUNDING INJECTION: Extract minMove for translation ---
				const seriesOptions = this._series.options() as any;
				const minMove = seriesOptions?.priceFormat?.minMove || 0.01;

				// Perfectly round the translation vector itself to the minMove tick size.
				const priceTranslationVector = roundPriceToStep(rawPriceTranslationVector, minMove);

				// 5. Apply the Logical Translation Vector to all original points.
				for (let i = 0; i < this._originalDragPoints.length; i++) {
					const originalLogicalPoint = this._originalDragPoints[i];
					const originalIndex = this._originalDragLogicalIndices![i];

					let newTimestamp = originalLogicalPoint.timestamp; // Fallback

					if (originalIndex !== null) {
						// Shift the point purely by the amount of candles/indices moved
						const targetLogicalIndex = originalIndex + logicalIndexDelta;

						// Convert that shifted index back into a reliable timestamp
						const interpolatedTime = interpolateTimeFromLogicalIndex(this._chart, this._series, targetLogicalIndex);

						if (interpolatedTime !== null) {
							newTimestamp = this._horzScaleBehavior.key(interpolatedTime as any) as number;
						}
					}

					const translatedLogicalPoint: LineToolPoint = {
						timestamp: newTimestamp,
						// --- ROUNDING INJECTION: Clean the arithmetic result ---
						price: roundPriceToStep(originalLogicalPoint.price + priceTranslationVector, minMove),
					};

					newLogicalPoints.push(translatedLogicalPoint);
				}

				// 6. Update the tool with the full array of new translated points
				tool.setPoints(newLogicalPoints);
			}

			this._draggedTool.updateAllViews();
			this._plugin.requestUpdate();
		}
	}
}
/**
 * Handles the `mouseup` event, finalizing creation or editing, or processing
 * standalone clicks. Extracted from `InteractionManager._handleMouseUp`.
 */
export function handleMouseUp(this: any, event: MouseEvent): void {
	// Ignore mouse releases if the chart is locked
	if (this._locked) { return; }

	const point = this._eventToPoint(event);

	// Early exit if mouseup is outside chart and not part of an ongoing drag
	const chartElement = this._chart.chartElement();
	const clickedInsideChartElement = chartElement.contains(event.target as Node);

	if (!clickedInsideChartElement && !this._isDrag && !this._isCreationGesture && !this._draggedTool) {
		this._resetCommonGestureState();
		return;
	}

	// Flag to indicate if a specific interaction flow was handled.
	let handledInteraction = false;

	// --- 1. Finalize Creation Click/Drag ---
	if (this._isCreationGesture && this._creationTool && this._mouseDownPoint) {
		handledInteraction = true;
		const tool = this._creationTool;
		const timeDelta = performance.now() - this._mouseDownTime;
		const distanceMoved = point ? point.subtract(this._mouseDownPoint).length() : 0;

		// Determine finalization method once
		const finalizationMethod = tool.getFinalizationMethod();
		const endPoint = point || this._mouseDownPoint;

		// Start with the raw screen point
		let finalScreenPoint: Point = endPoint;

		let isDiscreteClick = timeDelta < CLICK_TIMEOUT && distanceMoved <= DRAG_THRESHOLD && !this._isDrag;

		// --- 1-POINT TOOLS ---
		if (tool.pointsCount === 1) {
			// For a 1-point tool, the first MouseUp event is the final action.
			const finalLogicalPoint = this.screenPointToLineToolPoint(endPoint);

			if (finalLogicalPoint) {
				// Add the single permanent point
				tool.addPoint(finalLogicalPoint);
				// Finalize and clean up
				this._finalizeToolCreation(tool);
				return;
			} else {
				// Point conversion failed (e.g., clicked far off-screen). Cancel creation.
				this.detachTool(tool);
				this._tools.delete(tool.id());
				this.setCurrentToolCreating(null);
				this._resetCreationGestureStateOnly();
				return;
			}
		}

		// Downgrade Accidental Drag to Click for fixed-point tools placing a subsequent point.
		if (this._creationTool && !isDiscreteClick) {
			const permanentPointsCount = tool.getPermanentPointsCount();
			const isFixedPointTool = tool.pointsCount > 0;
			const isSubsequentPointOfFixedTool = isFixedPointTool && permanentPointsCount > 0;

			if (isSubsequentPointOfFixedTool || tool.supportsClickDragCreation?.() === false) {
				// Override the drag state to false so the upcoming discrete-click check applies.
				isDiscreteClick = true;
			}
		}

		// Check creation method preferences
		const supportsClickClick = tool.supportsClickClickCreation?.() !== false;
		const supportsClickDrag = tool.supportsClickDragCreation?.() === true;

		if (finalizationMethod === FinalizationMethod.MouseUp) {
			// --- Freehand (Brush/Highlighter) Finalization Logic ---
			if (supportsClickDrag) {
				// Finalize only if at least two points were drawn (P0 + P1 or more)
				if (tool.getPermanentPointsCount() >= 2) {
					this._finalizeToolCreation(tool);
				} else {
					// Quick click-and-release without dragging = failed creation
					this.detachTool(tool);
					this._tools.delete(tool.id());
				}
				this._resetCreationGestureStateOnly();
				return;
			}
		}
if (isDiscreteClick) {
			// Case A: Discrete Click (Click-Click Mode)
			if (!supportsClickClick) {
				console.warn(`[InteractionManager] Tool ${tool.toolType} does not support click-click creation.`);
				this.setCurrentToolCreating(null);
				this.deselectAllTools();
				this._plugin.requestUpdate();
				this._resetCreationGestureStateOnly();
				return;
			}

			// --- SHIFT CONSTRAINT LOGIC FOR DISCRETE CLICK FINALIZATION ---
			const isShiftKeyDown = this._isShiftKeyDown;
			const isShiftConstraintSupported = tool.supportsShiftClickClickConstraint?.() === true;
			let snapAxis: SnapAxis = 'none';

			if (isShiftKeyDown && isShiftConstraintSupported) {
				// Index of point about to be added (P1 if P0 exists)
				const anchorIndexBeingAdded = tool.getPermanentPointsCount();
				const anchorIndexUsedForConstraint = 0;
				const originalLogicalPoint = tool.getPoint(anchorIndexUsedForConstraint);
				const allOriginalLogicalPoints = [originalLogicalPoint] as LineToolPoint[];

				if (originalLogicalPoint && tool.getShiftConstrainedPoint) {
					const constraintResult = tool.getShiftConstrainedPoint(
						anchorIndexBeingAdded,
						endPoint, // Pass the raw mouse point
						InteractionPhase.Creation,
						originalLogicalPoint, // P0's original position
						allOriginalLogicalPoints
					);
					finalScreenPoint = constraintResult.point;
					snapAxis = constraintResult.snapAxis;

					// --- PANE-AWARE COMPENSATION FIX ---
					if (snapAxis === 'price') {
						finalScreenPoint.y = (finalScreenPoint.y + this._getActivePaneYOffset()) as Coordinate;
					}
				}
			}
			// --- END SHIFT CONSTRAINT LOGIC ---

			// --- START SYNCHRONOUS LOGICAL SNAP FIX ---
			const isConstrained = this._isShiftKeyDown && tool.getPermanentPointsCount() > 0;
			let finalLogicalPoint: LineToolPoint | null = this.screenPointToLineToolPoint(finalScreenPoint, isConstrained);

			// Check if we are placing P1 (point index 1) which is where the constraint applies
			const isP1Click = tool.getPermanentPointsCount() === 1;

			if (finalLogicalPoint && isP1Click && snapAxis !== 'none') {
				// Clear ghost point since we are committing a snapped point
				tool.setLastPoint(null);
				const P0 = tool.getPoint(0);

				// Synchronously perform the final logical snap based on the hint
				if (P0) {
					if (snapAxis === 'time') {
						finalLogicalPoint = {
							timestamp: P0.timestamp,
							price: finalLogicalPoint.price,
						};
					} else if (snapAxis === 'price') {
						finalLogicalPoint = {
							timestamp: finalLogicalPoint.timestamp,
							price: P0.price,
						};
					}
				}
			} else {
				// If no snap needed (P0 or unconstrained P1), clear the ghost point
				if (finalLogicalPoint) {
					tool.setLastPoint(null);
				}
			}
			// --- END SYNCHRONOUS LOGICAL SNAP FIX ---

			if (finalLogicalPoint) {
				tool.addPoint(finalLogicalPoint);
			} else {
				console.warn(`[InteractionManager] Final logical point conversion failed. Click discarded.`);
			}

			if (finalizationMethod === FinalizationMethod.PointCount && tool.isFinished()) {
				this._finalizeToolCreation(tool);
				return;
			}
			// Otherwise: point placed, waiting for the next point.
		} else if (this._isDrag) {
			// Case B: Commit Click-and-Drag Creation
			if (!supportsClickDrag) {
				console.warn(`[InteractionManager] Tool ${tool.toolType} does not support click-drag creation.`);
				this.setCurrentToolCreating(null);
				this.deselectAllTools();
				this._plugin.requestUpdate();
				this._resetCreationGestureStateOnly();
				return;
			}

			// Finalization for Bounded Drag Tools (e.g., Rectangle)
			if (finalizationMethod === FinalizationMethod.PointCount && tool.pointsCount === 2) {
				if (tool.points().length === 2) {
					this._finalizeToolCreation(tool);
					return;
				}
			}
		}

		// Always reset gesture-specific flags after a creation mouseup
		this._resetCreationGestureStateOnly();
		return; // Handled creation flow
	}
// --- 2. Finalize Editing Click/Drag ---
	if (this._draggedTool && this._dragStartPoint) {
		if (this._isEditing) { // It was an EDITING DRAG
			this._plugin.fireAfterEditEvent(this._draggedTool, 'lineToolEdited');

			const tool = this._draggedTool as any;
			if (tool.normalize) { tool.normalize(); }
		} else { // Discrete CLICK ON AN EXISTING TOOL (selection)
			this._handleStandaloneClick(this._dragStartPoint);
		}

		// Always reset editing-specific flags after an editing mouseup
		this._resetEditingGestureStateOnly();
		return; // Handled editing flow
	}

	// --- 3. Standalone Click (in empty space or on external UI) ---
	const timeDeltaFinal = performance.now() - this._mouseDownTime;
	const distanceMovedFinal = this._mouseDownPoint && point ? point.subtract(this._mouseDownPoint).length() : 0;
	const wasAShortClick = (timeDeltaFinal < CLICK_TIMEOUT && distanceMovedFinal <= DRAG_THRESHOLD && point);

	if (wasAShortClick) {
		const chartElement = this._chart.chartElement();
		const clickedInsideChartElement = chartElement.contains(event.target as Node);

		if (clickedInsideChartElement) {
			handledInteraction = true;
			this._handleStandaloneClick(point);
		} else {
			// Click outside chart; we decided to ignore it but mark it handled.
			handledInteraction = true;
		}
	} else {
		// This was a drag that fell through creation/editing; deselect.
		if (this._isDrag) {
			handledInteraction = true;
			this.deselectAllTools();
			this._plugin.requestUpdate();
		}
	}

	// --- Final Fallback Reset ---
	if (!handledInteraction) {
		this._resetInteractionStateFully();
	} else {
		this._resetCommonGestureState();
	}
}
/**
 * Processes a discrete click that occurred outside of an active creation/editing gesture.
 * Extracted from `InteractionManager._handleStandaloneClick`.
 */
export function handleStandaloneClick(this: any, point: Point): void {
	const clickedTool = point ? this._hitTest(point)?.tool : null;

	if (clickedTool) {
		if (this._selectedTool === clickedTool) return;
		this.deselectAllTools();
		this._selectedTool = clickedTool;
		this._selectedTool.setSelected(true);

		// Fire the 'selected' event for the new tool
		this._plugin.fireSingleClickEvent(this._selectedTool, 'selected');
	} else {
		this.deselectAllTools();
	}
}

/**
 * Handles the chart's double-click event broadcast.
 * Extracted from `InteractionManager._handleDblClick`.
 */
export function handleDblClick(this: any, params: any): void {
	// Prevent double-click finalization or events if locked
	if (this._locked) { return; }

	const point = params.point ? new Point(params.point.x, params.point.y) : null;
	if (!point) return;

	// --- 1. Tool Creation Finalization (Path Tool Logic) ---
	if (this._currentToolCreating) {
		const tool = this._currentToolCreating;

		if (tool.getFinalizationMethod() === FinalizationMethod.DoubleClick) {
			// Tool creation is complete on double-click
			if (tool.getPermanentPointsCount() > 0) {
				// Allow the tool to perform its finalization cleanup (e.g., removing the rogue point)
				tool.handleDoubleClickFinalization();

				this._finalizeToolCreation(tool);
				// Reset the creation state after finalization
				this._resetCreationGestureStateOnly();
			} else {
				// No points placed = cancelled creation
				this.detachTool(tool);
				this._tools.delete(tool.id());
				this.setCurrentToolCreating(null);
			}
			return;
		}
	}

	// --- 2. Hover/Hit Test Logic (Existing Tool Logic) ---
	const hitResult = this._hitTest(point);
	if (hitResult && hitResult.tool) {
		this._plugin.fireDoubleClickEvent(hitResult.tool);
	}
}

/**
 * Handles the 'mouseleave' event on the chart container.
 * Extracted from `InteractionManager._handleMouseLeave`.
 */
export function handleMouseLeave(this: any, event: MouseEvent): void {
	// Nullify the global point so the crosshair logic knows the mouse is gone
	this._currentGlobalPoint = null;

	// If we are not currently creating a tool, clear our crosshair
	// to ensure no "ghost" crosshair remains stuck at the exit point.
	if (!this._currentToolCreating) {
		this._plugin.clearCrossHair();
	}
}

/**
 * Performs a hit test on all visible line tools in reverse Z-order (top-most first).
 * Extracted from `InteractionManager._hitTest`.
 */
export function hitTest(this: any, point: Point): any {
	// Iterate in reverse for Z-order (topmost first)
	const tools = Array.from(this._tools.values() as any[]).reverse();

	for (const tool of tools) {
		if (!tool.options().visible) {
			continue;
		}

		// --- NEW: THE MULTI-PANE HIT TEST NORMALIZATION ---
		// The tool's renderers calculate hits in local pane coordinates, so we must
		// subtract the chart-to-pane offset from point.y.
		const toolPaneOffset = this._getPaneYOffsetForTool(tool);
		const normalizedY = point.y - toolPaneOffset;

		const hitResult = tool._internalHitTest(point.x, normalizedY as Coordinate);

		if (hitResult) {
			return {
				tool: tool,
				pointIndex: hitResult.data()?.pointIndex ?? null,
				suggestedCursor: hitResult.data()?.suggestedCursor ?? null
			};
		}
	}
	return null;
}
/**
 * Handles the chart's crosshair move event for hover state and ghost-point drawing.
 * Extracted from `InteractionManager._handleCrosshairMove`.
 */
export function handleCrosshairMove(this: any, params: any): void {
	// Prevent hover states, ghosting, and custom crosshairs if locked
	if (this._locked) { return; }

	// --- Passive Magnet Logic (Browsing & Edit Mode) ---
	if (this._plugin.getMagnetThreshold() > 0 && !this._isShiftKeyDown && !this._currentToolCreating) {
		// FIX: Only override if we are over actual data (params.time exists).
		// This prevents the vertical line from jumping to the left in the blank space.
		if (params.point && params.time) {
			// --- CRITICAL MULTI-PANE FIX ---
			// Only hijack the crosshair if the TRUE global mouse is ACTUALLY inside this plugin's pane.
			const globalY = this._currentGlobalPoint ? this._currentGlobalPoint.y : -1;
			if (this._isMouseInActivePane(globalY)) {
				const globalX = this._currentGlobalPoint ? this._currentGlobalPoint.x : params.point.x;
				this._plugin.setCrossHairXY(globalX, globalY, true, params.time);
			}
		}
	}

	// --- Supplemental Crosshair Label Logic (Blank Space) ---
	if (params.point && !params.time) {
		// 1. Resolve the raw logical index from the mouse X coordinate.
		const logical = this._chart.timeScale().coordinateToLogical(params.point.x as Coordinate);

		if (logical !== null) {
			// 2. Extrapolate the "Virtual" timestamp for this index.
			const interpolatedTime = interpolateTimeFromLogicalIndex(this._chart, this._series, logical);

			if (interpolatedTime !== null) {
				const timeAsHorzScaleItem = interpolatedTime as any;

				// 3. Retrieve the current formatting state from the Plugin and the Chart.
				const pluginFormatter = this._plugin.getTimeFormatter();
				const chartFormatter = this._chart.options().localization.timeFormatter;

				let text = '';

				// 4. THE MIRROR HIERARCHY: Resolve the string content.
				if (pluginFormatter) {
					// Priority 1: User set a specific override via the plugin.
					text = pluginFormatter(timeAsHorzScaleItem);
				}
				else if (chartFormatter) {
					// Priority 2: Full Coverage Mirror.
					text = chartFormatter(timeAsHorzScaleItem);
				}
				else {
					// Priority 3: The Universal Fallback. Use the chart's internal scale behavior.
					const internalItem = this._horzScaleBehavior.convertHorzItemToInternal(timeAsHorzScaleItem);
					text = this._horzScaleBehavior.formatHorzItem(internalItem);
				}

				// 5. PIXEL SNAPPING: Round the logical index so the label "jumps" between intervals.
				const snappedLogical = Math.round(logical);
				const snappedX = this._chart.timeScale().logicalToCoordinate(snappedLogical as Logical);

				if (snappedX !== null) {
					// --- THROTTLE LOGIC: Only repaint if position/text actually changed ---
					if (this._lastCrosshairX !== snappedX || this._lastCrosshairText !== text || !this._crosshairSupplementalVisible) {
						this._lastCrosshairX = snappedX;
						this._lastCrosshairText = text;

						this._plugin.updateCrosshairTimeLabel(text, snappedX as Coordinate, true);
						this._crosshairSupplementalVisible = true;
						this._plugin.requestUpdate();
					}
				}
			} else {
				// Cleanup: mouse too far out of bounds to interpolate a valid time.
				if (this._crosshairSupplementalVisible) {
					this._lastCrosshairX = null;
					this._lastCrosshairText = '';
					this._plugin.updateCrosshairTimeLabel('', 0 as Coordinate, false);
					this._crosshairSupplementalVisible = false;
					this._plugin.requestUpdate();
				}
			}
		}
	} else {
		// MOUSE OVER DATA: Hide our supplemental label so the chart's native
		// crosshair label can show without interference.
		if (this._crosshairSupplementalVisible) {
			this._lastCrosshairX = null;
			this._lastCrosshairText = '';
			this._plugin.updateCrosshairTimeLabel('', 0 as Coordinate, false);
			this._crosshairSupplementalVisible = false;
			this._plugin.requestUpdate();
		}
	}
// --- Ghosting Logic (Drawing Mode) ---
	const toolBeingCreated = this._currentToolCreating;
	if (toolBeingCreated) {
		// FIX: Abandon LWC's params.point (pane-relative, ruins math). Clone our true global point.
		const rawScreenPoint = this._currentGlobalPoint ? this._currentGlobalPoint.clone() : null;

		// --- Single-Point Tool Ghosting (Pre-Click Ghosting) ---
		if (rawScreenPoint && toolBeingCreated.pointsCount === 1) {
			// Use setLastPoint to visualize the *final* tool location pre-click.
			const logicalPoint = this.screenPointToLineToolPoint(rawScreenPoint);
			if (logicalPoint) {
				// REFINEMENT: Force crosshair sync for 1-point tools (Horizontal/Vertical Lines)
				if (params.time && this._isMouseInActivePane(rawScreenPoint.y)) {
					this._plugin.setCrossHairXY(rawScreenPoint.x, rawScreenPoint.y, true, params.time);
				}

				toolBeingCreated.setLastPoint(logicalPoint);
				this._plugin.requestUpdate();
			}

			// We SKIP the complex multi-point ghosting and constraint logic below.
			return;
		}

		// We use true browser events for a reliable stream of shift data.
		const isShiftKeyDown = this._isShiftKeyDown;

		let finalScreenPoint: Point | null = rawScreenPoint;
		let snapAxis: SnapAxis = 'none';

		// Check if the tool supports click-click creation (ghosting is part of this)
		const supportsClickClick = toolBeingCreated.supportsClickClickCreation?.() !== false;

		if (!supportsClickClick) {
			// If the tool does not support click-click, no ghosting should occur.
			toolBeingCreated.setLastPoint(null);
			this._plugin.requestUpdate();
			return;
		}

		// Only apply constraint if the tool has placed P1 and the Shift key is down
		if (toolBeingCreated.points().length > 0 && rawScreenPoint && isShiftKeyDown && toolBeingCreated.supportsShiftClickClickConstraint?.() === true) {
			// Anchor being dragged is conceptually the second anchor (index 1)
			const anchorIndexBeingDragged = 1;
			const phase: InteractionPhase = InteractionPhase.Creation;

			// P0 is the constraint source.
			const anchorIndexUsedForConstraint = 0;
			const originalLogicalPoint = toolBeingCreated.getPoint(anchorIndexUsedForConstraint);

			// Construct the full points array needed by the constraint method (just P0 here)
			const allOriginalLogicalPoints: LineToolPoint[] = [originalLogicalPoint as LineToolPoint];

			if (toolBeingCreated.getShiftConstrainedPoint && originalLogicalPoint) {
				const constraintResult = toolBeingCreated.getShiftConstrainedPoint(
					anchorIndexBeingDragged,
					rawScreenPoint,
					phase,
					originalLogicalPoint,
					allOriginalLogicalPoints
				);
				finalScreenPoint = constraintResult.point as Point;
				snapAxis = constraintResult.snapAxis;

				// --- PANE-AWARE COMPENSATION FIX FOR GHOSTING ---
				// Elevate the returned Pane-Relative Y back to Chart-Relative.
				if (constraintResult.snapAxis === 'price') {
					finalScreenPoint.y = (finalScreenPoint.y + this._getActivePaneYOffset()) as Coordinate;
				}
			}
		}

		if (finalScreenPoint) {
			// All points are chart-relative here, so the math is safe
			const logicalPoint = this.screenPointToLineToolPoint(finalScreenPoint, isShiftKeyDown);

			if (logicalPoint) {
				// Apply the synchronous snap fix to ghosting during click-click drawing
				if (toolBeingCreated.points().length > 0 && snapAxis !== 'none') {
					const P0 = toolBeingCreated.getPoint(0);
					if (P0) {
						if (snapAxis === 'time') {
							logicalPoint.timestamp = P0.timestamp;
						} else if (snapAxis === 'price') {
							logicalPoint.price = P0.price;
						}
					}
				}

				// Use rawScreenPoint (already checked for null) instead of force-asserting params.point!
				if (params.time && rawScreenPoint && this._isMouseInActivePane(rawScreenPoint.y)) {
					this._plugin.setCrossHairXY(rawScreenPoint.x, rawScreenPoint.y, true, params.time);
				}

				// Update tool ghosting
				if (toolBeingCreated.points().length > 0) {
					toolBeingCreated.setLastPoint(logicalPoint);
				}
			} else {
				toolBeingCreated.setLastPoint(null);
			}
		} else {
			toolBeingCreated.setLastPoint(null);
		}

		this._plugin.requestUpdate();
		return;
	}

	// --- Hover Logic (Hit Test Mode) ---
	// Always follow the physical mouse tip using global coordinates.
	const point = this._currentGlobalPoint ? this._currentGlobalPoint.clone() : null;
	const hitResult = point ? this._hitTest(point) : null;
	const hoveredTool = hitResult ? hitResult.tool : null;

	if (this._hoveredTool && this._hoveredTool !== hoveredTool) {
		this._hoveredTool.setHovered(false);
	}

	this._hoveredTool = hoveredTool;
	if (hoveredTool) {
		hoveredTool.setHovered(true);
	}
}