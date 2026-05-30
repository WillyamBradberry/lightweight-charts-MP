/**
 * AlertAdapter — Encapsulates all access to the LineToolManager's internal
 * `_userPriceAlerts` primitive.
 *
 * The vendored lightweight-charts-line-tools@4.1.1 plugin does not expose
 * the price alert subsystem through its public API. All alert interactions
 * currently reach into `manager._userPriceAlerts` directly — an underscore-
 * prefixed private property that may change between plugin versions.
 *
 * This adapter is the single bridge between the shell (App.jsx / ChartComponent)
 * and the plugin's alert primitive. If the plugin internals change, only this
 * file needs updating.
 *
 * Usage:
 *   const adapter = new AlertAdapter(lineToolManager);
 *   adapter.create(45000, 'crossing');
 *   adapter.remove(12345);
 *   adapter.onChange((alerts) => console.log(alerts));
 *
 * @class AlertAdapter
 */
export class AlertAdapter {
  /**
   * @param {object} lineToolManager - The LineToolManager instance.
   * Must have a `_userPriceAlerts` property.
   */
  constructor(lineToolManager) {
    /** @private */
    this._alerts = lineToolManager && lineToolManager._userPriceAlerts;
  }

  /**
   * Set the symbol name on the alert primitive.
   * Must be called before `create()` to associate alerts with the correct symbol.
   *
   * @param {string} name - Trading symbol (e.g. 'BTCUSDT').
   * @returns {void}
   */
  setSymbol(name) {
    if (!this._alerts) return;
    if (typeof this._alerts.setSymbolName === 'function') {
      this._alerts.setSymbolName(name);
    }
  }

  /**
   * Create a price alert on the chart without opening a dialog.
   *
   * @param {number|string} price - The price value to alert on.
   * @param {string} [condition='crossing'] - Alert condition.
   *   One of 'crossing', 'crossing_up', 'crossing_down'.
   * @returns {void}
   */
  create(price, condition = 'crossing') {
    if (!this._alerts || price == null) return;

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum)) return;

    try {
      // Primary path: add alert without dialog
      if (typeof this._alerts.addAlertWithCondition === 'function') {
        this._alerts.addAlertWithCondition(priceNum, condition);
        return;
      }

      // Fallback for older plugin builds: show internal dialog
      if (typeof this._alerts.openEditDialog === 'function') {
        this._alerts.openEditDialog(priceNum, {
          price: priceNum,
          condition: condition,
        });
      }
    } catch (err) {
      console.warn('AlertAdapter: Failed to create alert', err);
    }
  }

  /**
   * Remove a price alert from the chart by its external ID.
   *
   * @param {number|string} externalId - The alert ID assigned by the plugin.
   * @returns {void}
   */
  remove(externalId) {
    if (!this._alerts || !externalId) return;

    try {
      if (typeof this._alerts.removeAlert === 'function') {
        this._alerts.removeAlert(externalId);
      }
    } catch (err) {
      console.warn('AlertAdapter: Failed to remove alert', err);
    }
  }

  /**
   * Get all current alerts from the plugin primitive.
   *
   * @returns {Array<{id: number, price: number, condition: string, type: string}>}
   */
  getAll() {
    if (!this._alerts) return [];
    if (typeof this._alerts.alerts === 'function') {
      try {
        return this._alerts.alerts() || [];
      } catch (err) {
        console.warn('AlertAdapter: Failed to get alerts', err);
      }
    }
    return [];
  }

  /**
   * Subscribe to alert change events.
   * The callback is invoked whenever an alert is created, modified, or removed
   * through the plugin's internal UI.
   *
   * @param {function} callback - Receives the current alerts array:
   *   `(alerts: Array<{id, price, condition, type}>) => void`.
   * @param {object} [context] - Optional subscription context (the manager
   *   instance, required by the plugin's subscription system).
   * @returns {{ unsubscribe: function }|null} Subscription handle, or null if
   *   the alert primitive is unavailable.
   */
  onChange(callback, context) {
    if (!this._alerts || typeof this._alerts.alertsChanged !== 'function') {
      return null;
    }

    try {
      return this._alerts.alertsChanged().subscribe(callback, context);
    } catch (err) {
      console.warn('AlertAdapter: Failed to subscribe to alert changes', err);
      return null;
    }
  }

  /**
   * Subscribe to alert trigger events.
   * The callback is invoked when a price alert condition is met.
   *
   * @param {function} callback - Receives an event object:
   *   `(evt: {alertId, alertPrice, timestamp, direction, condition}) => void`.
   * @param {object} [context] - Optional subscription context (the manager
   *   instance, required by the plugin's subscription system).
   * @returns {{ unsubscribe: function }|null} Subscription handle, or null if
   *   the alert primitive is unavailable.
   */
  onTrigger(callback, context) {
    if (!this._alerts || typeof this._alerts.alertTriggered !== 'function') {
      return null;
    }

    try {
      return this._alerts.alertTriggered().subscribe(callback, context);
    } catch (err) {
      console.warn('AlertAdapter: Failed to subscribe to alert triggers', err);
      return null;
    }
  }
}

export default AlertAdapter;