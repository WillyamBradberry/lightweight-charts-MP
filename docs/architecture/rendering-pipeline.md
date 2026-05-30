# Rendering Pipeline — MP Charts Toolkit

## Overview

The rendering pipeline describes the full lifecycle of a chart: from creation through data loading, real-time updates, series management, resize handling, and cleanup. This document focuses on the `ChartComponent.jsx` (2182 LOC) as the core rendering orchestrator.

---

## 1. Chart Creation Lifecycle

### Phase 1: Initialization (mount)

```
Component Mount
  │
  ├─ useEffect([], []) ── Chart Construction
  │     │
  │     ├── createChart(container, options)
  │     │     ├── layout (textColor, background color)
  │     │     ├── grid (vertLines, horzLines)
  │     │     ├── crosshair (mode, style)
  │     │     ├── timeScale (border, timeVisible)
  │     │     ├── rightPriceScale (border)
  │     │     ├── handleScroll (mouseWheel, pressedMouseMove)
  │     │     └── handleScale (mouseWheel, pinch)
  │     │
  │     ├── ResizeObserver.observe(container)
  │     │     └── handleResize → chart.applyOptions({ width, height })
  │     │
  │     ├── chart.timeScale().subscribeVisibleLogicalRangeChange()
  │     │     └── handles candle data updates for PriceScaleTimer
  │     │
  │     └── container.addEventListener('contextmenu') → cancel active tool
  │
  ├─ useEffect([chartType, symbol]) ── Series Creation
  │     │
  │     ├── createSeries(chart, chartType, symbol)
  │     │     └── chart.addSeries(CandlestickSeries | BarSeries | LineSeries | ...)
  │     │
  │     ├── initializeLineTools(series)
  │     │     ├── new LineToolManager()
  │     │     ├── series.attachPrimitive(manager)
  │     │     ├── bridge userAlerts.alertsChanged() → onAlertsSync
  │     │     └── bridge userAlerts.alertTriggered() → onAlertTriggered
  │     │
  │     └── initializePriceScaleTimer(series, intervalSeconds)
  │           └── series.attachPrimitive(timer)
  │
  └─ useEffect([symbol, interval]) ── Data Loading
        │
        ├── getKlines(symbol, interval, 1000)
        ├── mainSeriesRef.current.setData(transformedData)
        ├── updateIndicators(data, indicators)
        ├── applyDefaultCandlePosition()
        ├── subscribeToTicker(symbol, interval, callback)
        └── callback → WebSocket real-time updates
```

### Phase 2: Data Loading Details

```
loadData()
  │
  ├── Capture current zoom level (preservedCandleWindow)
  ├── Close existing WebSocket if any
  │
  ├── REST: getKlines(symbol, interval, 1000)
  │     └── https://api.binance.com/api/v3/klines?symbol={s}&interval={i}&limit=1000
  │
  ├── Transform raw OHLC via transformData(data, chartType)
  │     ├── candlestick/bar → raw OHLC
  │     ├── line/area/baseline → { time, value: close }
  │     └── heikin-ashi → calculateHeikinAshi(data)
  │
  ├── series.setData(transformedData)
  ├── initializePriceScaleTimer (if not exists)
  │
  ├── updateIndicators(data, indicators) [deferred via requestAnimationFrame]
  │
  ├── applyDefaultCandlePosition(length, preservedWindow)
  ├── setLoading(false) [delayed 50ms]
  │
  └── WebSocket: subscribeToTicker(symbol.toLowerCase(), interval)
        └── on message →
              ├── normalize candle to interval time boundary
              ├── update dataRef (replace last or push new)
              ├── transformData + series.setData()
              ├── updateRealtimeIndicators()
              ├── updateAxisLabel()
              └── updateOhlcFromLatest()
```

---

## 2. Series Lifecycle

### Series Types Supported

| Type | Lightweight-Charts Series | Options |
|---|---|---|
| candlestick | `CandlestickSeries` | upColor/downColor, border, wick colors |
| bar | `BarSeries` | upColor/downColor, thinBars |
| hollow-candlestick | `CandlestickSeries` | transparent upColor, border colors |
| line | `LineSeries` | color, lineWidth |
| area | `AreaSeries` | topColor, bottomColor, lineColor |
| baseline | `BaselineSeries` | top/bottom line/fill colors |
| heikin-ashi | `CandlestickSeries` | recalculated OHLC via `calculateHeikinAshi()` |

