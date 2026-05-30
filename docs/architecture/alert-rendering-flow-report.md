Документ `docs/architecture/alert-rendering-flow.md` создан.

## Результат анализа

### Полный путь выполнения (Call Chain)

```
Li.addAlertWithCondition(price, condition)  →  line 3659
  ├── Создаёт alert объект { price, id, condition }
  ├── this._alertAdded.fire(alert)           →  line 3665
  └── this._alertsChanged.fire()             →  line 3665
        └── _updateAlertsArray()             →  line 3682

Di._onDataChanged()                          →  line 4017
  └── Di.updateAllViews()                    →  line 4026
        └── Di._calculateRendererData()      →  line 4163
              └── Zt.update(data)            →  line 3626
                    └── Ri.draw()            →  line 3406 (Canvas API)
```

### Ключевые находки

1. **Event subscriptions** — Класс `Li` (line 3630) подписывается на `_alertsChanged` в собственном конструкторе (line 3637). Внешняя подписка на `alertTriggered()` (line ~2320) вызывает `Hi.show()` для notification toast.

2. **Visual representation** — Создаётся через класс `Zt` (PaneView, line 3615), который оборачивает рендереры `Ri` (main pane) и `Ai` (price axis).

3. **Rendering mechanism** — **Canvas drawing через Lightweight Charts Primitive API**. НЕ `createPriceLine()`, НЕ Series Markers, НЕ DOM для линий на чарте. primitive подключается через `series.attachPrimitive()`.

4. **Style sources** — Все стили захардкожены:
   - Константы на line 3249 (`ut=21`, `Ti=17`, `jt=5`, `$=26`, `ee=20`, `It=9`, `te=5.81`)
   - Canvas inline стили в `Ri` (lines 3405-3580)
   - Инжектированные CSS для диалога (line 3701) и нотификаций (line 4267)

5. **Customization points** — Самые лёгкие точки для кастомизации:
   - **Цвет линии алерта:** line 4202 (`color: "#131722"`)
   - **Толщина линии:** line 3438 (`lineWidth: 1`)
   - **Dash pattern:** line 3423 (`setLineDash([4px, 4px])`)
   - **Текст лейбла:** line 4181 (шаблон `` `${symbol} crossing ${price}` ``)
   - **Фон hover-лейбла:** line 3488 (`#FFFFFF`)
   - **Граница hover-лейбла:** line 3513 (`#131722`)