Сгенерирован пересмотренный план декомпозиции: `libs/MP-charts-toolkit/docs/refactor/plugin-decomposition-plan-report.md`

## Ключевые результаты анализа:

### Учёт существующих компонентов проекта:
- **AlertsPanel.jsx** (`src/components/Alerts/`) — уже существует, НЕ дублировать
- **DrawingToolbar.jsx** (`src/components/Toolbar/`) — уже существует
- **Toast.jsx** (`src/components/Toast/`) — уже существует
- **AlertAdapter.js** (`src/plugins/line-tools-adapter/`) — уже существует как мост

### 7 новых plugin-пакетов (flat architecture):
1. `line-tools-geometry/` — геометрия (coordinate mapping, distance calc, intersection)
2. `line-tools-renderers/` — рендереры (если нужны MP-specific расширения)
3. `line-tools-templates/` — шаблоны инструментов (localStorage)
4. `line-tools-alerts-core/` — ядро алертов (Li, Di, dt классы)
5. `line-tools-callouts-core/` — бейджи вызовов
6. `line-tools-nav-core/` — навигационные контролы
7. `line-tools/` — ядро интеграции (обёртка над upstream API)

### Upstream vs MP-UNIQUE:
| В upstream | MP-UNIQUE |
|-----------|-----------|
| createLineToolsPlugin() | Alert system (Li, Di, Hi) |
| EventEmitter / InteractionManager | Navigation toolbar (Oi) |
| Coordinate mapping (`T`) | Callout badges (Bi, Fi, zi) |
| Рендереры (si, li, ci, pi) | Long/Short position tool (Jt/Kt) |
| Geometry utilities | Price Range visualizer (Lt) |
| Tool registry | Template system (ot) |

### Рекомендации по удалению:
- Duplicate coordinate mapping (`T`) — использовать upstream
- Inline CSS constants → экспортировать в `src/styles/line-tools.css`
- Event emitter code (`H`) — использовать upstream EventEmitter
- `mt` style helper — inline где нужно

### 4 фазы миграции (P0→P5):
1. **P0**: types, validators, styles
2. **P1–P2**: geometry, templates, callout/navigation UI
3. **P3–P4**: alerts-core, renderers
4. **P5**: tool adapters

### Миграция CSS:
- НЕ инжектировать через JS
- Экспортировать в `src/styles/*.css` файлы