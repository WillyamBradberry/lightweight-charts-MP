import { createLineToolsPlugin } from '@mp/line-tools-core';

/**
 * LineToolsCoreAdapter — Minimal adapter for the @mp/line-tools-core plugin.
 *
 * This adapter wraps the core line tools plugin API and exposes a simplified
 * set of methods for tool management. It does NOT implement sticky mode,
 * continuous auto-restart, right-click special logic, or mouse-button experiments.
 *
  * Public API:
 *   - startTool(type)             – Start a drawing tool by type string
 *   - clearTools()                – Clear all drawings from the chart (→ removeAllLineTools)
 *   - removeSelectedLineTools()   – Remove the currently selected drawings (→ removeSelectedLineTools)
 *   - lockAllDrawings()           – Lock all drawings to prevent interaction
 *   - unlockAllDrawings()         – Unlock all drawings for interaction
 *   - areDrawingsLocked()         – Check if all drawings are currently locked
 *   - setDefaultRange()           – No-op (placeholder for future range logic)
 *   - destroy()                   – Clean up and destroy the adapter/plugin instance
 */
export class LineToolsCoreAdapter {
  /**
   * Construct the adapter with the chart and series instances.
   * @param {object} chart - The chart instance
   * @param {object} series - The series instance
   * @param {object} [opts] - Optional adapter options
   */
  constructor(chart, series, opts = {}) {
    this._chart = chart;
    this._series = series;
    this._opts = opts;
    this._corePlugin = null;
    this._drawingsLocked = false;
    this._isDestroyed = false;
    this._onToolUsed = null;
    this._afterEditHandler = null;
    // CORE settings/delete popup state
    this._selectionHandler = null;
    this._selectedLineToolData = null;
    this._popupEl = null;
    this._popupColorInput = null;
    this._popupWidthEl = null;
  }

  /**
   * Initialize the core plugin and register priority tools.
   * Must be called before using any adapter methods.
   * @param {Function} registerToolsFn - Function to register priority tools (from toolRegistry)
   * @returns {void}
   */
  init(registerToolsFn, onToolUsed) {
    if (this._corePlugin) {
      console.warn('LineToolsCoreAdapter: already initialized');
      return;
    }

    // Store the optional shell callback used to signal "a drawing finished"
    // so the host can clear the active tool selection (non-sticky behavior).
    this._onToolUsed = typeof onToolUsed === 'function' ? onToolUsed : null;

    try {
      // Create the core line tools plugin instance

      this._corePlugin = createLineToolsPlugin(this._chart, this._series);

      // Register priority tools if a registerToolsFn is provided
      if (registerToolsFn && typeof registerToolsFn === 'function') {
        registerToolsFn(this._corePlugin);
      }

      console.log('LineToolsCoreAdapter: core plugin initialized');
    } catch (error) {
      console.error('LineToolsCoreAdapter: failed to initialize core plugin', error);
      // Fall back to a no-op plugin if core is not available
      this._createDummyPlugin();
    }

    // Non-sticky support: subscribe to finish events. Works for both the real
    // plugin and the dummy fallback (whose subscribe is a no-op).
    this._subscribeFinish();

    // CORE selection popup: show/hide a minimal settings/delete toolbar when a
    // drawing is selected/deselected.
    this._subscribeSelection();
  }

  /**
   * Subscribe to the core plugin's after-edit event and forward "drawing
   * finished" signals to the shell via the onToolUsed callback.
   *
   * The core plugin fires `subscribeLineToolsAfterEdit` with an event whose
   * `stage` is 'lineToolEdited' (point-drag edit of an existing tool),
   * 'pathFinished' (path-tool creation complete) or 'lineToolFinished'
   * (fixed-point tool creation complete). Only the creation-complete stages
   * trigger the shell callback, so adjusting an existing tool's points does
   * NOT deselect the toolbar (mirrors the legacy path's non-sticky behavior).
   * @returns {void}
   */
  _subscribeFinish() {
    if (!this._corePlugin) {
      return;
    }
    if (typeof this._corePlugin.subscribeLineToolsAfterEdit !== 'function') {
      console.warn('LineToolsCoreAdapter: subscribeLineToolsAfterEdit not available on core plugin');
      return;
    }
    // Avoid double-subscribing if init() is re-entered.
    if (this._afterEditHandler) {
      return;
    }
    this._afterEditHandler = (event) => {
      // 'lineToolFinished' => a fixed-point tool creation just completed.
      // 'pathFinished' => the path-tool analog. 'lineToolEdited' (point drag)
      // is intentionally ignored so editing an existing tool won't deselect.
      if (event && (event.stage === 'lineToolFinished' || event.stage === 'pathFinished')) {
        if (typeof this._onToolUsed === 'function') { this._onToolUsed(); }
      }
    };
    this._corePlugin.subscribeLineToolsAfterEdit(this._afterEditHandler);
  }

