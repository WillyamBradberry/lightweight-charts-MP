import { createLineToolsPlugin } from '@mp/line-tools-core';

/**
 * SVG icon set matching the "thin stroke" TradingView style used by the legacy
 * floating toolbar (see libs/lightweight-charts-ui/.../line-tools.js ICONS).
 * Injected as innerHTML so buttons render proper vector icons, not emoji.
 */
const ICONS = {
  drag: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 12" width="8" height="12" fill="currentColor"><rect width="2" height="2" rx="1"></rect><rect width="2" height="2" rx="1" y="5"></rect><rect width="2" height="2" rx="1" y="10"></rect><rect width="2" height="2" rx="1" x="6"></rect><rect width="2" height="2" rx="1" x="6" y="5"></rect><rect width="2" height="2" rx="1" x="6" y="10"></rect></svg>',
  template: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none" stroke="currentColor"><path stroke-linecap="round" d="M15.5 18.5h6m-3 3v-6"></path><rect width="6" height="6" rx="1.5" x="6.5" y="6.5"></rect><rect width="6" height="6" rx="1.5" x="15.5" y="6.5"></rect><rect width="6" height="6" rx="1.5" x="6.5" y="15.5"></rect></svg>',
  brush: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M10.62.72a2.47 2.47 0 0 1 3.5 0l1.16 1.16c.96.97.96 2.54 0 3.5l-.58.58-8.9 8.9-1 1-.14.14H0v-4.65l.14-.15 1-1 8.9-8.9.58-.58Zm2.8.7a1.48 1.48 0 0 0-2.1 0l-.23.23 3.26 3.26.23-.23c.58-.58.58-1.52 0-2.1l-1.16-1.16Zm.23 4.2-3.26-3.27-8.2 8.2 3.25 3.27 8.2-8.2Zm-8.9 8.9-3.27-3.26-.5.5V15h3.27l.5-.5Z"></path></svg>',
  text: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 13 15" width="13" height="15" fill="none"><path stroke="currentColor" d="M4 14.5h2.5m2.5 0H6.5m0 0V.5m0 0h-5a1 1 0 0 0-1 1V4m6-3.5h5a1 1 0 0 1 1 1V4"></path></svg>',
  fill: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20" fill="none"><path stroke="currentColor" d="M13.5 6.5l-3-3-7 7 7.59 7.59a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.82L13.5 6.5zm0 0v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6"></path><path fill="currentColor" d="M0 16.5C0 15 2.5 12 2.5 12S5 15 5 16.5 4 19 2.5 19 0 18 0 16.5z"></path><circle fill="currentColor" cx="9.5" cy="9.5" r="1.5"></circle></svg>',
  alert: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28"><path fill="currentColor" d="m19.54 4.5 3.96 4.32-.74.68-3.96-4.32.74-.68ZM7.46 4.5 3.5 8.82l.74.68L8.2 5.18l-.74-.68ZM19.74 10.33A7.5 7.5 0 0 1 21 14.5v.5h1v-.5a8.5 8.5 0 1 0-8.5 8.5h.5v-1h-.5a7.5 7.5 0 1 1 6.24-11.67Z"></path><path fill="currentColor" d="M13 9v5h-3v1h4V9h-1ZM19 20v-4h1v4h4v1h-4v4h-1v-4h-4v-1h4Z"></path></svg>',
  lock: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28"><path fill="currentColor" fill-rule="evenodd" d="M14 6a3 3 0 0 0-3 3v3h8.5a2.5 2.5 0 0 1 2.5 2.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 6 21.5v-7A2.5 2.5 0 0 1 8.5 12H10V9a4 4 0 0 1 8 0h-1a3 3 0 0 0-3-3zm-1 11a1 1 0 1 1 2 0v2a1 1 0 1 1-2 0v-2zm-6-2.5c0-.83.67-1.5 1.5-1.5h11c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5h-11A1.5 1.5 0 0 1 7 21.5v-7z"></path></svg>',
  delete: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28"><path fill="currentColor" d="M18 7h5v1h-2.01l-1.33 14.64a1.5 1.5 0 0 1-1.5 1.36H9.84a1.5 1.5 0 0 1-1.49-1.36L7.01 8H5V7h5V6c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v1Zm-6-2a1 1 0 0 0-1 1v1h6V6a1 1 0 0 0-1-1h-4ZM8.02 8l1.32 14.54a.5.5 0 0 0 .5.46h8.33a.5.5 0 0 0 .5-.46L19.99 8H8.02Z"></path></svg>',
  more: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none"><path fill="currentColor" fill-rule="evenodd" d="M7.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM5 14.5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0zm9.5-1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM12 14.5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0zm9.5-1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM19 14.5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0z"></path></svg>',
};

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
    this._activeDropdownHandlers = new Set();
    // Drag state
    this._dragTarget = null;
    this._dragStartX = 0;
    this._dragStartY = 0;
    this._dragPopupStartLeft = 0;
    this._dragPopupStartTop = 0;
    // Legacy compatibility: array of drawing primitives (used by handleContextMenu)
    this._tools = [];
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
   * Create the floating toolbar popup. Mirrors the legacy `_renderExpanded()`
   * (libs/lightweight-charts-ui/.../line-tools.js) — exact DOM structure with
   * real SVG icons; only the accent color scheme is changed.
   */
  _ensurePopupEl() {
    if (this._popupEl) return this._popupEl;

    const el = document.createElement('div');
    el.className = 'tv-floating-toolbar hidden';
    el.style.position = 'fixed';
    el.style.zIndex = '100';

    const tool = this._selectedLineToolData;
    const opts = (tool && tool.options) || {};
    const lineOpts = opts.line || {};
    const toolType = (tool && tool.type) || 'Line';
    const isText = toolType === 'Text' || toolType === 'Callout';

    // Left drag handle (exactly one, like the original)
    el.appendChild(this._createDragHandle());

    // Templates button
    const templateWrapper = this._createToolWrapper();
    const templateBtn = this._createButton(ICONS.template, 'Templates');
    templateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleDropdown(e, templateWrapper, () => {});
    });
    templateWrapper.appendChild(templateBtn);
    el.appendChild(templateWrapper);

    // Line / Text color button
    const color = isText ? (opts.textColor || lineOpts.color || '#131722') : (lineOpts.color || '#2962ff');
    const cWrap = this._createToolWrapper();
    const cBtn = this._createFillButton(isText ? ICONS.text : ICONS.brush, isText ? 'Text Color' : 'Line Color', color);
    cBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleDropdown(e, cWrap, (dd) => this._createColorGrid(dd, color, cBtn));
    });
    cWrap.appendChild(cBtn);
    el.appendChild(cWrap);

    this._addSeparator(el);

    // Width or Font Size trigger
    if (!isText && (opts.lineWidth !== undefined || opts.width !== undefined)) {
      const w = lineOpts.width ?? opts.lineWidth ?? 1;
      const ww = this._createToolWrapper();
      const wt = document.createElement('div');
      wt.className = 'stroke-width-trigger';
      wt.title = 'Line Width';
      const wp = document.createElement('div');
      wp.className = 'stroke-width-preview';
      wp.style.height = `${Math.max(1, w)}px`;
      const ws = document.createElement('span');
      ws.textContent = `${w}px`;
      wt.appendChild(wp);
      wt.appendChild(ws);
      wt.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleDropdown(e, ww, (dd) => this._createWidthList(dd, w, wp, ws));
      });
      ww.appendChild(wt);
      el.appendChild(ww);
    } else if (isText && opts.fontSize !== undefined) {
      const fs = opts.fontSize || 14;
      const fw = this._createToolWrapper();
      const ft = document.createElement('div');
      ft.className = 'font-size-trigger';
      ft.title = 'Font Size';
      const ftxt = document.createElement('span');
      ftxt.textContent = `${fs}`;
      ft.appendChild(ftxt);
      ft.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleDropdown(e, fw, (dd) => this._createFontSizeList(dd, fs));
      });
      fw.appendChild(ft);
      el.appendChild(fw);
    }

    this._addSeparator(el);

    // Lock button (toggles state, like the original)
    const lb = this._createButton(ICONS.lock, this.areDrawingsLocked() ? 'Unlock' : 'Lock');
    if (this.areDrawingsLocked()) lb.classList.add('active');
    lb.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); this._toggleToolLock(e); });
    el.appendChild(lb);

    // Delete button
    const db = this._createButton(ICONS.delete, 'Remove');
    db.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); this.removeSelectedLineTools(); this._selectedLineToolData = null; this._hidePopup(); });
    el.appendChild(db);

    // More (ellipsis) button
    el.appendChild(this._createButton(ICONS.more, 'More'));

    document.body.appendChild(el);
    this._popupEl = el;
    return el;
  }

  /** Create a drag handle element with drag-to-move behaviour. */
  _createDragHandle() {
    const handle = document.createElement('div');
    handle.className = 'drag-handle';
    handle.innerHTML = ICONS.drag;
    handle.addEventListener('mousedown', (e) => this._startDrag(e));
    return handle;
  }

  /** Create a wrapper div for a toolbar button/dropdown. */
  _createToolWrapper() {
    const wrapper = document.createElement('div');
    wrapper.className = 'tool-wrapper';
    return wrapper;
  }

  /** Create an icon button with a title. */
  _createButton(icon, title) {
    const btn = document.createElement('button');
    btn.className = 'tool-btn';
    btn.innerHTML = icon;
    btn.title = title;
    return btn;
  }

  /** Create a fill-color button with a color preview strip at the bottom. */
  _createFillButton(icon, title, color) {
    const btn = document.createElement('button');
    btn.className = 'tool-btn fill-btn';
    btn.title = title;
    const wrap = document.createElement('div');
    wrap.className = 'fill-btn-wrap';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'fill-btn-icon';
    iconSpan.innerHTML = icon;
    const colorBg = document.createElement('div');
    colorBg.className = 'fill-btn-color-bg';
    const colorBar = document.createElement('div');
    colorBar.className = 'fill-btn-color';
    colorBar.style.backgroundColor = color;
    colorBg.appendChild(colorBar);
    wrap.appendChild(iconSpan);
    wrap.appendChild(colorBg);
    btn.appendChild(wrap);
    return btn;
  }

  /** Append a vertical separator to the given container. */
  _addSeparator(container) {
    if (!container) return;
    const sep = document.createElement('div');
    sep.className = 'divider';
    container.appendChild(sep);
  }

  /** Toggle a dropdown panel for the given tool-wrapper element. */
  _toggleDropdown(event, wrapperEl, contentCallback) {
    event.stopPropagation();
    const existing = wrapperEl.querySelector('.tv-floating-toolbar__dropdown');
    if (existing && existing.classList.contains('visible')) {
      existing.classList.remove('visible');
      return;
    }
    this._closeAllDropdowns();
    let dropdown = wrapperEl.querySelector('.tv-floating-toolbar__dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.className = 'tv-floating-toolbar__dropdown';
      wrapperEl.appendChild(dropdown);
    }
    dropdown.innerHTML = '';
    contentCallback(dropdown);
    const closeHandler = () => {
      dropdown.classList.remove('visible');
      document.removeEventListener('click', closeHandler);
      this._activeDropdownHandlers.delete(closeHandler);
    };
    this._activeDropdownHandlers.add(closeHandler);
    requestAnimationFrame(() => {
      if (this._activeDropdownHandlers.has(closeHandler)) {
        dropdown.classList.add('visible');
        setTimeout(() => {
          if (this._activeDropdownHandlers.has(closeHandler)) {
            document.addEventListener('click', closeHandler);
          }
        }, 0);
      }
    });
    dropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  /** Close all visible dropdowns within the toolbar. */
  _closeAllDropdowns() {
    if (!this._popupEl) return;
    this._popupEl.querySelectorAll('.tv-floating-toolbar__dropdown.visible')
      .forEach((dd) => dd.classList.remove('visible'));
    for (const handler of this._activeDropdownHandlers) {
      document.removeEventListener('click', handler);
    }
    this._activeDropdownHandlers.clear();
  }

// --- Dropdown content generators ---

  /** Build a color palette grid inside the given dropdown container. */
  _createColorGrid(container, currentColor, fillBtn) {
    const colors = [
      '#2962ff', '#1e88e5', '#42a5f5', '#0d47a1',
      '#e53935', '#f44336', '#ef5350', '#b71c1c',
      '#43a047', '#66bb6a', '#2e7d32', '#1b5e20',
      '#fb8c00', '#ffa726', '#f57c00', '#e65100',
      '#8e24aa', '#ab47bc', '#6a1b9a', '#4a148c',
      '#fdd835', '#ffee58', '#fbc02d', '#f9a825',
      '#ffffff', '#bdbdbd', '#757575', '#424242',
    ];
    const grid = document.createElement('div');
    grid.className = 'tv-color-picker__grid';
    colors.forEach((color) => {
      const swatch = document.createElement('div');
      swatch.className = 'tv-color-picker__swatch';
      if (String(color).toLowerCase() === String(currentColor).toLowerCase()) {
        swatch.classList.add('active');
      }
      swatch.style.backgroundColor = color;
      swatch.addEventListener('click', () => {
        this.applySelectedLineToolOptions({ line: { color } });
        if (fillBtn) {
          const bar = fillBtn.querySelector('.fill-btn-color');
          if (bar) bar.style.backgroundColor = color;
        }
        container.classList.remove('visible');
      });
      grid.appendChild(swatch);
    });
    // Custom color input
    const customBtn = document.createElement('div');
    customBtn.className = 'tv-color-picker__custom-btn';
    customBtn.innerHTML = '<input type="color" class="tv-color-picker__input"><span>+</span>';
    const colorInput = customBtn.querySelector('input[type="color"]');
    colorInput.value = currentColor || '#2962ff';
    colorInput.addEventListener('input', (e) => {
      this.applySelectedLineToolOptions({ line: { color: e.target.value } });
      if (fillBtn) {
        const bar = fillBtn.querySelector('.fill-btn-color');
        if (bar) bar.style.backgroundColor = e.target.value;
      }
    });
    customBtn.appendChild(colorInput);
    container.appendChild(grid);
    container.appendChild(customBtn);
  }

  /** Build a line-width picker list inside the given dropdown container. */
  _createWidthList(container, currentWidth, previewEl, textEl) {
    const widths = [1, 2, 3, 4];
    widths.forEach((w) => {
      const item = document.createElement('div');
      item.className = 'tv-width-picker__item';
      if (w === currentWidth) item.classList.add('active');
      item.innerHTML = `<div class="tv-width-picker__line" style="height:${w}px"></div>` +
        `<div class="tv-width-picker__text">${w}px</div>`;
      item.addEventListener('click', () => {
        this.applySelectedLineToolOptions({ line: { width: w } });
        if (previewEl) previewEl.style.height = `${w}px`;
        if (textEl) textEl.textContent = `${w}px`;
        container.classList.remove('visible');
      });
      container.appendChild(item);
    });
  }

  /** Build a font-size picker list inside the given dropdown container. */
  _createFontSizeList(container, currentSize) {
    const sizes = [8, 10, 11, 12, 14, 16, 18, 20, 22, 24];
    sizes.forEach((s) => {
      const item = document.createElement('div');
      item.className = 'tv-font-size-picker__item';
      if (s === currentSize) item.classList.add('active');
      item.innerHTML = `<div class="tv-font-size-picker__text">${s}</div>`;
      item.addEventListener('click', () => {
        this.applySelectedLineToolOptions({ fontSize: s });
        const trigger = container.parentElement?.querySelector('.font-size-trigger span');
        if (trigger) trigger.textContent = `${s}`;
        container.classList.remove('visible');
      });
      container.appendChild(item);
    });
  }

  /** Toggle lock state for the currently selected drawing. */
  _toggleToolLock(event) {
    if (this.areDrawingsLocked()) {
      this.unlockAllDrawings();
    } else if (this._corePlugin && typeof this._corePlugin.lockAllDrawings === 'function') {
      this._corePlugin.lockAllDrawings();
    }
    const btn = event.target && event.target.closest ? event.target.closest('.tool-btn') : null;
    if (btn) {
      const nowLocked = this.areDrawingsLocked();
      btn.classList.toggle('active', nowLocked);
      btn.title = nowLocked ? 'Unlock' : 'Lock';
    }
  }
// --- Drag behaviour ---

  /** Begin dragging the floating toolbar popup. */
  _startDrag(event) {
    if (!this._popupEl || event.button !== 0) return;
    event.preventDefault();
    this._dragTarget = this._popupEl;
    this._dragStartX = event.clientX;
    this._dragStartY = event.clientY;
    const rect = this._popupEl.getBoundingClientRect();
    this._dragPopupStartLeft = rect.left;
    this._dragPopupStartTop = rect.top;
    document.addEventListener('mousemove', this._onDragMove);
    document.addEventListener('mouseup', this._onDragEnd);
  }

  /** Bound handler for mousemove during a drag. */
  _onDragMove = (event) => {
    if (!this._dragTarget) return;
    const dx = event.clientX - this._dragStartX;
    const dy = event.clientY - this._dragStartY;
    const rect = this._dragTarget.getBoundingClientRect();
    const left = Math.max(0, Math.min(window.innerWidth - rect.width, this._dragPopupStartLeft + dx));
    const top = Math.max(0, Math.min(window.innerHeight - rect.height, this._dragPopupStartTop + dy));
    this._dragTarget.style.left = `${left}px`;
    this._dragTarget.style.top = `${top}px`;
  };

  /** Bound handler for mouseup — ends the drag. */
  _onDragEnd = () => {
    if (!this._dragTarget) return;
    document.removeEventListener('mousemove', this._onDragMove);
    document.removeEventListener('mouseup', this._onDragEnd);
    this._dragTarget = null;
  };

  /** Refresh popup preview values from the currently selected tool options. */
  _refreshPopupValues() {
    if (!this._popupEl || !this._selectedLineToolData) return;
    const opts = (this._selectedLineToolData.options) || {};
    const lineOpts = opts.line || {};
    const color = typeof lineOpts.color === 'string' ? lineOpts.color : null;
    this._popupEl.querySelectorAll('.fill-btn-color').forEach((bar) => {
      if (color) bar.style.backgroundColor = color;
    });
    const width = typeof lineOpts.width === 'number' ? lineOpts.width : null;
    if (width !== null) {
      const preview = this._popupEl.querySelector('.stroke-width-preview');
      const text = this._popupEl.querySelector('.stroke-width-trigger span:last-child');
      if (preview) preview.style.height = `${Math.max(1, width)}px`;
      if (text) text.textContent = `${width}px`;
    }
    const lockBtn = this._popupEl.querySelector('.tool-btn[title="Lock"], .tool-btn[title="Unlock"]');
    if (lockBtn) {
      const nowLocked = this.areDrawingsLocked();
      lockBtn.classList.toggle('active', nowLocked);
      lockBtn.title = nowLocked ? 'Unlock' : 'Lock';
    }
  }

  _showPopup() {
    if (this._isDestroyed || typeof document === 'undefined') {
      return;
    }
    const el = this._ensurePopupEl();
    this._refreshPopupValues();
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
    // Keep display:inline-flex from CSS; toggle the .hidden class like the legacy toolbar.
    el.classList.remove('hidden');
  }

  _hidePopup() {
    if (this._popupEl) {
      this._popupEl.classList.add('hidden');
      this._closeAllDropdowns();
    }
  }

  _removePopupEl() {
    if (this._popupEl && this._popupEl.parentNode) {
      this._popupEl.parentNode.removeChild(this._popupEl);
    }
    this._closeAllDropdowns();
    if (this._dragTarget) {
      document.removeEventListener('mousemove', this._onDragMove);
      document.removeEventListener('mouseup', this._onDragEnd);
      this._dragTarget = null;
    }
    this._popupEl = null;
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