### Series Creation Trigger

- **Primary series**: created when `useEffect([chartType, symbol])` executes
- **Re-creation**: when `chartType` or `symbol` changes, old series is removed via cleanup function, new series created
- **Indicator series** (SMA/EMA): created/destroyed in `updateIndicators()` based on `indicators` config
- **Comparison series**: created per symbol in `useEffect([comparisonSymbols, interval])`
- **Replay faded series**: created during replay mode for future candle dimming

### Cleanup Pattern

```javascript
// Series cleanup on change
useEffect(() => {
  // create new series
  return () => {
    lineToolManagerRef.current?.clearTools()
    mainSeriesRef.current?.detachPrimitive(lineToolManagerRef.current)
    chartRef.current.removeSeries(mainSeriesRef.current)
  }
}, [chartType, symbol])
```

---

## 3. Render / Update Flow

### Frame Pipeline

```
requestAnimationFrame (continuous)
  │
  └── updateAxisLabel()
        ├── mainSeriesRef.current.data() → last data point
        ├── series.priceToCoordinate(price)
        ├── comparison mode → percentage calculation
        └── setAxisLabel({ top, price, symbol, color })
```

### Update Triggers

| Trigger | Effect | Mechanism |
|---|---|---|
| Resize container | ResizeObserver | `chart.applyOptions({ width, height })` |
| Theme change | `useEffect([theme])` | `chart.applyOptions({ layout, grid, crosshair, ... })` |
| Magnet mode toggle | `useEffect([magnetMode])` | `chart.applyOptions({ crosshair: { mode } })` |
| Time range preset | `useEffect([timeRange])` | `timeScale.setVisibleRange({ from, to })` |
| Crosshair move | `chart.subscribeCrosshairMove` | Updates OHLC header bar |
| Visible range change | `subscribeVisibleLogicalRangeChange` | Updates PriceScaleTimer |
| WS tick | WebSocket callback | `series.setData()`, indicators, axis label, OHLC |
| Indicator toggle | `useEffect([indicators])` | `updateIndicators()` |
| Comparison symbols | `useEffect([comparisonSymbols])` | Add/remove LineSeries |
| Log scale / auto scale | `useEffect([isLogScale, isAutoScale])` | `priceScale('right').applyOptions()` |
| Drawings locked | `useEffect([isDrawingsLocked])` | `manager.lockAllDrawings()` |
| Drawings hidden | `useEffect([isDrawingsHidden])` | `manager.hideAllDrawings()` |
| Timer visible | `useEffect([isTimerVisible])` | `timer.setVisible()` |

---

## 4. Replay Pipeline

### Replay Mode Lifecycle

```
toggleReplay()
  │
  ├── Enter mode:
  │     ├── fullDataRef = [...dataRef.current] (snapshot)
  │     ├── Set replayIndex to last candle
  │     ├── Show all candles initially
  │     └── Notify parent via onReplayModeChange
  │
  ├── During mode:
  │     ├── updateReplayData(index, hideFuture)
  │     │     ├── dataRef = fullDataRef.slice(0, index+1)
  │     │     ├── series.setData(transformedData) [only past candles]
  │     │     ├── updateIndicators(pastData)
  │     │     └── updateAxisLabel()
  │     │
  │     ├── Playback: setInterval → increment index → updateReplayData
  │     ├── Slider drag: throttled update (50ms) → preview mode (hideFuture=false)
  │     └── Chart click: chart.subscribeClick → find nearest candle → updateReplayData
  │
  └── Exit mode:
        ├── Stop interval
        ├── Remove faded series
        ├── dataRef = fullDataRef (restore all data)
        └── series.setData(fullData)
```

### Replay Data States

| State | Data Shown | Faded Area |
|---|---|---|
| Initial enter | All candles (fullDataRef) | None |
| Playback active | Past candles only | Future dimmed via data truncation |
| Slider drag (preview) | All candles | Visual fading overlay via CSS |
| Slider drag end | Past candles only | None |
| Jump-to-bar selection | All candles (for navigation) | Visual fading overlay |
| After click selection | Past candles only | None |
| Exit mode | All candles (fullDataRef) | None |

