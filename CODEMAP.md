# CODEMAP — Навигационная карта MP-charts-toolkit

> Генеральный указатель по кодовой базе. Цель: любой ИИ-агент (или человек) находит
> нужный файл/экспорт за секунды, не перебирая всю кодовую базу.
>
> Стек: **React 19 + Vite 7 + lightweight-charts v5**.
> Ядро инструментов линий — TypeScript-пакеты `@mp/line-tools-*` под `packages/`.
>
> Сопутствующая документация: `docs/architecture/ARCHITECTURE.md`, `project-matrix.md`.

---

## 1. Быстрый доступ по задаче (Task → Файлы)

| Задача | Файл(ы) |
|--------|---------|
| Изменить тулбар рисования | `src/components/Toolbar/DrawingToolbar.jsx` |
| Изменить топбар / интервалы | `src/components/Topbar/Topbar.jsx` |
| Изменить ядро графика (серии, рендеринг) | `src/components/Chart/ChartComponent.jsx` |
| Разложить логику графика на хуки | `src/components/Chart/hooks/useChart*.js` |
| Поменять настройки оформления | `src/components/Chart/builders/chartOptionsBuilder.js` |
| Добавить индикатор (SMA/EMA) | `src/utils/indicators/` + `index.js` |
| Работать с фичами (ядро линий) | `src/config/flags.js` (`USE_CORE_LINE_TOOLS`) |
| Адаптер ядра инструментов | `src/plugins/line-tools-core-adapter/` |
| Регистрация линейных инструментов | `src/plugins/line-tools-core-adapter/toolRegistry.js` |
| Данные Binance (REST/WS) | `src/services/binance.js` |
| Ценовые алерты (legacy монолит) | `src/plugins/line-tools-adapter/AlertAdapter.js` |
| Конфигурация пользователя | `src/plugins/config-plugin/ConfigManager.js` |
| Темы | `src/plugins/theme-plugin/ThemeEngine.js` |
| Провайдеры данных | `src/plugins/connection-plugin/DataProviderManager.js` |
| Точка входа приложения | `src/main.jsx` → `src/App.jsx` |

## 2. Карта `src/` (UI, плагины, сервисы)

| Модуль | Путь | Экспорты | Entry |
|--------|------|----------|-------|
| App Shell | `src/App.jsx`, `src/main.jsx` | `App`, глоб. состояние | `src/main.jsx` |
| Layout | `src/components/Layout/Layout.jsx` | Layout | — |
| Toolbar | `src/components/Toolbar/` | DrawingToolbar, RightToolbar, ToolGroup, ToolIcons | — |
| Topbar | `src/components/Topbar/Topbar.jsx` | Topbar | — |
| BottomBar | `src/components/BottomBar/BottomBar.jsx` | BottomBar | — |
| Chart | `src/components/Chart/` | ChartComponent, ChartGrid, ChartCore, ChartContainer, ChartOverlays, ChartWatermark | `index.js` |
| Chart Hooks | `src/components/Chart/hooks/` | useChart, useChartInit/Options/Resize/Events, useWatermark | `useChart.js` |
| Builders | `src/components/Chart/builders/` | buildChartOptions | — |
| Alerts/Alert | `src/components/Alerts\|Alert/` | AlertsPanel, AlertDialog | — |
| Replay | `src/components/Replay/` | ReplayControls, ReplaySlider | — |
| SymbolSearch | `src/components/SymbolSearch/` | SymbolSearch | — |
| Toast | `src/components/Toast/` | Toast, SnapshotToast | — |
| Watchlist | `src/components/Watchlist/` | Watchlist | — |
| Editor | `src/components/Editor/VisualEditor.jsx` | VisualEditor | — |
| ErrorBoundary | `src/components/ErrorBoundary/` | ErrorBoundary | — |
| Plugins Core | `src/plugins/core/PluginRegistry.js` | PluginRegistry | — |
| Adapters | `src/plugins/adapter/DrawingSerializer.js`, `line-tools-adapter/AlertAdapter.js`, `line-tools-core-adapter/` | LineToolsCoreAdapter, DrawingSerializer, registerPriorityTools | `line-tools-core-adapter/index.js` |
| Конфиг | `src/plugins/config-plugin/` | ConfigManager, editorSchema | — |
| Connection | `src/plugins/connection-plugin/` | DataProviderManager | — |
| Theme | `src/plugins/theme-plugin/` | ThemeEngine | — |
| UI Plugin | `src/plugins/ui-plugin/types.js` | UIExtensionPoints, UIPluginManager | — |
| LT монолит | `src/plugins/line-tools/` (read-only) | `line-tools.js/.d.ts` | `package.json` |
| Services | `src/services/binance.js` | getTickerPrice, subscribeToMultiTicker | — |
| Utils | `src/utils/` | chartUtils, coordinateHelpers, TemplateManager, timeframes, indicators | — |
| Config Flags | `src/config/flags.js` | FEATURE_FLAGS, useCoreLineTools | — |

