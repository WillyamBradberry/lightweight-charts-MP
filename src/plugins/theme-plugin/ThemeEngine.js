// src/plugins/theme-plugin/ThemeEngine.js
export class ThemeEngine {
  constructor(registry) {
    this._registry = registry;
    this._themes = new Map();
    this._activeTheme = null;
    this._customOverrides = new Map(); // Пользовательские переопределения
  }

  // Регистрация темы
  registerTheme(id, definition) {
    this._themes.set(id, {
      id,
      name: definition.name,
      chart: definition.chart,
      tools: definition.tools,
      alerts: definition.alerts,
      ui: definition.ui,
      panels: definition.panels
    });
  }

  // Активация темы
  activateTheme(themeId, customOverrides = {}) {
    const theme = this._themes.get(themeId);
    if (!theme) throw new Error(`Theme ${themeId} not found`);

    this._activeTheme = themeId;
    this._customOverrides = new Map(Object.entries(customOverrides));

    // Мержим базовую тему + кастомные переопределения
    const merged = this._mergeWithOverrides(theme);

    // Применяем ко всем слоям
    this._registry.emitHook('theme:changed', {
      theme: merged,
      chartOptions: this._buildChartOptions(merged),
      toolDefaults: this._buildToolDefaults(merged),
      alertStyles: this._buildAlertStyles(merged),
      cssVariables: this._buildCSSVariables(merged)
    });
  }

  // Получить текущее значение (с учётом overrides)
  getValue(path, fallback) {
    const theme = this._themes.get(this._activeTheme);
    if (!theme) return fallback;
    
    const parts = path.split('.');
    let value = theme;
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }
    
    // Проверяем кастомные overrides
    if (this._customOverrides.has(path)) {
      return this._customOverrides.get(path);
    }
    
    return value !== undefined ? value : fallback;
  }

  _mergeWithOverrides(theme) {
    // ... мерж базовой темы с пользовательскими overrides
  }

  _buildChartOptions(theme) { /* ... */ }
  _buildToolDefaults(theme) { /* ... */ }
  _buildAlertStyles(theme) { /* ... */ }
  _buildCSSVariables(theme) { /* ... */ }
}