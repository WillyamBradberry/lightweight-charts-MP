# MP-charts-toolkit Theme Surface Map

> Полная карта всех визуальных поверхностей, цветов и значений темы из `libs/MP-charts-toolkit/src/`.  
> Сгенерировано автоматически на основе анализа CSS-файлов компонентов.

---

## 1. TradingView CSS Custom Properties (SSOT)

Все переменные теминга через CSS custom properties с префиксом `--tv-color-*`. Это единый источник истины для кастомизации темы.

### Палитра переменных

| CSS Variable | Роль | Тип значения |
|---|---|---|
| `--tv-color-platform-background` | Фон основной платформы | цвет (RGB/HSL) |
| `--tv-color-pane-background` | Фон панелей/контейнеров | цвет |
| `--tv-color-toolbar-background` | Фон тулбара (topbar) | цвет |
| `--tv-color-text-primary` | Основной текст | цвет (default: `#D1D4DC`) |
| `--tv-color-text-secondary` | Вторичный текст | цвет (default: `#787B86`) |
| `--tv-color-brand` | Бренд-цвет / акцент | цвет (default: `#2962FF`) |
| `--tv-color-border` | Границы и разделители | цвет |
| `--tv-color-hover-background` | Фон при hover | цвет |
| `--tv-color-dropdown-background` | Фон dropdown-элементов | цвет |
| `--tv-color-input-background` | Фон input-полей | цвет |
| `--tv-color-toolbar-button-text` | Текст кнопки тулбара | цвет |
| `--tv-color-toolbar-button-text-hover` | Текст кнопки при hover | цвет |
| `--tv-color-toolbar-button-text-active` | Активный текст кнопки | цвет |
| `--tv-color-toolbar-button-background-hover` | Фон кнопки при hover | цвет |

---

## 2. Жёстко заданные цвета (Hardcoded Palette)

### Основные брендовые цвета

| Цвет | HEX | Использование | Компонент |
|---|---|---|---|
| 🔵 Синий | `#2962FF` | Бренд-акцент, активные элементы, логотип | Global |
| 🔴 Красный | `#F23645` | Продажа, ошибки, бейджи, нисходящие значения | RightToolbar, ChartGrid, Toast, Alerts |
| 🟢 Зелёный | `#089981` | Покупка, успех, восходящие значения | ChartGrid, Toast, Alerts |
| 🟠 Оранжевый | `#f57f17` | Имя символа, текущая цена (legend) | ChartComponent |

### Цвета line-tools floating toolbar

| Цвет | HEX | Использование | Компонент |
|---|---|---|---|
| ⚪ Белый | `#fff` / `#ffffff` | Фон floating toolbar | line-tools |
| ⬛ Тёмный текст | `#131722` | Основной текст инструментов | line-tools |
| 🔘 Серый текст | `#b2b5be` | Иконки drag-handle, неактивные элементы | line-tools |
| 🟡 Акцент линии | `#43ff52` | Превью толщины линии (editor) | line-tools |
| 🟲 Разделитель | `#e0e3eb` | Линии-разделители в toolbar/dropdown | line-tools, Topbar |
| 🟤 Звёздный | `#f57c00` / `#f57f00` | Избранные элементы (звёзды) | Topbar |

### Дополнительные цвета

| Цвет | HEX | Использование | Компонент |
|---|---|---|---|
| 🟡 Жёлтый | `#F7931A` | Статус "paused" в Alerts | AlertsPanel |
| ⚪ Серый звезда | `#50535e` | Неактивная иконка звезды | Topbar |

---

## 3. Компонентная карта поверхностей

### 3.1 Layout (`Layout.module.css`)

| Элемент | Свойства | Значения |
|---|---|---|
| `.chartingContainer` | `display`, `position` | `flex`, `relative` |
| `.mainArea` | `display`, `gap` | `flex`, `1px` |
| `.leftToolbar` | `width`, `background` | `52px`, `var(--tv-color-pane-background)` |
| `.contentArea` | `display`, `position`, `overflow` | `flex`, `relative`, `hidden` |
| `.alertsPanelWrapper` | `width`, `transition` | `300px`, `width 0.2s ease` |

### 3.2 Toolbar — Левый (`LeftToolbar.module.css`)