---

## 5. Real-Time Update Flow (WebSocket)

```
WebSocket: kline_${interval}
  │
  ├── Parse kline event → { time, open, high, low, close }
  ├── Normalize time: Math.floor(event.time / intervalSeconds) * intervalSeconds
  │
  ├── Update dataRef.current:
  │     ├── If last candle time == normalized time → replace
  │     └── Else → push new candle
  │
  ├── Transform via transformData(currentData, chartTypeRef.current)
  ├── series.setData(transformedData) [full replacement, not update()]
  ├── updateRealtimeIndicators(currentData)
  │     ├── SMA: recalculate last value or window
  │     └── EMA: incremental update with smoothing factor
  ├── updateAxisLabel() [RAF-driven, continuous]
  └── updateOhlcFromLatest()
```

### Visibility Optimization

```javascript
// RAF loop pauses when chart is not visible
isChartVisibleRef.current ← IntersectionObserver + document.visibilityState
// Animation frame only schedules when visible
if (isChartVisibleRef.current && document.visibilityState !== 'hidden') {
  animationFrameId = requestAnimationFrame(animate)
}
```

---

## 6. Event Propagation

### User Interaction → Chart

```
User clicks drawing tool in DrawingToolbar
  │
  ├── DrawingToolbar.handleGroupClick()
  ├── App.handleToolChange(toolId)
  │     └── setActiveTool(toolId)
  │
  └── ChartComponent.useEffect([activeTool])
        ├── TOOL_MAP[activeTool] → mapped tool name
        └── lineToolManagerRef.current.startTool(mappedTool)
```

### Chart → Parent

```
ChartComponent internal event → Parent callback
  │
  ├── Line tool finished → wrapped manager.startTool → onToolUsed()
  ├── Alerts sync → userAlerts.alertsChanged().subscribe() → onAlertsSync(chartId, symbol, alerts)
  ├── Alert triggered → userAlerts.alertTriggered().subscribe() → onAlertTriggered(chartId, symbol, evt)
  ├── Replay mode change → onReplayModeChange(chartId, isActive)
  └── Context menu / ESC → onToolUsed() [cancel tool]
```

### Parent → Chart

```
App.jsx → chartRefs.current[chartId].method()
  │
  ├── undo() / redo() → lineToolManagerRef.current.undo()/redo()
  ├── clearTools() → manager.clearTools()
  ├── addPriceAlert() → userAlerts.addAlertWithCondition()
  ├── removePriceAlert() → userAlerts.removeAlert()
  ├── getChartContainer() → chartContainerRef.current
  ├── toggleTimer() → priceScaleTimerRef.current.setVisible()
  └── toggleReplay() → setIsReplayMode()
```

---

## 7. Resize Handling

```
ResizeObserver (mounted in chart creation effect)
  │
  └── handleResize()
        ├── chart.applyOptions({ width: container.clientWidth, height: container.clientHeight })
        └── (no debouncing — direct apply)
```

### Caveats

- No debounce/throttle on resize handler
- No responsive breakpoint handling
- Layout is container-driven, no window.matchMedia
- Chart grid layout is CSS-based, chart component fills available space

---

## 8. Cleanup Sequence (Unmount)

```
ChartComponent unmount
  │
  ├── Clear window globals: lineToolManager, chartInstance, seriesInstance = null
  ├── Unsubscribe logical range change
  ├── Remove context menu listener
  ├── Disconnect ResizeObserver
  ├── Close WebSocket
  ├── Remove chart instance: chart.remove()
  └── Cancel animation frame
        └── RAF loop: isRunning = false, cancelAnimationFrame(id)
```

### Per-effect Cleanups

| Effect | Cleanup |
|---|---|
| Chart creation `[]` | ResizeObserver disconnect, WS close, chart.remove(), globals null |
| Series `[chartType, symbol]` | Detach primitives, clear tools, remove series |
| Data `[symbol, interval]` | AbortController.abort(), WS close, cancel RAF |
| Comparison `[comparisonSymbols]` | Cancel ongoing fetches, remove series |
| Replay playback | clearInterval |
| Crosshair | unsubscribeCrosshairMove |
| Visibility | disconnect IntersectionObserver, remove visibilitychange listener |