| Неделя | Что делать                                                                                  | Результат                       |
| ------ | ------------------------------------------------------------------------------------------- | ------------------------------- |
| **1**  | Создать `PluginRegistry` + `UIPluginManager` + `ThemeEngine`                                | Ядро плагиновой системы         |
| **2**  | Создать `DataProviderManager` + абстракцию `binance.js`                                     | Модуль подключения данных       |
| **3**  | Экстракция Phase 0 + Phase 1 хуков (useToast, useMultiChart, useIntervals, useDrawingTools) | App.jsx ~400 строк              |
| **4**  | Экстракция Phase 2 (useChartTheme, useIndicators, useChartData, useLineTools)               | ChartComponent ~800 строк       |
| **5**  | Создать `ChartFacade` + публичный API (Embed/Headless)                                      | Интеграция с внешними проектами |
| **6**  | Создать `DrawingSerializer` + `StateController`                                             | Сериализация рисунков           |
| **7**  | Создать `VisualEditor` компонент + `ConfigManager`                                          | Визуальный редактор             |
| **8**  | Интеграция редактора с плагиновой системой + live preview                                   | Работающий редактор             |