| Элемент | Свойства | Значения |
|---|---|---|
| `.toolbar` | `width`, `height`, `background` | `52px`, `100%`, `var(--tv-color-pane-background)` |
| `.tool` | `width`, `height`, `color` | `100%`, `48px`, `var(--tv-color-text-secondary)` |
| `.tool:hover` | `color`, `background` | `var(--tv-color-text-primary)`, `var(--tv-color-hover-background)` |
| `.active` | `color`, `background` | `var(--tv-color-brand)`, `var(--tv-color-background)` |

### 3.3 Toolbar — Правый (`RightToolbar.module.css`)

| Элемент | Свойства | Значения |
|---|---|---|
| `.toolbar` | `width`, `border-left` | `52px`, `1px solid var(--tv-color-border)` |
| `.badge` | `background`, `color`, `font-size` | `#F23645`, `white`, `10px` |
| `.tool:hover` | `color`, `background` | `var(--tv-color-text-primary)`, `var(--tv-color-hover-background)` |

### 3.4 Chart — Компонент (`ChartComponent.module.css`)

| Элемент | Свойства | Значения |
|---|---|---|
| `.chartWrapper` | `position`, `width`, `height` | `relative`, `100%`, `100%` |
| `.loadingOverlay` | `background-color`, `color` | `var(--tv-color-platform-background)`, `var(--tv-color-text-primary)` |
| `.spinner` | `border`, `border-left-color` | `4px solid rgba(255,255,255,0.1)`, `var(--tv-color-brand)` |
| `.axisLabel` | `background-color`, `color`, `font-size` | `#F23645`, `white`, `11px` |
| `.symbolLegendName` | `background-color`, `border-radius` | `#f57f17`, `2px 0 0 2px` |
| `.symbolLegendPrice` | `background-color`, `border-radius` | `#f57f17`, `0 2px 2px 0` |
| `.ohlcDot` | `background-color` | `#089981` (up) / `#F23645` (down) |
| `.ohlcValue.up` | `color` | `#089981` |
| `.ohlcValue.down` | `color` | `#F23645` |

### 3.5 Chart — Сетка (`ChartGrid.module.css`)

| Элемент | Свойства | Значения |
|---|---|---|
| `.gridContainer` | `gap`, `background-color` | `1px`, `var(--tv-color-border)` |
| `.chartWrapper` | `background-color`, `overflow` | `var(--tv-color-platform-background)`, `hidden` |
| `.chartWrapper.active` | `border`, `z-index` | `1px solid var(--tv-color-brand)`, `10` |

### 3.6 Topbar (`Topbar.module.css`)

| Элемент | Свойства | Значения |
|---|---|---|
| `.layoutAreaTop` | `height`, `background` | `38px`, `var(--tv-color-toolbar-background)` |
| `.button` | `height`, `padding`, `border-radius`, `font-size` | `28px`, `0 8px`, `4px`, `14px` |
| `.symbolButton` | `font-weight`, `color` | `600`, `var(--tv-color-text-primary)` |
| `.button.isActive` | `background-color` | `rgba(41, 98, 255, 0.06)` |
| `.dropdown` | `border-radius`, `min-width`, `box-shadow` | `4px`, `160px`, `0 4px 12px rgba(0,0,0,0.5)` |
| `.separator` | `width`, `height`, `background` | `1px`, `16px`, `var(--tv-color-border)` |
| `.numInput` | `width`, `border-radius`, `padding` | `50px`, `4px`, `4px` |
| `.addBtn` | `background`, `border-radius`, `padding` | `var(--tv-color-brand)`, `4px`, `4px 10px` |
| `.starIcon.filled` | `color` | `#f57c00` |
| `.trashIcon:hover` | `color` | `#f44336` |

### 3.7 Toast (`Toast.module.css`)

| Элемент | Свойства | Значения |
|---|---|---|
| `.toast` | `top`, `right`, `min-width`, `padding`, `border-radius` | `70px`, `20px`, `300px`, `12px 16px`, `6px` |
| `.toast.error` | `border-left` | `4px solid #F23645` |
| `.toast.success` | `border-left` | `4px solid #089981` |
| `.toast.info` | `border-left` | `4px solid #2962FF` |
| `.snapshotToast` | `border`, `border-radius`, `padding` | `1px solid #089981`, `50px`, `12px 24px` |

### 3.8 Alerts Panel (`AlertsPanel.module.css`)

