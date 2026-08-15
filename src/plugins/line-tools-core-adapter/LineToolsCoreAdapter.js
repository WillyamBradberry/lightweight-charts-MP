/**
 * LineToolsCoreAdapter — Minimal adapter for the @mp/line-tools-core plugin.
 *
 * This adapter wraps the core line tools plugin API and exposes a simplified
 * set of methods for tool management. It does NOT implement sticky mode,
 * continuous auto-restart, right-click special logic, or mouse-button experiments.
 *
 * Public API:
 *   - startTool(type)      – Start a drawing tool by type string
 *   - clearTools()         – Clear all drawings from the chart
 *   - lockAllDrawings()    – Lock all drawings to prevent interaction
 *   - unlockAllDrawings()  – Unlock all drawings for interaction
 *   - areDrawingsLocked()  – Check if all drawings are currently locked
 *   - setDefaultRange()    – No-op (placeholder for future range logic)
 *   - destroy()            – Clean up and destroy the adapter/plugin instance
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
  }

  /**
   * Initialize the core plugin and register priority tools.
   * Must be called before using any adapter methods.
   * @param {Function} registerToolsFn - Function to register priority tools (from toolRegistry)
   * @returns {void}
   */
  init(registerToolsFn) {
    if (this._corePlugin) {
      console.warn('LineToolsCoreAdapter: already initialized');
      return;
    }

    try {
      // Import the core line tools plugin
      const { createLineToolsPlugin } = require('@mp/line-tools-core');

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
      lockAllDrawings: noop,
      unlockAllDrawings: noop,
      areDrawingsLocked: () => false,
      destroy: noop,
    };
    console.warn('LineToolsCoreAdapter: using dummy plugin fallback');
  }

  /**
   * Clear all drawings from the chart.
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

    if (typeof this._corePlugin.clearTools !== 'function') {
      console.warn('LineToolsCoreAdapter: clearTools not available on core plugin');
      return;
    }

    try {
      this._corePlugin.clearTools();
      console.log('LineToolsCoreAdapter: all tools cleared');
    } catch (error) {
      console.warn('LineToolsCoreAdapter: failed to clear tools', error);
    }
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

    console.log('[Adapter] startTool=', type);

    // Cursor / no-tool => gracefully stop any in-progress drawing.
    if (!type || type === 'None' || type === 'none') {
      if (typeof this._corePlugin.deselectAllTools === 'function') {
        this._corePlugin.deselectAllTools();
      }
      return;
    }

    if (typeof this._corePlugin.addLineTool === 'function') {
      console.log('[Adapter] addLineTool called=', type);
      this._corePlugin.addLineTool(type);
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