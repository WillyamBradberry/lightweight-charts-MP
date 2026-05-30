// src/plugins/config-plugin/ConfigManager.js
export class ConfigManager {
  constructor(registry) {
    this._registry = registry;
    this._config = this._loadDefault();
  }

  // Загрузка из localStorage / API / файла
  load(source = 'localStorage') {
    switch(source) {
      case 'localStorage':
        return this._loadFromStorage();
      case 'api':
        return this._loadFromAPI();
      case 'file':
        return this._loadFromFile();
    }
  }

  // Экспорт конфигурации
  export(format = 'json') {
    const config = this._buildExportConfig();
    
    switch(format) {
      case 'json':
        return JSON.stringify(config, null, 2);
      case 'url':
        // Сжимаем и кодируем в URL-параметр
        return this._encodeToURL(config);
      case 'file':
        this._downloadAsFile(config);
        break;
    }
  }

  // Применение конфигурации к системе
  async apply(config) {
    // 1. Features → вкл/выкл модули
    for (const [featureId, feature] of Object.entries(config.features)) {
      if (feature.enabled) {
        await this._registry.emitHook(`feature:${featureId}:enable`, feature);
      } else {
        await this._registry.emitHook(`feature:${featureId}:disable`);
      }
    }

    // 2. Styles → ThemeEngine
    await this._registry.emitHook('theme:apply', config.styles);

    // 3. Behaviors → глобальные настройки
    await this._registry.emitHook('behavior:apply', config.behaviors);

    // 4. Icons → обновление реестра иконок
    await this._registry.emitHook('icons:apply', config.icons);
  }
}