  /**
   * Subscribe to the core plugin's single-click selection event and show/hide a
   * minimal settings/delete popup for the selected drawing. The popup offers
   * basic style fields (line color, line width) and a Delete action, each wired
   * to the core plugin APIs `applyLineToolOptions` and `removeSelectedLineTools`.
   * @returns {void}
   */
  _subscribeSelection() {
    if (!this._corePlugin || this._selectionHandler) {
      return;
    }
    if (typeof this._corePlugin.subscribeLineToolsSingleClick !== 'function') {
      console.warn('LineToolsCoreAdapter: subscribeLineToolsSingleClick not available on core plugin');
      return;
    }
    this._selectionHandler = (event) => {
      if (!event) return;
      if (event.selectionState === 'selected') {
        this._selectedLineToolData = event.selectedLineTool || null;
        this._showPopup();
      } else {
        this._selectedLineToolData = null;
        this._hidePopup();
      }
    };
    this._corePlugin.subscribeLineToolsSingleClick(this._selectionHandler);
  }

  /**
   * Create a no-op dummy plugin used as a safe fallback if the core plugin
   * cannot be initialized (e.g. @mp/line-tools-core is missing).
   * Mirrors the core package's own dummy API so callers never crash.
   * @returns {void}
   */
  _createDummyPlugin() {
    const noop = () => {};
    this._corePlugin = {
      registerLineTool: noop,
      addLineTool: () => '',
      clearTools: noop,
      removeAllLineTools: noop,
      removeSelectedLineTools: noop,
      lockAllDrawings: noop,
      unlockAllDrawings: noop,
      areDrawingsLocked: () => false,
      destroy: noop,
    };
    console.warn('LineToolsCoreAdapter: using dummy plugin fallback');
  }

  /**
   * Clear all drawings from the chart.
   *
   * CORE mapping: the @mp/line-tools-core plugin exposes `removeAllLineTools()`
   * (it has no `clearTools` alias on its public API). Delegate to it, falling
   * back to a legacy `clearTools` if a wrapped plugin variant still exposes it.
   * @returns {void}
   */
  clearTools() {
    if (this._isDestroyed) {
      console.warn('LineToolsCoreAdapter: cannot clear tools, adapter is destroyed');
      return;
    }

    if (!this._corePlugin) {
      console.warn('LineToolsCoreAdapter: core plugin not initialized');
      return;
    }

    // CORE path: plugin.removeAllLineTools() is the canonical "clear all" API.
    // Keep a legacy fallback for any plugin variant that still exposes clearTools().
    const clearAll = typeof this._corePlugin.removeAllLineTools === 'function'
      ? this._corePlugin.removeAllLineTools
      : this._corePlugin.clearTools;

    if (typeof clearAll !== 'function') {
      console.warn('LineToolsCoreAdapter: removeAllLineTools not available on core plugin');
      return;
    }

    try {
      clearAll.call(this._corePlugin);
      console.log('LineToolsCoreAdapter: all tools cleared');
    } catch (error) {
      console.warn('LineToolsCoreAdapter: failed to clear tools', error);
    }
  }