| Элемент | Свойства | Значения |
|---|---|---|
| `.panel` | `background`, `color` | `var(--tv-color-pane-background)`, `var(--tv-color-text-primary)` |
| `.header` | `height`, `padding`, `border-bottom` | `48px`, `0 16px`, `1px solid var(--tv-color-border)` |
| `.tab` | `height`, `font-size` | `40px`, `14px` |
| `.activeTab` | `color`, `border-bottom-color` | `var(--tv-color-brand)`, `var(--tv-color-brand)` |
| `.status.active` | `color`, `background` | `#089981`, `rgba(245,5,125, ...)` (editor typo) |
| `.status.triggered` | `color`, `background` | `#F23645`, `rgba(242,54,69,0.12)` |
| `.status.paused` | `color`, `background` | `#F7931A`, `rgba(247,147,26,0.12)` |

### 3.9 Line Tools Floating Toolbar (`line-tools.css`)

| Элемент | Свойства | Значения |
|---|---|---|
| `.tv-floating-toolbar` | `background`, `border-radius`, `box-shadow`, `height` | `#fff`, `8px`, `0 2px 6px #0000001a, 0 8px 24px #0000001f`, `50px` |
| `.tv-floating-toolbar .tool-btn` | `width`, `height`, `border-radius`, `color` | `36px`, `36px`, `6px`, `#131722` |
| `.tv-floating-toolbar .tool-btn:hover` | `background` | `rgba(0,0,0,0.03)` (`#0000000d`) |
| `.divider` | `width`, `height`, `background` | `1px`, `24px`, `#e0e3eb` |
| `.fill-btn-color-bg` | `width`, `height`, `border-radius` | `16px`, `3px`, `1px` |
| `.tv-color-picker__swatch` | `width`, `height`, `border-radius` | `22px`, `22px`, `4px` |
| `.tv-width-picker__line` | `background` | `#43ff52` (editor) |
| `.eraser-cursor` | `cursor` | base64 SVG eraser icon |

---

## 4. Размеры и отступы (Spacing System)

### Фиксированные ширины

| Элемент | Значение |
|---|---|
| Left Toolbar | `52px` |
| Right Toolbar | `52px` |
| Alerts Panel | `300px` |
| Floating Toolbar height | `50px` |
| Topbar height | `38px` |

### Фиксированные высоты элементов

| Элемент | Значение |
|---|---|
| `.tool` (toolbar icon) | `48px` |
| `.button` (topbar) | `28px` |
| `.tab` (alerts) | `40px` |
| `.header` (alerts) | `48px` |

### Размеры кнопок и иконок

| Элемент | Размер |
|---|---|
| `.tool-btn` (line-tools) | `36 × 36px` |
| `.iconButton` (topbar) | `28px` width |
| `.menuButton` (topbar) | `18px` width |
| `.starIcon` | `14px` height |

### Padding / Margin

| Контекст | Значение |
|---|---|
| Topbar inner padding | `0 4px` |
| Toolbar tool padding | `0 (auto)` |
| Dropdown item padding | `6px 16px` |
| Toast padding | `12px 16px` |
| Alerts item padding | `12px 16px` |
| Section header padding | `6px 16px` |

### Border Radius

| Элемент | Значение |
|---|---|
| `.button`, `.dropdown`, `.numInput` | `4px` |
| `.toast`, `.chartWrapper.active` | `6px` |
| `.snapshotToast` | `50px` (pill) |
| `.tool-btn` (line-tools) | `6px` |
| `.tv-color-picker__swatch` | `4px` |

### Box Shadows

| Элемент | Значение |
|---|---|
| `.dropdown`, `.indicatorDropdown` | `0 4px 12px rgba(0,0,0,0.5)` |
| `.toast` | `0 4px 12px rgba(0,0,0,0.5)` |
| `.tv-floating-toolbar` | `0 2px 6px #0000001a, 0 8px 24px #0000001f` |
| `.snapshotToast` | `0 4px 12px rgba(0,0,0,0.3)` |

---

## 5. Типографика

### Шрифты (все компоненты)

```css
font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
```

### Размеры шрифта по компонентам

