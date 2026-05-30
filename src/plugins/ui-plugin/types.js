// src/plugins/ui-plugin/types.js
export const UIExtensionPoints = {
  TOOLBAR_BUTTON: 'toolbar:button',           // Добавить кнопку в тулбар
  TOOLBAR_GROUP: 'toolbar:group',             // Добавить группу в тулбар
  TOPBAR_SECTION: 'topbar:section',           // Секция в топбаре
  PANEL: 'panel:register',                    // Новая панель (как Watchlist)
  CONTEXT_MENU: 'context:menu',               // Пункт контекстного меню
  CHART_OVERLAY: 'chart:overlay',             // Оверлей поверх графика
  MODAL: 'modal:register',                    // Модальное окно
};

// src/plugins/ui-plugin/UIPluginManager.js
export class UIPluginManager {
  constructor(registry) {
    this._registry = registry;
    this._extensions = new Map();
    this._components = new Map();
  }

  register(extensionPoint, id, component, config = {}) {
    if (!this._extensions.has(extensionPoint)) {
      this._extensions.set(extensionPoint, new Map());
    }
    this._extensions.get(extensionPoint).set(id, { component, config });
    
    // Эмитим событие для React-части
    this._registry.emitHook(`ui:${extensionPoint}:changed`, {
      id, component, config
    });
  }

  getExtensions(point) {
    return this._extensions.get(point) || new Map();
  }
}