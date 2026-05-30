Фаза 0 (1-2 дня) — Безопасные экстракции:
  ├── src/utils/helpers.js        ← чистые функции из App.jsx
  ├── src/constants/toolMap.js    ← TOOL_MAP из ChartComponent
  ├── src/utils/chartOptions.js   ← фабрика опций темы
  └── src/utils/dropdownPosition.js

Фаза 1 (3-5 дней) — Хуки App.jsx:
  ├── src/hooks/useToast.js
  ├── src/hooks/useMultiChart.js
  ├── src/hooks/useIntervals.js
  ├── src/hooks/useDrawingTools.js
  └── src/hooks/useAlerts.js       ← самый высокий риск!

Фаза 2 (5-8 дней) — Хуки ChartComponent:
  ├── src/hooks/useChartTheme.js
  ├── src/hooks/useIndicators.js
  ├── src/hooks/useChartData.js
  ├── src/hooks/useLineTools.js
  └── src/hooks/useReplayMode.js   ← самый сложный

Фаза 3 (5-10 дней) — Подсистемы:
  ├── src/indicators/              ← Indicator Engine с registry
  ├── src/data/                    ← Data Provider Abstraction
  └── src/facade/ChartFacade.js    ← публичный API

Фаза 4 (2-3 дня) — Topbar:
  ├── TimeframeSelector
  ├── SnapshotMenu
  ├── LayoutSelector
  └── ChartTypeSelector