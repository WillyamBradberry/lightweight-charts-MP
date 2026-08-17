# System Patterns — MP-charts-toolkit (и megaproject)

## Текущий фокус
- Lightweight Charts integration
- Line tools (core + lines)
- Pattern Intelligence / Mini Charts
- Spec-First workflow + Project Matrix

## Архитектурные границы (заполнять по мере анализа)

### High-level
```
libs/MP-charts-toolkit/
├── src/
│   ├── components/     # UI (Chart, Toolbar, ...)
│   ├── plugins/        # line-tools, theme, ui, adapter, core
│   └── utils/
└── packages/           # если monorepo-style
```

### Ключевые паттерны (заполнять)
- Plugin system (как регистрируются line tools)
- Event / callback flow (onToolUsed, subscribeLineToolsAfterEdit и т.д.)
- Adapter pattern (LineToolsCoreAdapter и т.п.)
- Non-sticky drawing behaviour

## Конвенции
- 1 визуальный компонент ≈ 1 файл (или небольшая папка)
- Публичные API плагинов должны быть стабильными
- Моки соседних модулей при атомарных тасках

## TODO для матрицы
- [ ] Просканировать все exports из plugins/
- [ ] Построить Impact Graph между ChartComponent ↔ plugins
- [ ] Semantic hashes для основных действий (render, registerTool, clearTools...)
