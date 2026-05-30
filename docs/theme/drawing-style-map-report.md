Документ `docs/theme/drawing-style-map.md` создан. Содержит полную карту стилей для всех drawing-tool рендереров.

## Результат анализа

### Архитектура рендеринга (общая для всех инструментов)

```
Tool Class → PaneView → Renderer → draw() → Canvas API
```

Все инструменты используют **Lightweight Charts Primitive API** (`series.attachPrimitive()`). Визуализация — чистый canvas, без DOM.

### Запрошенные 5 инструментов

| Tool | Class | Renderer | Defaults | Color | Width |
|------|-------|----------|----------|-------|-------|
| **TrendLine** | `W` (293) | `ce` (223) | `_e` (283) | `rgb(0,0,0)` | 2 |
| **HorizontalLine** | `Y` (436) | `fe` (398) | `me` (430) | `#2962FF` | 2 |
| **Ray** | `j` (528) | `xe` (487) | `ye` (523) | `#2962FF` | 2 |
| **Rectangle** | `J` (727) | `be` (676) | `Se` (720) | `rgb(41,98,255)` | 2 |
| **FibRetracement** | `bt` (1118) | `Ee` (1047) | `He` (1105) | per-level colors | 1 |
| **FibExtension** | `pt` (2593) | `fi` (2513) | `mi` (2582) | per-level colors | 1 |

### Ключевые точки кастомизации

1. **Цвет линии** — `tool.applyOptions({ lineColor: "..." })` для TrendLine/HLine/Ray/Rectangle
2. **Толщина линии** — `tool.applyOptions({ width: N })`
3. **Dash pattern** — `tool.applyOptions({ lineStyle: 0-4 })` (0=solid, 1=dotted, 2=dashed, 3=large dashed, 4=sparse dotted)
4. **Fib уровни** — `tool.applyOptions({ levels: [{coeff, color}, ...] })`
5. **Прямоугольник fill** — `tool.applyOptions({ backgroundColor: "rgba(...)" })`
6. **Дефолты** — меняются через константы `_e`, `me`, `ye`, `Ce`, `Se`, `Re`, `Le`, `He`, `ze`, `mi`, `ui`, `Qe`

### Дополнительно задокументировано

- 12 инструментов (включая ParallelChannel, Triangle, VerticalLine, Text, PriceRange, DateRange)
- Общая инфраструктура стилей: `O()`/`pe()` dash patterns, `v()`/`de()` selection anchors
- Template system (`ot` class, line 2647)
- Cross-tool comparison table
- Alert line rendering supplement