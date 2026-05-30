Документ `docs/theme/icon-style-map.md` создан.

## Результат анализа

### Обнаружено

- **40 SVG-иконок** в 3 системах: 37 кастомных inline SVG (`ToolIcons.jsx`), 2 lucide-react (`RightToolbar.jsx`), 1 inline chevron
- **Все 40 иконок** используют `currentColor` — полностью наследуют CSS `color` от родителя
- **4 состояния тулбара**: Default (`#B2B5BE`), Hover (`#F0F3FA`), Active (`#2962FF`), Disabled (не реализовано)
- **12 CSS custom properties** (`--tv-*` переменные) управляют всеми состояниями

### Ключевые находки

1. **Иконки на 95% темабельны** — все используют `currentColor`, что позволяет менять цвет через CSS
2. **Тулбар на 90% темабельны** — фон, hover, active, border все через CSS vars
3. **Светлая тема НЕ реализована** — `[data-theme="light"]` содержит те же значения, что и dark
4. **2 hardcoded значения** не темабельны:
   - `rgba(41, 98, 255, 0.06)` — активный фон в popover
   - `rgba(0, 0, 0, 0.5)` — box-shadow popover
5. **Disabled state** не реализован ни для одной иконки
6. **Canvas-иконки** (alert bell, selection anchors) в `line-tools.js` — hardcoded, НЕ темабельны через CSS