  /**
   * Remove the currently selected line tool(s) from the chart.
   *
   * CORE mapping: delegates to plugin.removeSelectedLineTools() if available.
   * Use this for a "Delete selection" action (e.g. binding to a Delete key
   * press) to remove only the selected drawings, as opposed to {@link clearTools}
   * which removes everything.
   * @returns {void}
   */
  removeSelectedLineTools() {
    if (this._isDestroyed) {
      console.warn('LineToolsCoreAdapter: cannot remove selected tools, adapter is destroyed');
      return;
    }

    if (!this._corePlugin) {
      console.warn('LineToolsCoreAdapter: core plugin not initialized');
      return;
    }

    if (typeof this._corePlugin.removeSelectedLineTools !== 'function') {
      console.warn('LineToolsCoreAdapter: removeSelectedLineTools not available on core plugin');
      return;
    }

    try {
      this._corePlugin.removeSelectedLineTools();
      console.log('LineToolsCoreAdapter: selected tools removed');
    } catch (error) {
      console.warn('LineToolsCoreAdapter: failed to remove selected tools', error);
    }
  }
/**
   * Returns the currently selected line tool's export data (id/toolType/points/
   * options), or `null` if nothing is selected. Falls back to querying the core
   * plugin when the cached selection is missing.
   * @returns {object|null}
   */
  getSelectedLineTool() {
    if (this._selectedLineToolData) {
      return this._selectedLineToolData;
    }
    if (this._corePlugin && typeof this._corePlugin.getSelectedLineTools === 'function') {
      try {
        const arr = JSON.parse(this._corePlugin.getSelectedLineTools() || '[]');
        return Array.isArray(arr) && arr.length ? arr[0] : null;
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * Apply a partial options patch (e.g. `{ line: { color, width } }`) to the
   * currently selected drawing. Wires to the core plugin's `applyLineToolOptions`.
   * @param {object} patch - Partial core tool options to merge into the tool.
   * @returns {boolean} true if the options were applied, false otherwise.
   */
  applySelectedLineToolOptions(patch) {
    if (this._isDestroyed) {
      console.warn('LineToolsCoreAdapter: cannot apply options, adapter is destroyed');
      return false;
    }
    if (!this._corePlugin) {
      console.warn('LineToolsCoreAdapter: core plugin not initialized');
      return false;
    }
    if (typeof this._corePlugin.applyLineToolOptions !== 'function') {
      console.warn('LineToolsCoreAdapter: applyLineToolOptions not available on core plugin');
      return false;
    }
    const toolData = this.getSelectedLineTool();
    if (!toolData || !toolData.id) {
      console.warn('LineToolsCoreAdapter: no selected line tool to style');
      return false;
    }
    const next = {
      ...toolData,
      options: { ...(toolData.options || {}), ...patch },
    };
    try {
      this._corePlugin.applyLineToolOptions(next);
      console.log('[LT] applyLineToolOptions patch=', patch);
      return true;
    } catch (error) {
      console.warn('LineToolsCoreAdapter: failed to apply line tool options', error);
      return false;
    }
  }

  /**
   * Minimal DOM settings/delete popup overlaying the chart. Rendered when a
   * drawing is selected; delete is wired to removeSelectedLineTools(), and the
   * basic style fields (line color / line width) to applyLineToolOptions().
   */
  _ensurePopupEl() {
    if (this._popupEl) {
      return this._popupEl;
    }
    const el = document.createElement('div');
    el.className = 'line-tools-core-popup';
    el.style.cssText = 'position:fixed;z-index:1000;display:none;box-sizing:border-box;' +
      'min-width:190px;background:#1c2030;color:#d1d4dc;border:1px solid #2a2e39;' +
      'border-radius:6px;padding:8px 10px;font:12px/1.4 -apple-system,Segoe UI,sans-serif;' +
      'box-shadow:0 4px 12px rgba(0,0,0,.35);';

    // Color row
    const rowColor = document.createElement('label');
    rowColor.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';
    rowColor.appendChild(this._makeLabel('Color'));
    this._popupColorInput = document.createElement('input');
    this._popupColorInput.type = 'color';
    this._popupColorInput.addEventListener('input', () => {
      this.applySelectedLineToolOptions({ line: { color: this._popupColorInput.value } });
    });
    rowColor.appendChild(this._popupColorInput);

    // Width row
    const rowWidth = document.createElement('label');
    rowWidth.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';
    rowWidth.appendChild(this._makeLabel('Width'));
    this._popupWidthEl = document.createElement('select');
    [1, 2, 3, 4, 5].forEach((w) => {
      const opt = document.createElement('option');
      opt.value = String(w);
      opt.textContent = `${w}px`;
      this._popupWidthEl.appendChild(opt);
    });
    this._popupWidthEl.addEventListener('change', () => {
      this.applySelectedLineToolOptions({ line: { width: Number(this._popupWidthEl.value) } });
    });
    rowWidth.appendChild(this._popupWidthEl);

    // Delete button
    const btn = document.createElement('button');
    btn.textContent = 'Delete';
    btn.style.cssText = 'width:100%;margin-top:4px;padding:4px 8px;cursor:pointer;background:#3a2a2a;' +
      'color:#ff6b6b;border:1px solid #5a3636;border-radius:4px;';
    btn.addEventListener('click', () => {
      this.removeSelectedLineTools();
      this._selectedLineToolData = null;
      this._hidePopup();
    });

    el.appendChild(rowColor);
    el.appendChild(rowWidth);
    el.appendChild(btn);
    document.body.appendChild(el);
    this._popupEl = el;
    return el;
  }

  _makeLabel(text) {
    const span = document.createElement('span');
    span.style.cssText = 'flex:0 0 42px;';
    span.textContent = text;
    return span;
  }

  _showPopup() {
    if (this._isDestroyed || typeof document === 'undefined') {
      return;
    }
    const el = this._ensurePopupEl();
    const opts = (this._selectedLineToolData && this._selectedLineToolData.options) || {};
    const line = opts.line || {};
    if (this._popupColorInput && typeof line.color === 'string') {
      this._popupColorInput.value = line.color;
    }
    if (this._popupWidthEl && typeof line.width === 'number') {
      this._popupWidthEl.value = String(line.width);
    }
    let rect = null;
    if (this._chart && typeof this._chart.chartElement === 'function') {
      const chartEl = this._chart.chartElement();
      if (chartEl && typeof chartEl.getBoundingClientRect === 'function') {
        rect = chartEl.getBoundingClientRect();
      }
    }
    const left = rect ? rect.right - el.offsetWidth - 16 : window.innerWidth - el.offsetWidth - 16;
    const top = rect ? rect.top + 12 : 12;
    el.style.left = `${Math.max(0, left)}px`;
    el.style.top = `${top}px`;
    el.style.display = 'block';
  }

  _hidePopup() {
    if (this._popupEl) {
      this._popupEl.style.display = 'none';
    }
  }

  _removePopupEl() {
    if (this._popupEl && this._popupEl.parentNode) {
      this._popupEl.parentNode.removeChild(this._popupEl);
    }
    this._popupEl = null;
    this._popupColorInput = null;
    this._popupWidthEl = null;
  }
  /**
   * Lock all drawings to prevent dragging/moving.
   * @returns {void}
   */
  lockAllDrawings() {
    if (this._isDestroyed) {
      console.warn('LineToolsCoreAdapter: cannot lock drawings, adapter is destroyed');
      return;
    }

    if (!this._corePlugin) {
      console.warn('LineToolsCoreAdapter: core plugin not initialized');
      return;
    }

    if (typeof this._corePlugin.lockAllDrawings !== 'function') {
      console.warn('LineToolsCoreAdapter: lockAllDrawings not available on core plugin');
      return;
    }

    try {
      this._corePlugin.lockAllDrawings();
      this._drawingsLocked = true;
      console.log('LineToolsCoreAdapter: all drawings locked');
    } catch (error) {
      console.warn('LineToolsCoreAdapter: failed to lock drawings', error);
    }
  }

  /**
   * Unlock all drawings to allow dragging/moving.
   * @returns {void}
   */
  unlockAllDrawings() {
    if (this._isDestroyed) {
      console.warn('LineToolsCoreAdapter: cannot unlock drawings, adapter is destroyed');
      return;
    }

    if (!this._corePlugin) {
      console.warn('LineToolsCoreAdapter: core plugin not initialized');
      return;
    }

    if (typeof this._corePlugin.unlockAllDrawings !== 'function') {
      console.warn('LineToolsCoreAdapter: unlockAllDrawings not available on core plugin');
      return;
    }

    try {
      this._corePlugin.unlockAllDrawings();
      this._drawingsLocked = false;
      console.log('LineToolsCoreAdapter: all drawings unlocked');
    } catch (error) {
      console.warn('LineToolsCoreAdapter: failed to unlock drawings', error);
    }
  }

  /**
   * Check if all drawings are currently locked.
   * @returns {boolean} true if all drawings are locked, false otherwise
   */
  areDrawingsLocked() {
    if (this._isDestroyed) {
      return false;
    }

    // Return cached state if core plugin doesn't provide the method
    if (!this._corePlugin) {
      return this._drawingsLocked;
    }

    if (typeof this._corePlugin.areDrawingsLocked !== 'function') {
      return this._drawingsLocked;
    }

    try {
      return this._corePlugin.areDrawingsLocked();
    } catch (error) {
      console.warn('LineToolsCoreAdapter: failed to check if drawings are locked', error);
      return this._drawingsLocked;
    }
  }

  /**
   * No-op method. Kept for API compatibility; does nothing.
   * @returns {void}
   */
  setDefaultRange() {
    // Intentionally left blank (no-op)
    // Future: could be used to set default drawing range/extents
  }

  /**
   * Start a drawing tool by its registered core type name.
   * Delegates to the core plugin's addLineTool for interactive creation.
   * 'None'/falsy (cursor mode) simply stops any active drawing if supported.
   * @param {string} type - The mapped core tool type (e.g. 'TrendLine')
   * @returns {void}
   */
  startTool(type) {
    if (this._isDestroyed) {
      console.warn('LineToolsCoreAdapter: cannot start tool, adapter is destroyed');
      return;
    }

    if (!this._corePlugin) {
      console.warn('LineToolsCoreAdapter: core plugin not initialized');
      return;
    }
    
    console.log('[LT] adapter.startTool type=', type);
    
    // Cursor / no-tool => gracefully stop any in-progress drawing.
    if (!type || type === 'None' || type === 'none') {
      if (typeof this._corePlugin.deselectAllTools === 'function') {
        this._corePlugin.deselectAllTools();
      }
      return;
    }

    // If the tool is not registered on the CORE path, do not start it — log and
    // return early (no throw, no addLineTool attempt). The legacy bundle keeps
    // handling all tools; only the CORE path requires a registered tool class.
    if (typeof this._corePlugin.isLineToolRegistered === 'function') {
      if (!this._corePlugin.isLineToolRegistered(type)) {
        console.log('[LT] unsupported:', type);
        return;
      }
    }

    if (typeof this._corePlugin.addLineTool === 'function') {
      console.log('[LT] pluginExists=true');
      console.log('[LT] before addLineTool type=', type);
      try {
        this._corePlugin.addLineTool(type);
        console.log('[LT] after addLineTool type=', type);
      } catch (error) {
        console.error('[LT] error in addLineTool:', error);
      }
    } else {
      console.warn('LineToolsCoreAdapter: addLineTool not available on core plugin');
    }
  }

  /**
   * Clean up and destroy the adapter and core plugin instance.
   * Removes all drawings and severs references.
   * @returns {void}
   */
  destroy() {
    if (this._isDestroyed) {
      return;
    }

    this._isDestroyed = true;

    // Unsubscribe the finish handler BEFORE destroying the plugin. The core
    // plugin's destroy() self-neuters into a dummy, so the real subscription
    // must be torn down while the real API still exists.
    if (this._afterEditHandler && this._corePlugin && typeof this._corePlugin.unsubscribeLineToolsAfterEdit === 'function') {
      try {
        this._corePlugin.unsubscribeLineToolsAfterEdit(this._afterEditHandler);
      } catch (error) {
        console.warn('LineToolsCoreAdapter: error unsubscribing finish handler', error);
      }
      this._afterEditHandler = null;
    }

    // Unsubscribe the selection handler and drop the settings/delete popup.
    if (this._selectionHandler && this._corePlugin && typeof this._corePlugin.unsubscribeLineToolsSingleClick === 'function') {
      try {
        this._corePlugin.unsubscribeLineToolsSingleClick(this._selectionHandler);
      } catch (error) {
        console.warn('LineToolsCoreAdapter: error unsubscribing selection handler', error);
      }
    }
    this._selectionHandler = null;
    this._selectedLineToolData = null;
    this._removePopupEl();

    // Clean up core plugin if available
    if (this._corePlugin && typeof this._corePlugin.destroy === 'function') {
      try {
        this._corePlugin.destroy();
      } catch (error) {
        console.warn('LineToolsCoreAdapter: error during core plugin destroy', error);
      }
    }

    // Clear internal state
    this._corePlugin = null;
    this._drawingsLocked = false;
    this._onToolUsed = null;

    console.log('LineToolsCoreAdapter: destroyed');
  }
} // <-- Класс должен закрываться здесь

/**
 * Factory function to create a LineToolsCoreAdapter instance.
 * @param {import('lightweight-charts').IChartApi} chart - The chart instance
 * @param {import('lightweight-charts').ISeriesApi} series - The series instance
 * @param {object} [opts] - Optional options
 * @param {Function} [opts.registerTools] - Optional function to register priority tools
 * @returns {LineToolsCoreAdapter} A new adapter instance
 */
export function createLineToolsAdapter(chart, series, opts) {
  const adapter = new LineToolsCoreAdapter(chart, series, opts || {});
  return adapter;
}