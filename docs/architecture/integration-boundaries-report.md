Документ `docs/architecture/integration-boundaries.md` создан.

## Результат анализа

### 13 секций документа:

1. **Layer Architecture** — 3-уровневая архитектура (Host → Boundary → Toolkit)
2. **Allowed Integration Points** — Props Interface, Imperative Handle, ChartController Service
3. **Forbidden Dependencies** — 10 запрещённых зависимостей Host→Toolkit, 5 Toolkit→Host
4. **Public API Surface** — 16 методов LineToolManager, 4 метода PriceScaleTimer
5. **Plugin Boundaries** — Rendering (canvas), DOM (document.body), State Ownership
6. **Future Theme API** — IThemeController, ThemeDefinition, 6 injection points (3可控, 3 currently hardcoded)
7. **Future Alert API** — IAlertService interface, AlertAdapter, TypeScript types for alert shapes
8. **Serialization Boundary** — IStateController, IStorageAdapter, current gaps
9. **File Responsibility Matrix** — who owns what, adapter files
10. **Dependency Rules** — import rules, data flow rules (5 правил)
11. **Risk Matrix** — 7 boundary violations ranked by risk
12. **Migration Roadmap** — 4 phases (8-12 weeks total)
13. **Quick Reference** — what host can do now vs after fixes

### Ключевые находки:

- **13 прямых обращений** к `manager._userPriceAlerts` (приватное свойство) — главная точка уязвимости
- **IAlertService** интерфейс определён с 6 методами: `create`, `remove`, `getAll`, `setSymbol`, `onChange`, `onTrigger`
- **IThemeController** интерфейс определён с 4 методами: `applyChartTheme`, `applyToolDefaults`, `applyAlertTheme`, `getCurrentTheme`
- **3 adapter файла** запланированы: AlertAdapter (критический), ToolAdapter (средний), TimerAdapter (низкий)
- **Alert data types** TypeScript: `AlertData`, `AlertTriggerEvent`, `AlertCondition`, `AlertId`