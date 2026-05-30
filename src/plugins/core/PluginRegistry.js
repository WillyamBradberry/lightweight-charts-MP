// src/plugins/core/PluginRegistry.js
export class PluginRegistry {
  constructor() {
    this._plugins = new Map();      // id → plugin instance
    this._hooks = new Map();        // hook name → Set<handlers>
    this._api = new Map();          // exposed API endpoints
  }

  // Регистрация плагина
  register(id, plugin, config = {}) {
    if (this._plugins.has(id)) {
      throw new Error(`Plugin ${id} already registered`);
    }
    
    const context = this._createPluginContext(id);
    this._plugins.set(id, {
      instance: plugin,
      config,
      status: 'registered',
      metadata: plugin.metadata || {}
    });

    // Lifecycle: init
    if (typeof plugin.init === 'function') {
      plugin.init(context, config);
    }
    
    return context;
  }

  // Подписка на хуки (cross-plugin communication)
  onHook(hookName, handler) {
    if (!this._hooks.has(hookName)) {
      this._hooks.set(hookName, new Set());
    }
    this._hooks.get(hookName).add(handler);
    return () => this._hooks.get(hookName)?.delete(handler); // unsubscribe
  }

  // Вызов хуков
  async emitHook(hookName, payload) {
    const handlers = this._hooks.get(hookName);
    if (!handlers) return [];
    return Promise.all([...handlers].map(h => h(payload)));
  }

  // API экспорт/импорт между плагинами
  expose(id, api) {
    this._api.set(id, api);
  }
  
  use(otherId) {
    return this._api.get(otherId);
  }
}