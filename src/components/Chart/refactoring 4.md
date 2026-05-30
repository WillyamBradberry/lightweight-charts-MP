Теперь создай главный объединяющий хук: `hooks/useChart.js`

Он должен импортировать и использовать:
- useChartInit
- useChartOptions
- useChartEvents (пока можно пустой)
- useChartResize
- useWatermark

Сделай его чистым и понятным.

После создания обнови `ChartComponent.jsx`, чтобы он использовал именно `useChart`.

Покажи полный код `useChart.js` и обновлённый `ChartComponent.jsx`