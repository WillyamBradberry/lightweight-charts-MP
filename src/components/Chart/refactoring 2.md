Продолжаем рефакторинг.

Теперь выдели логику создания и уничтожения Lightweight Chart в отдельный хук.

Создай файл: `hooks/useChartInit.js`

Этот хук должен:
- Принимать ref на контейнер
- Создавать chart с помощью `createChart()`
- Возвращать `chartInstance` и `isReady`
- Правильно очищать chart при unmount

После создания:
- Обнови `ChartComponent.jsx` — подключи этот хук
- Покажи diff изменений для `ChartComponent.jsx` и полный код `useChartInit.js`