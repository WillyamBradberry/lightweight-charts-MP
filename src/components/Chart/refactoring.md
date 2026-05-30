У меня большой файл ChartComponent.jsx (~2000 строк). Я хочу его отрефакторить по следующему шаблону:

src/components/Chart/
├── index.js                          # ← главный экспорт
├── ChartComponent.jsx                # ← основной "умный" компонент (теперь 300-450 строк)
├── ChartContainer.jsx                # Обёртка + resize observer
├── ChartCore.jsx                     # Ядро: создание и управление Lightweight Chart
├── ChartOverlays.jsx                 # Водяной знак, кроссхейр, лоадер и т.д.
├── ChartWatermark.jsx                # Новый компонент
├── hooks/
│   ├── useChart.js                   # Главный хук
│   ├── useChartInit.js
│   ├── useChartOptions.js
│   ├── useChartEvents.js
│   ├── useChartResize.js
│   └── useWatermark.js               # Новый
├── builders/
│   └── chartOptionsBuilder.js        # Чистая логика сборки options
└── utils/
    └── chartUtils.js

Сделай рефакторинг **поэтапно**:

1. Сначала создай новую структуру папок и файлов-заглушек.
2. Выдели `useChartInit.js` (логика создания chart).
3. Покажи diff изменений.

Действуй аккуратно, не ломай текущую функциональность.
Начинай с шага 1.