Создай компоненты для оверлеев:

1. `ChartOverlays.jsx`
2. `ChartWatermark.jsx`

Watermark должен поддерживать пропсы:
- `showWatermark`
- `watermarkText`
- `watermarkColor` (опционально)

Затем обнови `ChartComponent.jsx`, чтобы он передавал эти пропсы в `ChartOverlays`.

Покажи код обоих файлов + diff ChartComponent.jsx