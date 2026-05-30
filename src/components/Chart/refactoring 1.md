Ты — senior React архитектор.

У меня есть большой файл `src/components/Chart/ChartComponent.jsx` (~2000 строк). Я хочу провести полный рефакторинг по современным практикам.

**Целевая структура:**

src/components/Chart/
├── index.js
├── ChartComponent.jsx
├── ChartContainer.jsx
├── ChartCore.jsx
├── ChartOverlays.jsx
├── ChartWatermark.jsx
├── hooks/
│   ├── useChart.js
│   ├── useChartInit.js
│   ├── useChartOptions.js
│   ├── useChartEvents.js
│   ├── useChartResize.js
│   └── useWatermark.js
├── builders/
│   └── chartOptionsBuilder.js
└── utils/
    └── chartUtils.js

Задача:
1. Создай все необходимые папки и пустые файлы (заглушки) с правильными импортами/экспортами.
2. Покажи дерево папки `src/components/Chart/` после создания.
3. Не меняй пока логику основного файла.

Начинай с шага 1. Покажи результат.