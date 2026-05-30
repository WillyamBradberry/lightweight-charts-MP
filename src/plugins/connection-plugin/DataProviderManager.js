// src/plugins/connection-plugin/DataProviderManager.js
export class DataProviderManager {
  constructor(registry) {
    this._registry = registry;
    this._providers = new Map();
    this._activeProvider = null;
  }

  registerProvider(id, providerClass, config = {}) {
    this._providers.set(id, {
      class: providerClass,
      config,
      instance: null,
      status: 'registered'
    });
  }

  async activateProvider(id, connectionParams = {}) {
    const record = this._providers.get(id);
    if (!record) throw new Error(`Provider ${id} not found`);

    // Деактивируем текущий
    if (this._activeProvider) {
      await this.deactivateProvider(this._activeProvider);
    }

    // Создаём инстанс
    record.instance = new record.class(record.config);
    
    // Подключаем
    await record.instance.connect(connectionParams);
    record.status = 'connected';
    this._activeProvider = id;

    // Уведомляем систему
    this._registry.emitHook('data:provider:changed', {
      id,
      instance: record.instance,
      capabilities: record.instance.getCapabilities()
    });

    return record.instance;
  }

  getActiveProvider() {
    const record = this._providers.get(this._activeProvider);
    return record?.instance || null;
  }
}