## 3. Карта пакетов `packages/` (ядро инструментов)

| Домен | Путь | Entry | Экспорты | Зависит |
|-------|------|-------|----------|---------|
| LT Core | `packages/line-tools-core/` | `src/index.ts` | `createLineToolsPlugin`, `ILineToolsPlugin`, BaseLineTool, LineToolsCorePlugin, InteractionManager, ToolRegistry, рендереры; ре-экспорт types/utils/api | lightweight-charts |
| LT Core→API | `packages/line-tools-core/src/api/` | — | `ILineToolsApi`, `LineToolPoint`, `LineToolExport` | — |
| LT Core→Types | `packages/line-tools-core/src/types/` | `index.ts` | geometry-, options-, tool-, hit-test-, view-, core-types | line-tools-core |
| LT Core→Interaction | `.../interaction/` | — | events, interaction-manager, magnet, creation, editing, coordinate | — |
| LT Core→Model | `.../model/` | — | BaseLineTool, ToolRegistry, DataSource | — |
| LT Core→Rendering | `.../rendering/` | — | renderers (segment/polygon/rectangle/circle/anchor/text/composite) | — |
| LT Core→Utils | `.../utils/` (+geometry) | — | geometry, canvas-helpers, text-helpers, culling-helpers | — |
| LT Core→Views | `.../views/` | — | LineToolPaneView, карта осей | — |
| LT Lines | `packages/line-tools-lines/` | `src/index.ts` | `registerLinesPlugin`, 8 классов (TrendLine, Ray, ExtendedLine, HorizontalLine, HorizontalRay, VerticalLine, CrossLine, Arrow) | line-tools-core |
| LT Rect | `packages/line-tools-rectangle/` | `src/index.ts` | `registerRectangleTool`, LineToolRectangle, LineToolRectanglePaneView | line-tools-core |

## 4. Плагинная система (кросс-модульные коммуникации)

- `PluginRegistry` (`src/plugins/core`) — `register(id, ctx)`, `onHook`, `emitHook`, `expose`, `use`.
- Плагины общаются через хуки (`feature:*`, `theme:*`, `data:*`, `ui:*`) и опубликованное API.
- Адаптер `line-tools-core-adapter` — мост между React shell и TypeScript-ядром `@mp/*`:
  `adapter.init(registerPriorityTools)` → `toolRegistry` регистрирует инструменты из
  `@mp/line-tools-lines` и `@mp/line-tools-rectangle`.

## 5. Состояние активных флагов (важно для навигации по инструментам)

| Флаг | Файл | Значение |
|------|------|----------|
| `USE_CORE_LINE_TOOLS` | `src/config/flags.js` | `true` — активно ядро `@mp/line-tools-core` |

## 6. Ссылки на документацию

| Документ | Назначение |
|----------|------------|
| `docs/architecture/ARCHITECTURE.md` | Сводная карта модулей/слоёв/путей |
| `docs/architecture/subsystem-map.md` | Карта подсистем (Chart Core, рендеринг) |
| `docs/architecture/plugin-architecture.md` | Архитектура плагинной системы (legacy) |
| `docs/architecture/current-state.md` | Текущее состояние системы |
| `project-matrix.md` | Границы скоупа и жёсткие правила для ИИ-агентов |

### 6.1 Детальные карты модулей (`docs/architecture/maps/`)

| Карта | Модуль | Файлов |
|-------|--------|--------|
| `maps/line-tools-core.md` | `packages/line-tools-core/` — ядро инструментов | ~57 |
| `maps/line-tools-lines.md` | `packages/line-tools-lines/` — 8 лин. инструментов | 17 |
| `maps/chart-engine.md` | `src/components/Chart/` — движок графика + хуки | 18 |
| `maps/src-utils.md` | `src/utils/` — хелперы/индикаторы | 7 |
| `maps/toolbar.md` | `src/components/Toolbar/` — тулбары | 6 |

> Модули `packages/line-tools-rectangle` (3) и `src/plugins/line-tools-core-adapter` (3)
> содержат ≤5 файлов — детальные карты не требуются.

---
> **@generator meta**: файл создан автоматически по скану репозитория. Не редактировать вручную
> независимо; обновляется при рефакторинге кода. Сообщайте о расхождениях через
> `docs/architecture/ARCHITECTURE.md` (раздел 5).