| Компонент | Элемент | Размер | Weight |
|---|---|---|---|
| Topbar | `.button` | `14px` | `500` |
| Topbar | `.symbolButton` | inherit | `600` |
| Topbar | `.dropdownItem` | `13px` | inherit |
| Topbar | `.groupTitle` | `11px` | `600` |
| Chart | `.axisLabel` | `11px` | `600` |
| Chart | `.ohcHeader` | `12px` | inherit |
| Toast | `.message` | `14px` | inherit |
| Alerts | `.title` | `16px` | `500` |
| Alerts | `.symbol` | `14px` | `600` |
| Alerts | `.condition` | `13px` | inherit |
| Line Tools | `.font-size-trigger` | `14px` | `500` |
| Line Tools | `.tv-font-size-picker__item` | `13px` | inherit |

---

## 6. Z-Index Scale

| Значение | Использование | Компонент |
|---|---|---|
| `5` | Drawing overlay | ChartComponent |
| `10` | Loading overlay, Active chart wrapper | ChartComponent, ChartGrid |
| `20` | Axis labels, Symbol legend | ChartComponent |
| `25` | OHLC header bar | ChartComponent |
| `100` | Topbar layout area | Topbar |
| `1000` | Toast notifications, Floating toolbar | Toast, line-tools |
| `2000` | Dropdowns, Snapshot toast | Topbar, Toast |

---

## 7. Анимации и переходы

### Transition durations

| Duration | Использование |
|---|---|
| `0.1s ease` | Hover states (toolbar tools, buttons) |
| `0.2s ease` | Layout transitions, dropdown visibility |
| `0.3s ease-out` | Toast slide-in, snapshot fade-in |

### Keyframe анимации

| Имя | Длительность | Эффект | Компонент |
|---|---|---|---|
| `spin` | `1s linear infinite` | Вращение спиннера | ChartComponent |
| `slideIn` | `0.3s ease-out` | Slide from right (translateX) | Toast |
| `fadeIn` | `0.3s ease-out` | Fade + slide up | Toast (snapshot) |

---

## 8. Границы и разделители

### Border widths

| Значение | Использование |
|---|---|
| `1px` | Стандартные границы (grid, panels, separators) |
| `4px` | Акцентные бордеры (toast status indicators, alerts panel) |

### Grid gap

| Компонент | Gap |
|---|---|
| `.gridContainer` | `1px` |

---

## 9. Интерактивные состояния

### Hover States

| Элемент | Normal → Hover |
|---|---|
| `.tool` (toolbar) | text-secondary → text-primary, bg-hover |
| `.button` (topbar) | bg-transparent → bg-hover |
| `.dropdownItem` | transparent → bg-hover |
| `.tv-floating-toolbar .tool-btn` | transparent → `#0000000d` |
| `.closeBtn` (toast) | text-secondary → text-primary, bg-hover |

### Active States

| Элемент | Свойство | Значение |
|---|---|---|
| `.active` (toolbar tool) | `color` | `var(--tv-color-brand)` |
| `.isActive` (topbar button) | `background` | `rgba(41, 98, 255, 0.06)` |
| `.activeTab` (alerts) | `border-bottom-color` | `var(--tv-color-brand)` |

### Disabled States

| Элемент | Свойство | Значение |
|---|---|---|
| `.button:disabled` | `opacity`, `cursor` | `0.5`, `default` |

---

## 10. Итоговая палитра (Summary Palette)

### Полный список HEX-цветов

```
#2962FF   — Brand accent (CSS var: --tv-color-brand)
#F23645   — Sell / Error / Bearish / Badge
#089981   — Buy / Success / Bullish
#f57f17   — Symbol legend background
#f57c00   — Star/favorite icon
#131722   — Line tools primary text
#b2b5be   — Line tools secondary icons
#e0e3eb   — Light separators/dividers
#43ff52   — Line width preview (editor)
#f44336   — Trash icon hover danger
#50535e   — Unfilled star icon
#F7931A   — Paused alert status
```

### Полный список CSS переменных

```css
--tv-color-platform-background
--tv-color-pane-background
--tv-color-toolbar-background
--tv-color-text-primary        (default: #D1D4DC)
--tv-color-text-secondary      (default: #787B86)
--tv-color-brand               (default: #2962FF)
--tv-color-border
--tv-color-hover-background
--tv-color-dropdown-background
--tv-color-input-background
--tv-color-toolbar-button-text
--tv-color-toolbar-button-text-hover
--tv-color-toolbar-button-text-active
--tv-color-toolbar-button-background-hover
```

---