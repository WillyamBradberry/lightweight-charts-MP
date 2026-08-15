import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import {
    createChart,
    CandlestickSeries,
    BarSeries,
    LineSeries,
    AreaSeries,
    BaselineSeries
} from 'lightweight-charts';
import styles from './ChartComponent.module.css';
import { getKlines, subscribeToTicker } from '../../services/binance';
import { calculateSMA, calculateEMA } from '../../utils/indicators';
import { calculateHeikinAshi } from '../../utils/chartUtils';
import { intervalToSeconds } from '../../utils/timeframes';
import { AlertAdapter } from '../../plugins/line-tools-adapter/AlertAdapter';
import { FEATURE_FLAGS, useCoreLineTools } from '../../config/flags';
import { createLineToolsAdapter, registerPriorityTools } from '../../plugins/line-tools-core-adapter';

import { LineToolManager, PriceScaleTimer } from '../../plugins/line-tools/line-tools.js';
import '../../plugins/line-tools/line-tools.css';
import ReplayControls from '../Replay/ReplayControls';
import ReplaySlider from '../Replay/ReplaySlider';
import { useChart } from './hooks/useChart';
import ChartOverlays from './ChartOverlays';
import ChartWatermark from './ChartWatermark';

const TOOL_MAP = {
    'cursor': 'None',
    'eraser': 'Eraser',
    'trendline': 'TrendLine',
    'arrow': 'Arrow',
    'ray': 'Ray',
    'extended_line': 'ExtendedLine',
    'horizontal': 'HorizontalLine',
    'horizontal_ray': 'HorizontalRay',
    'vertical': 'VerticalLine',
    'cross_line': 'CrossLine',
    'parallel_channel': 'ParallelChannel',
    'fibonacci': 'FibRetracement',
    'fib_extension': 'FibExtension',
    'pitchfork': 'Pitchfork',
    'brush': 'Brush',
    'highlighter': 'Highlighter',
    'rectangle': 'Rectangle',
    'circle': 'Circle',
    'path': 'Path',
    'text': 'Text',
    'callout': 'Callout',
    'price_label': 'PriceLabel',
    'pattern': 'Pattern',
    'triangle': 'Triangle',
    'abcd': 'ABCD',
    'xabcd': 'XABCD',
    'elliott_impulse': 'ElliottImpulseWave',
    'elliott_correction': 'ElliottCorrectionWave',
    'head_and_shoulders': 'HeadAndShoulders',
    'prediction': 'LongPosition',
    'prediction_short': 'ShortPosition',
    'date_range': 'DateRange',
    'price_range': 'PriceRange',
    'date_price_range': 'DatePriceRange',
    'measure': 'Measure',
    'zoom_in': 'None',
    'zoom_out': 'None',
    'remove': 'None'
};

const ChartComponent = forwardRef(({
    symbol,
    interval,
    chartType,
    indicators,
    activeTool,
    onToolUsed,
    isLogScale,
    isAutoScale,
    timeRange,
    magnetMode,
    isToolbarVisible = true,
    theme = 'dark',
    comparisonSymbols = [],
    onAlertsSync,
    onAlertTriggered,
    onReplayModeChange,
    isDrawingsLocked = false,
    isDrawingsHidden = false,
    isTimerVisible = false,
    showWatermark = false,
    watermarkText = 'MP Charts',
}, ref) => {

    const chartContainerRef = useRef();
    const [isLoading, setIsLoading] = useState(true);
    const isActuallyLoadingRef = useRef(true);
    const chartRef = useRef(null);
    const mainSeriesRef = useRef(null);
    const smaSeriesRef = useRef(null);
    const emaSeriesRef = useRef(null);
    const chartReadyRef = useRef(false);
    const lineToolManagerRef = useRef(null);
    const alertAdapterRef = useRef(null);
    const priceScaleTimerRef = useRef(null);
    const wsRef = useRef(null);
    const chartTypeRef = useRef(chartType);
    const dataRef = useRef([]);
    const comparisonSeriesRefs = useRef(new Map());

    // Replay State
    const [isReplayMode, setIsReplayMode] = useState(false);
    const isReplayModeRef = useRef(false);
    useEffect(() => { isReplayModeRef.current = isReplayMode; }, [isReplayMode]);

    const [isPlaying, setIsPlaying] = useState(false);
    const [replaySpeed, setReplaySpeed] = useState(1);
    const [replayIndex, setReplayIndex] = useState(null);
    const [isSelectingReplayPoint, setIsSelectingReplayPoint] = useState(false);
    const fullDataRef = useRef([]);
    const replayIntervalRef = useRef(null);
    const fadedSeriesRef = useRef(null);

    // Refs for stable callbacks
    const replayIndexRef = useRef(null);
    const isPlayingRef = useRef(false);
    const updateReplayDataRef = useRef(null);
    useEffect(() => { replayIndexRef.current = replayIndex; }, [replayIndex]);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    const DEFAULT_CANDLE_WINDOW = 230;
    const DEFAULT_RIGHT_OFFSET = 10;

    const applyDefaultCandlePosition = (explicitLength, candleWindow = DEFAULT_CANDLE_WINDOW) => {
        if (!chartRef.current) return;

        const inferredLength = Number.isFinite(explicitLength)
            ? explicitLength
            : (mainSeriesRef.current?.data()?.length ?? 0);

        if (!inferredLength || inferredLength <= 0) {
            return;
        }

        const lastIndex = Math.max(inferredLength - 1, 0);
        const to = lastIndex + DEFAULT_RIGHT_OFFSET;
        const from = to - candleWindow;

        try {
            const timeScale = chartRef.current.timeScale();
            timeScale.applyOptions({ rightOffset: DEFAULT_RIGHT_OFFSET });
            timeScale.setVisibleLogicalRange({ from, to });
        } catch (err) {
            console.warn('Failed to apply default candle position', err);
        }

        chartRef.current.priceScale('right').applyOptions({ autoScale: true });
        if (lineToolManagerRef.current && typeof lineToolManagerRef.current.setDefaultRange === 'function') {
            lineToolManagerRef.current.setDefaultRange({ from, to });
        }
    };

    // Axis Label State
    const [axisLabel, setAxisLabel] = useState(null);
    const isChartVisibleRef = useRef(true);

    // OHLC Header Bar State
    const [ohlcData, setOhlcData] = useState(null);

    useEffect(() => {
        chartTypeRef.current = chartType;
    }, [chartType]);

    // Expose undo/redo and line tool manager to parent
    useImperativeHandle(ref, () => ({
        undo: () => {
            if (lineToolManagerRef.current && typeof lineToolManagerRef.current.undo === 'function') {
                lineToolManagerRef.current.undo();
            }
        },
        redo: () => {
            if (lineToolManagerRef.current && typeof lineToolManagerRef.current.redo === 'function') {
                lineToolManagerRef.current.redo();
            }
        },
        getLineToolManager: () => lineToolManagerRef.current,
        clearTools: () => {
            if (lineToolManagerRef.current && typeof lineToolManagerRef.current.clearTools === 'function') {
                lineToolManagerRef.current.clearTools();
            }
        },
        addPriceAlert: (alert) => {
            const adapter = alertAdapterRef.current;
            if (!adapter || !alert || alert.price == null) return;
            adapter.setSymbol(symbol);
            adapter.create(alert.price, 'crossing');
        },
        removePriceAlert: (externalId) => {
            const adapter = alertAdapterRef.current;
            if (!adapter) return;
            adapter.remove(externalId);
        },
        restartPriceAlert: (price, condition = 'crossing') => {
            const adapter = alertAdapterRef.current;
            if (!adapter || price == null) return;
            adapter.create(price, condition === 'crossing' ? 'crossing' : condition);
        },
        resetZoom: () => {
            applyDefaultCandlePosition(dataRef.current.length);
        },
        getChartContainer: () => chartContainerRef.current,
        getCurrentPrice: () => {
            if (dataRef.current && dataRef.current.length > 0) {
                const lastData = dataRef.current[dataRef.current.length - 1];
                return lastData.close ?? lastData.value;
            }
            return null;
        },
        toggleTimer: () => {
            if (priceScaleTimerRef.current) {
                const isVisible = priceScaleTimerRef.current.isVisible();
                priceScaleTimerRef.current.setVisible(!isVisible);

                if (mainSeriesRef.current) {
                    mainSeriesRef.current.applyOptions({
                        lastValueVisible: isVisible
                    });
                }

                return !isVisible;
            }
            return false;
        },
        toggleReplay: () => {
            setIsReplayMode(prev => {
                const newMode = !prev;
                if (!prev) {
                    fullDataRef.current = [...dataRef.current];
                    setIsPlaying(false);
                    isPlayingRef.current = false;
                    const startIndex = Math.max(0, dataRef.current.length - 1);
                    setReplayIndex(startIndex);
                    replayIndexRef.current = startIndex;
                    setTimeout(() => {
                        if (updateReplayDataRef.current) {
                            updateReplayDataRef.current(startIndex, false);
                        }
                    }, 0);
                } else {
                    stopReplay();
                    setIsPlaying(false);
                    isPlayingRef.current = false;
                    setReplayIndex(null);
                    replayIndexRef.current = null;
                    setIsSelectingReplayPoint(false);

                    if (fadedSeriesRef.current && chartRef.current) {
                        try {
                            chartRef.current.removeSeries(fadedSeriesRef.current);
                        } catch (e) {
                            console.warn('Error removing faded series:', e);
                        }
                        fadedSeriesRef.current = null;
                    }

                    if (mainSeriesRef.current && fullDataRef.current.length > 0) {
                        dataRef.current = fullDataRef.current;
                        const transformedData = transformData(fullDataRef.current, chartTypeRef.current);
                        mainSeriesRef.current.setData(transformedData);
                        updateIndicators(fullDataRef.current, indicators);
                    }
                }

                if (onReplayModeChange) {
                    setTimeout(() => onReplayModeChange(newMode), 0);
                }

                return newMode;
            });
        }
    }));

    const zoomChart = useCallback((zoomIn = true) => {
        if (!chartRef.current) return;

        try {
            const timeScale = chartRef.current.timeScale();
            const visibleRange = timeScale.getVisibleLogicalRange();

            if (!visibleRange) return;

            const { from, to } = visibleRange;
            const rangeSize = to - from;
            const center = (from + to) / 2;

            const zoomFactor = zoomIn ? 0.8 : 1.25;
            const newRangeSize = rangeSize * zoomFactor;

            const newFrom = center - newRangeSize / 2;
            const newTo = center + newRangeSize / 2;

            timeScale.setVisibleLogicalRange({ from: newFrom, to: newTo });

        } catch (err) {
            console.warn('Failed to zoom chart', err);
        }
    }, []);

    useEffect(() => {
        if (lineToolManagerRef.current && activeTool) {
            const manager = lineToolManagerRef.current;

            if (activeTool === 'lock_all') {
                if (onToolUsed) onToolUsed();
                return;
            }

            if (activeTool === 'hide_drawings') {
                if (onToolUsed) onToolUsed();
                return;
            }

            if (activeTool === 'clear_all') {
                if (typeof manager.clearTools === 'function') {
                    manager.clearTools();
                }
                if (onToolUsed) onToolUsed();
                return;
            }

            if (activeTool === 'show_timer') {
                if (onToolUsed) onToolUsed();
                return;
            }

            const mappedTool = TOOL_MAP[activeTool] || 'None';

            console.log(`[Chart] activeTool=${activeTool} mapped=${mappedTool}`);

            if (typeof manager.startTool === 'function') {
                manager.startTool(mappedTool);
            }
        }
    }, [activeTool, onToolUsed]);

    useEffect(() => {
        if (!lineToolManagerRef.current) return;
        const manager = lineToolManagerRef.current;

        const currentlyLocked = typeof manager.areDrawingsLocked === 'function'
            ? manager.areDrawingsLocked()
            : false;

        if (isDrawingsLocked !== currentlyLocked) {
            if (isDrawingsLocked) {
                if (typeof manager.lockAllDrawings === 'function') {
                    manager.lockAllDrawings();
                }
            } else {
                if (typeof manager.unlockAllDrawings === 'function') {
                    manager.unlockAllDrawings();
                }
            }
        }
    }, [isDrawingsLocked]);

    useEffect(() => {
        if (!lineToolManagerRef.current) return;
        const manager = lineToolManagerRef.current;

        const currentlyHidden = typeof manager.areDrawingsHidden === 'function'
            ? manager.areDrawingsHidden()
            : false;

        if (isDrawingsHidden !== currentlyHidden) {
            if (isDrawingsHidden) {
                if (typeof manager.hideAllDrawings === 'function') {
                    manager.hideAllDrawings();
                }
            } else {
                if (typeof manager.showAllDrawings === 'function') {
                    manager.showAllDrawings();
                }
            }
        }
    }, [isDrawingsHidden]);

    useEffect(() => {
        if (!priceScaleTimerRef.current) return;
        const timer = priceScaleTimerRef.current;

        if (typeof timer.setVisible === 'function') {
            timer.setVisible(isTimerVisible);

            if (mainSeriesRef.current) {
                mainSeriesRef.current.applyOptions({
                    lastValueVisible: !isTimerVisible
                });
            }
        }
    }, [isTimerVisible]);

    useEffect(() => {
        const isZoomIn = activeTool === 'zoom_in';
        const isZoomOut = activeTool === 'zoom_out';

        if ((!isZoomIn && !isZoomOut) || !chartContainerRef.current) return;

        const handleZoomClick = (e) => {
            if (e.button !== 0) return;
            zoomChart(isZoomIn);
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (onToolUsed) onToolUsed();
            }
        };

        const container = chartContainerRef.current;
        container.addEventListener('click', handleZoomClick);
        window.addEventListener('keydown', handleKeyDown);

        container.style.cursor = isZoomIn ? 'zoom-in' : 'zoom-out';

        return () => {
            container.removeEventListener('click', handleZoomClick);
            window.removeEventListener('keydown', handleKeyDown);
            container.style.cursor = '';
        };
    }, [activeTool, zoomChart, onToolUsed]);

    useEffect(() => {
        if (!chartContainerRef.current) return undefined;

        const handleVisibility = (entries) => {
            if (entries && entries[0]) {
                isChartVisibleRef.current = entries[0].isIntersecting;
            }
        };

        const observer = new IntersectionObserver(handleVisibility, { threshold: 0 });
        observer.observe(chartContainerRef.current);

        const handleDocumentVisibility = () => {
            if (document.visibilityState === 'hidden') {
                isChartVisibleRef.current = false;
            }
        };

        document.addEventListener('visibilitychange', handleDocumentVisibility);

        return () => {
            observer.disconnect();
            document.removeEventListener('visibilitychange', handleDocumentVisibility);
        };
    }, []);

    const updateAxisLabel = useCallback(() => {
        if (!chartRef.current || !mainSeriesRef.current || !chartContainerRef.current) return;

        const data = mainSeriesRef.current.data();
        if (!data || data.length === 0) {
            setAxisLabel(null);
            return;
        }

        const lastData = data[data.length - 1];
        const price = lastData.close ?? lastData.value;
        if (price === undefined) {
            setAxisLabel(null);
            return;
        }

        const coordinate = mainSeriesRef.current.priceToCoordinate(price);

        if (coordinate === null) {
            setAxisLabel(null);
            return;
        }

        let color = '#2962FF';
        if (lastData.open !== undefined && lastData.close !== undefined) {
            color = lastData.close >= lastData.open ? '#089981' : '#F23645';
        }

        try {
            let labelText = price.toFixed(2);

            if (comparisonSymbols.length > 0) {
                const timeScale = chartRef.current.timeScale();
                const visibleRange = timeScale.getVisibleLogicalRange();

                if (visibleRange) {
                    const firstIndex = Math.max(0, Math.round(visibleRange.from));
                    if (dataRef.current && firstIndex < dataRef.current.length) {
                        const baseData = dataRef.current[firstIndex];
                        if (baseData) {
                            const baseValue = baseData.close ?? baseData.value;

                            if (baseValue && baseValue !== 0) {
                                const percentage = ((price - baseValue) / baseValue) * 100;
                                labelText = `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
                            }
                        }
                    }
                }
            }

            const newLabel = {
                top: coordinate,
                price: labelText,
                symbol: comparisonSymbols.length > 0 ? symbol : null,
                color: color
            };

            setAxisLabel(prev => {
                if (!prev || prev.top !== newLabel.top || prev.price !== newLabel.price || prev.symbol !== newLabel.symbol || prev.color !== newLabel.color) {
                    return newLabel;
                }
                return prev;
            });
        } catch (err) {
            console.error('Error in updateAxisLabel:', err);
        }
    }, [comparisonSymbols, symbol]);

    const updateOhlcFromLatest = useCallback(() => {
        if (dataRef.current && dataRef.current.length > 0) {
            const lastData = dataRef.current[dataRef.current.length - 1];
            const prevData = dataRef.current.length > 1 ? dataRef.current[dataRef.current.length - 2] : null;
            const change = prevData ? lastData.close - prevData.close : 0;
            const changePercent = prevData && prevData.close ? ((change / prevData.close) * 100) : 0;

            setOhlcData({
                open: lastData.open,
                high: lastData.high,
                low: lastData.low,
                close: lastData.close,
                change: change,
                changePercent: changePercent,
                isUp: lastData.close >= lastData.open
            });
        }
    }, []);

    useEffect(() => {
        let animationFrameId;
        let isRunning = true;

        const animate = () => {
            if (!isRunning) return;

            if (isChartVisibleRef.current && document.visibilityState !== 'hidden') {
                updateAxisLabel();
                animationFrameId = requestAnimationFrame(animate);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isChartVisibleRef.current && isRunning) {
                animationFrameId = requestAnimationFrame(animate);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        animationFrameId = requestAnimationFrame(animate);

        return () => {
            isRunning = false;
            cancelAnimationFrame(animationFrameId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [updateAxisLabel]);

    const transformData = (data, type) => {
        if (!data || data.length === 0) return [];

        switch (type) {
            case 'line':
            case 'area':
            case 'baseline':
                return data.map(d => ({ time: d.time, value: d.close }));
            case 'heikin-ashi':
                return calculateHeikinAshi(data);
            default:
                return data;
        }
    };

    const createSeries = (chart, type, title = '') => {
        const commonOptions = { lastValueVisible: true, priceScaleId: 'right', title: title };

        switch (type) {
            case 'candlestick':
                return chart.addSeries(CandlestickSeries, {
                    ...commonOptions,
                    upColor: '#089981',
                    downColor: '#F23645',
                    borderVisible: false,
                    wickUpColor: '#089981',
                    wickDownColor: '#F23645',
                });
            case 'bar':
                return chart.addSeries(BarSeries, {
                    ...commonOptions,
                    upColor: '#089981',
                    downColor: '#F23645',
                    thinBars: false,
                });
            case 'hollow-candlestick':
                return chart.addSeries(CandlestickSeries, {
                    ...commonOptions,
                    upColor: 'transparent',
                    downColor: '#F23645',
                    borderUpColor: '#089981',
                    borderDownColor: '#F23645',
                    wickUpColor: '#089981',
                    wickDownColor: '#F23645',
                });
            case 'line':
                return chart.addSeries(LineSeries, {
                    ...commonOptions,
                    color: '#2962FF',
                    lineWidth: 2,
                });
            case 'area':
                return chart.addSeries(AreaSeries, {
                    ...commonOptions,
                    topColor: 'rgba(41, 98, 255, 0.4)',
                    bottomColor: 'rgba(41, 98, 255, 0.0)',
                    lineColor: '#2962FF',
                    lineWidth: 2,
                });
            case 'baseline':
                return chart.addSeries(BaselineSeries, {
                    ...commonOptions,
                    topLineColor: '#089981',
                    topFillColor1: 'rgba(8, 153, 129, 0.28)',
                    topFillColor2: 'rgba(8, 153, 129, 0.05)',
                    bottomLineColor: '#F23645',
                    bottomFillColor1: 'rgba(242, 54, 69, 0.05)',
                    bottomFillColor2: 'rgba(242, 54, 69, 0.28)',
                });
            case 'heikin-ashi':
                return chart.addSeries(CandlestickSeries, {
                    ...commonOptions,
                    upColor: '#089981',
                    downColor: '#F23645',
                    borderVisible: false,
                    wickUpColor: '#089981',
                    wickDownColor: '#F23645',
                });
            default:
                return chart.addSeries(CandlestickSeries, {
                    ...commonOptions,
                    upColor: '#089981',
                    downColor: '#F23645',
                    borderVisible: false,
                    wickUpColor: '#089981',
                    wickDownColor: '#F23645',
                });
        }
    };

    const activeToolRef = useRef(activeTool);
    useEffect(() => {
        activeToolRef.current = activeTool;
    }, [activeTool]);

    const initializeLineTools = (series) => {
        if (!lineToolManagerRef.current) {
            if (!useCoreLineTools()) {
                const manager = new LineToolManager();

                const originalStartTool = manager.startTool.bind(manager);
                manager.startTool = (tool) => {
                    originalStartTool(tool);

                    const isZoomTool = activeToolRef.current === 'zoom_in' || activeToolRef.current === 'zoom_out';
                    if ((tool === 'None' || tool === null) && activeToolRef.current !== null && activeToolRef.current !== 'cursor' && !isZoomTool) {
                        if (onToolUsed) onToolUsed();
                    }
                };

                series.attachPrimitive(manager);
                lineToolManagerRef.current = manager;

                const adapter = new AlertAdapter(manager);
                alertAdapterRef.current = adapter;
                adapter.setSymbol(symbol);

                if (typeof onAlertsSync === 'function') {
                    adapter.onChange(() => {
                        const rawAlerts = adapter.getAll();
                        const mapped = rawAlerts.map(a => ({
                            id: a.id,
                            price: a.price,
                            condition: a.condition || 'crossing',
                            type: a.type || 'price',
                        }));
                        onAlertsSync(mapped);
                    }, manager);
                }

                if (typeof onAlertTriggered === 'function') {
                    adapter.onTrigger((evt) => {
                        onAlertTriggered({
                            externalId: evt.alertId,
                            price: evt.alertPrice,
                            timestamp: evt.timestamp,
                            direction: evt.direction,
                            condition: evt.condition,
                        });
                    }, manager);
                }

                window.lineToolManager = manager;
                window.chartInstance = chartRef.current;
                window.seriesInstance = series;
            } else {
                // CORE path (USE_CORE_LINE_TOOLS=true): use the @mp/line-tools-core adapter.
                const coreAdapter = createLineToolsAdapter(chartRef.current, series);
                coreAdapter.init(registerPriorityTools);
                lineToolManagerRef.current = coreAdapter;

                window.lineToolManager = coreAdapter;
                window.chartInstance = chartRef.current;
                window.seriesInstance = series;
            }
        }
    };

    const initializePriceScaleTimer = (series, intervalSeconds) => {
        if (!priceScaleTimerRef.current) {
            const timer = new PriceScaleTimer({
                timeframeSeconds: intervalSeconds,
                visible: isTimerVisible,
                textColor: '#FFFFFF',
                yOffset: 19,
                textPadding: 0.95
            });
            series.attachPrimitive(timer);
            priceScaleTimerRef.current = timer;
        }
    };

    const { chartInstance } = useChart(chartContainerRef, { theme, magnetMode });

    useEffect(() => {
        if (!chartInstance) return;

        chartRef.current = chartInstance;

        const handleVisibleTimeRangeChange = (newVisibleRange) => {
            if (!newVisibleRange || !mainSeriesRef.current || !dataRef.current || dataRef.current.length === 0) return;

            const timeScale = chartInstance.timeScale();
            const logicalRange = timeScale.getVisibleLogicalRange();

            if (logicalRange) {
                const rawIndex = logicalRange.to;
                const lastIndex = Math.min(Math.round(rawIndex), dataRef.current.length - 1);

                if (lastIndex >= 0) {
                    const candle = dataRef.current[lastIndex];
                    if (candle && priceScaleTimerRef.current) {
                        if (candle.open !== undefined && candle.close !== undefined) {
                            priceScaleTimerRef.current.updateCandleData(candle.open, candle.close);
                        }
                    }
                }
            }
        };

        chartInstance.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleTimeRangeChange);

        const handleContextMenu = (event) => {
            event.preventDefault();
            if (activeToolRef.current && activeToolRef.current !== 'cursor') {
                if (onToolUsed) onToolUsed();
            }
        };
        const container = chartContainerRef.current;
        if (container) {
            container.addEventListener('contextmenu', handleContextMenu, true);
        }

        window.chartInstance = chartInstance;

        return () => {
            window.lineToolManager = null;
            window.chartInstance = null;
            window.seriesInstance = null;

            try {
                chartInstance.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleTimeRangeChange);
            } catch (e) {
                console.warn('Failed to unsubscribe visible logical range change', e);
            }

            try {
                if (container) {
                    container.removeEventListener('contextmenu', handleContextMenu, true);
                }
            } catch (error) {
                console.warn('Failed to remove contextmenu listener', error);
            }
        };
    }, [chartInstance, onToolUsed]);

    useEffect(() => {
        if (!chartRef.current) {
            return;
        }

        const chart = chartRef.current;

        const replacementSeries = createSeries(chart, chartType, symbol);
        mainSeriesRef.current = replacementSeries;
        initializeLineTools(replacementSeries);

        if (priceScaleTimerRef.current) {
            try {
                replacementSeries.attachPrimitive(priceScaleTimerRef.current);
            } catch (e) {
                console.warn('Error re-attaching timer to new series:', e);
            }
        }

        const existingData = transformData(dataRef.current, chartType);
        if (existingData.length) {
            replacementSeries.setData(existingData);
            updateIndicators(dataRef.current, indicators);
            applyDefaultCandlePosition(existingData.length);
            updateAxisLabel();

            if (activeTool && activeTool !== 'cursor') {
                const mappedTool = TOOL_MAP[activeTool] || 'None';
                if (lineToolManagerRef.current && typeof lineToolManagerRef.current.startTool === 'function') {
                    lineToolManagerRef.current.startTool(mappedTool);
                }
            }
        }

        if (isReplayMode && fadedSeriesRef.current) {
            try {
                chart.removeSeries(fadedSeriesRef.current);
            } catch (e) {
                console.warn('Error removing faded series on chart type change:', e);
            }
            fadedSeriesRef.current = null;

            if (replayIndex !== null) {
                updateReplayData(replayIndex);
            }
        }

        return () => {
            if (lineToolManagerRef.current) {
                try {
                    lineToolManagerRef.current.clearTools();
                } catch (err) {
                    console.warn('Failed to clear tools before switching chart type', err);
                }
                try {
                    if (mainSeriesRef.current) {
                        mainSeriesRef.current.detachPrimitive(lineToolManagerRef.current);
                    }
                } catch (err) {
                    console.warn('Failed to detach line tools from series', err);
                }
                lineToolManagerRef.current = null;
            }

            if (mainSeriesRef.current) {
                try {
                    chart.removeSeries(mainSeriesRef.current);
                } catch (e) {
                    if (e.message !== 'Value is undefined') {
                        console.warn('Error removing series:', e);
                    }
                }
                mainSeriesRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chartType, symbol, chartInstance]);

    useEffect(() => {
        if (!chartRef.current) return;

        let preservedCandleWindow = DEFAULT_CANDLE_WINDOW;
        try {
            const timeScale = chartRef.current.timeScale();
            const range = timeScale.getVisibleLogicalRange();
            if (range) {
                const count = range.to - range.from;
                if (count > 5 && Number.isFinite(count)) {
                    preservedCandleWindow = count;
                }
            }
        } catch (e) {
            console.warn('Failed to capture current zoom level', e);
        }

        let cancelled = false;
        let indicatorFrame = null;
        const abortController = new AbortController();

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        const loadData = async () => {
            isActuallyLoadingRef.current = true;
            chartReadyRef.current = false;
            setIsLoading(true);

            try {
                const data = await getKlines(symbol, interval, 1000, abortController.signal);
                if (cancelled) return;

                if (Array.isArray(data) && data.length > 0 && mainSeriesRef.current) {
                    dataRef.current = data;
                    const activeType = chartTypeRef.current;
                    const transformedData = transformData(data, activeType);
                    mainSeriesRef.current.setData(transformedData);

                    chartReadyRef.current = true;

                    const intervalSeconds = intervalToSeconds(interval);
                    if (!priceScaleTimerRef.current && mainSeriesRef.current && Number.isFinite(intervalSeconds) && intervalSeconds > 0) {
                        initializePriceScaleTimer(mainSeriesRef.current, intervalSeconds);
                    } else if (priceScaleTimerRef.current && Number.isFinite(intervalSeconds) && intervalSeconds > 0) {
                        priceScaleTimerRef.current.applyOptions({ timeframeSeconds: intervalSeconds });
                    }

                    if (indicatorFrame) cancelAnimationFrame(indicatorFrame);
                    indicatorFrame = requestAnimationFrame(() => {
                        if (!cancelled) {
                            updateIndicators(data, indicators);
                        }
                    });

                    applyDefaultCandlePosition(transformedData.length, preservedCandleWindow);

                    setTimeout(() => {
                        if (!cancelled) {
                            isActuallyLoadingRef.current = false;
                            setIsLoading(false);
                            updateAxisLabel();
                        }
                    }, 50);

                    wsRef.current = subscribeToTicker(symbol.toLowerCase(), interval, (ticker) => {
                        if (cancelled || !ticker) return;

                        const parsedCandle = {
                            time: Number(ticker.time),
                            open: Number(ticker.open),
                            high: Number(ticker.high),
                            low: Number(ticker.low),
                            close: Number(ticker.close),
                        };

                        const intervalSeconds = intervalToSeconds(interval);
                        if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
                            return;
                        }

                        if (!['open', 'high', 'low', 'close'].every(key => Number.isFinite(parsedCandle[key]))) {
                            console.warn('Received invalid candle data:', parsedCandle);
                            return;
                        }

                        const candleTime = Math.floor(parsedCandle.time / intervalSeconds) * intervalSeconds;
                        const normalizedCandle = { ...parsedCandle, time: candleTime };

                        const currentData = dataRef.current.length ? [...dataRef.current] : [];
                        const lastIndex = currentData.length - 1;
                        if (lastIndex >= 0 && currentData[lastIndex].time === candleTime) {
                            currentData[lastIndex] = normalizedCandle;
                        } else {
                            currentData.push(normalizedCandle);
                        }

                        dataRef.current = currentData;

                        const currentChartType = chartTypeRef.current;
                        const transformedRealtimeData = transformData(currentData, currentChartType);
                        const latestUpdate = transformedRealtimeData[transformedRealtimeData.length - 1];

                        let isValidUpdate = false;
                        if (latestUpdate) {
                            if (latestUpdate.value !== undefined) {
                                isValidUpdate = Number.isFinite(latestUpdate.value);
                            } else if (latestUpdate.open !== undefined) {
                                isValidUpdate = ['open', 'high', 'low', 'close'].every(key => Number.isFinite(latestUpdate[key]));
                            }
                        }

                        if (isValidUpdate && mainSeriesRef.current && !isReplayModeRef.current) {
                            mainSeriesRef.current.setData(transformedRealtimeData);
                            updateRealtimeIndicators(currentData);
                            updateAxisLabel();
                            updateOhlcFromLatest();

                            if (priceScaleTimerRef.current) {
                                priceScaleTimerRef.current.updateCandleData(normalizedCandle.open, normalizedCandle.close);
                            }
                        }
                    });
                } else {
                    dataRef.current = [];
                    mainSeriesRef.current?.setData([]);
                    isActuallyLoadingRef.current = false;
                    setIsLoading(false);
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    return;
                }
                console.error('Error loading chart data:', error);
                if (!cancelled) {
                    isActuallyLoadingRef.current = false;
                    setIsLoading(false);
                }
            }
        };

        emaLastValueRef.current = null;
        loadData();

        return () => {
            cancelled = true;
            if (indicatorFrame) {
                cancelAnimationFrame(indicatorFrame);
            }
            abortController.abort();
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [symbol, interval, chartInstance]);

    const emaLastValueRef = useRef(null);

    const updateRealtimeIndicators = useCallback((data) => {
        if (!chartRef.current) return;

        const lastIndex = data.length - 1;
        const lastDataPoint = data[lastIndex];

        if (indicators.sma && smaSeriesRef.current) {
            if (data.length < 20) {
                const smaData = calculateSMA(data, 20);
                if (smaData && smaData.length > 0) {
                    smaSeriesRef.current.setData(smaData);
                }
            } else {
                const subset = data.slice(-20);
                const sum = subset.reduce((acc, d) => acc + d.close, 0);
                const average = sum / subset.length;
                smaSeriesRef.current.update({ time: lastDataPoint.time, value: average });
            }
        }

        if (indicators.ema && emaSeriesRef.current) {
            if (data.length < 20 || emaLastValueRef.current === null) {
                const emaData = calculateEMA(data, 20);
                if (emaData && emaData.length > 0) {
                    emaLastValueRef.current = emaData[emaData.length - 1].value;
                    emaSeriesRef.current.setData(emaData);
                }
            } else {
                const smoothing = 2 / (20 + 1);
                const emaValue = (lastDataPoint.close - emaLastValueRef.current) * smoothing + emaLastValueRef.current;
                emaLastValueRef.current = emaValue;
                emaSeriesRef.current.update({ time: lastDataPoint.time, value: emaValue });
            }
        }
    }, [indicators]);

    const updateIndicators = useCallback((data, indicatorsConfig) => {
        if (!chartRef.current) return;

        const canAddSeries = chartReadyRef.current;

        if (indicatorsConfig.sma) {
            if (!smaSeriesRef.current && canAddSeries) {
                smaSeriesRef.current = chartRef.current.addSeries(LineSeries, {
                    color: '#2962FF',
                    lineWidth: 2,
                    title: 'SMA 20',
                    priceLineVisible: false,
                    lastValueVisible: false
                });
            }
            if (smaSeriesRef.current && typeof calculateSMA === 'function') {
                const smaData = calculateSMA(data, 20);
                if (smaData && smaData.length > 0) {
                    smaSeriesRef.current.setData(smaData);
                }
            }
        } else {
            if (smaSeriesRef.current) {
                chartRef.current.removeSeries(smaSeriesRef.current);
                smaSeriesRef.current = null;
            }
        }

        if (indicatorsConfig.ema) {
            if (!emaSeriesRef.current && canAddSeries) {
                emaSeriesRef.current = chartRef.current.addSeries(LineSeries, {
                    color: '#FF6D00',
                    lineWidth: 2,
                    title: 'EMA 20',
                    priceLineVisible: false,
                    lastValueVisible: false
                });
            }
            if (emaSeriesRef.current && typeof calculateEMA === 'function') {
                const emaData = calculateEMA(data, 20);
                if (emaData && emaData.length > 0) {
                    emaSeriesRef.current.setData(emaData);
                }
            }
        } else {
            if (emaSeriesRef.current) {
                chartRef.current.removeSeries(emaSeriesRef.current);
                emaSeriesRef.current = null;
            }
        }
    }, []);

    useEffect(() => {
        emaLastValueRef.current = null;

        if (dataRef.current.length > 0) {
            try {
                updateIndicators(dataRef.current, indicators);
                if (emaSeriesRef.current && dataRef.current.length >= 20) {
                    const emaData = calculateEMA(dataRef.current, 20);
                    if (emaData && emaData.length > 0) {
                        emaLastValueRef.current = emaData[emaData.length - 1].value;
                        emaSeriesRef.current.setData(emaData);
                    }
                }
            } catch (error) {
                console.error('Error updating indicators:', error);
            }
        }
    }, [indicators, updateIndicators]);

    useEffect(() => {
        if (!chartRef.current || !mainSeriesRef.current) return;

        const handleCrosshairMove = (param) => {
            const isNotHovering = !param || !param.point || !param.seriesData || param.seriesData.size === 0;

            if (isNotHovering || !mainSeriesRef.current) {
                if (dataRef.current && dataRef.current.length > 0) {
                    const lastData = dataRef.current[dataRef.current.length - 1];
                    const prevData = dataRef.current.length > 1 ? dataRef.current[dataRef.current.length - 2] : null;
                    const change = prevData ? lastData.close - prevData.close : 0;
                    const changePercent = prevData && prevData.close ? ((change / prevData.close) * 100) : 0;

                    setOhlcData({
                        open: lastData.open,
                        high: lastData.high,
                        low: lastData.low,
                        close: lastData.close,
                        change: change,
                        changePercent: changePercent,
                        isUp: lastData.close >= lastData.open
                    });
                }
                return;
            }

            const data = param.seriesData.get(mainSeriesRef.current);
            if (data && data.open !== undefined) {
                const currentIndex = dataRef.current.findIndex(d => d.time === data.time);
                const prevData = currentIndex > 0 ? dataRef.current[currentIndex - 1] : null;
                const change = prevData ? data.close - prevData.close : 0;
                const changePercent = prevData && prevData.close ? ((change / prevData.close) * 100) : 0;

                setOhlcData({
                    open: data.open,
                    high: data.high,
                    low: data.low,
                    close: data.close,
                    change: change,
                    changePercent: changePercent,
                    isUp: data.close >= data.open
                });
            }
        };

        chartRef.current.subscribeCrosshairMove(handleCrosshairMove);

        if (dataRef.current && dataRef.current.length > 0) {
            const lastData = dataRef.current[dataRef.current.length - 1];
            const prevData = dataRef.current.length > 1 ? dataRef.current[dataRef.current.length - 2] : null;
            const change = prevData ? lastData.close - prevData.close : 0;
            const changePercent = prevData && prevData.close ? ((change / prevData.close) * 100) : 0;

            setOhlcData({
                open: lastData.open,
                high: lastData.high,
                low: lastData.low,
                close: lastData.close,
                change: change,
                changePercent: changePercent,
                isUp: lastData.close >= lastData.open
            });
        }

        return () => {
            if (chartRef.current) {
                try {
                    chartRef.current.unsubscribeCrosshairMove(handleCrosshairMove);
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        };
    }, [symbol, interval, chartInstance]);

    useEffect(() => {
        if (!chartRef.current) return;

        const abortController = new AbortController();
        let cancelled = false;

        const currentSymbols = new Set(comparisonSymbols.map(s => s.symbol));
        const activeSeries = comparisonSeriesRefs.current;

        activeSeries.forEach((series, sym) => {
            if (!currentSymbols.has(sym)) {
                try {
                    chartRef.current.removeSeries(series);
                } catch (e) {
                    // Ignore removal errors
                }
                activeSeries.delete(sym);
            }
        });

        const loadComparisonData = async (comp) => {
            if (activeSeries.has(comp.symbol)) return;

            const series = chartRef.current.addSeries(LineSeries, {
                color: comp.color,
                lineWidth: 2,
                priceScaleId: 'right',
                title: comp.symbol,
            });
            activeSeries.set(comp.symbol, series);

            try {
                const data = await getKlines(comp.symbol, interval, 1000, abortController.signal);
                if (cancelled || !activeSeries.has(comp.symbol)) return;
                if (data && data.length > 0) {
                    const transformedData = data.map(d => ({ time: d.time, value: d.close }));
                    series.setData(transformedData);
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error(`Failed to load comparison data for ${comp.symbol}`, err);
                }
            }
        };

        comparisonSymbols.forEach(comp => loadComparisonData(comp));

        const mode = comparisonSymbols.length > 0 ? 2 : (isLogScale ? 1 : 0);

        chartRef.current.priceScale('right').applyOptions({
            mode: mode,
            autoScale: isAutoScale,
        });

        return () => {
            cancelled = true;
            abortController.abort();
        };
    }, [comparisonSymbols, interval, isLogScale, isAutoScale, chartInstance]);

    useEffect(() => {
        if (chartRef.current && timeRange && !isLoading) {
            const now = Math.floor(Date.now() / 1000);
            let from = now;
            const to = now;

            switch (timeRange) {
                case '1D': from = now - 86400; break;
                case '5D': from = now - 86400 * 5; break;
                case '1M': from = now - 86400 * 30; break;
                case '3M': from = now - 86400 * 90; break;
                case '6M': from = now - 86400 * 180; break;
                case 'YTD': {
                    const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime() / 1000;
                    from = startOfYear;
                    break;
                }
                case '1Y': from = now - 86400 * 365; break;
                case '5Y': from = now - 86400 * 365 * 5; break;
                case 'All':
                    applyDefaultCandlePosition();
                    return;
                default: return;
            }

            if (from && to && !isNaN(from) && !isNaN(to)) {
                try {
                    chartRef.current.timeScale().setVisibleRange({ from, to });
                } catch (e) {
                    if (e.message !== 'Value is null') {
                        console.warn('Failed to set visible range:', e);
                    }
                }
            }
        }
    }, [timeRange, isLoading]);

    const stopReplay = () => {
        if (replayIntervalRef.current) {
            clearInterval(replayIntervalRef.current);
            replayIntervalRef.current = null;
        }
    };

    const updateReplayData = useCallback((index, hideFeature = true, preserveView = false) => {
        if (!mainSeriesRef.current || !fullDataRef.current || !chartRef.current) return;

        const clampedIndex = Math.max(0, Math.min(index, fullDataRef.current.length - 1));

        let currentVisibleRange = null;
        if (preserveView && chartRef.current) {
            try {
                const timeScale = chartRef.current.timeScale();
                currentVisibleRange = timeScale.getVisibleLogicalRange();
            } catch (e) {
                // Ignore errors
            }
        }

        const pastData = fullDataRef.current.slice(0, clampedIndex + 1);

        if (hideFeature) {
            dataRef.current = pastData;
            const transformedData = transformData(pastData, chartTypeRef.current);
            mainSeriesRef.current.setData(transformedData);
        } else {
            dataRef.current = fullDataRef.current;
            const transformedData = transformData(fullDataRef.current, chartTypeRef.current);
            mainSeriesRef.current.setData(transformedData);
        }

        updateIndicators(pastData, indicators);
        updateAxisLabel();

        if (priceScaleTimerRef.current && pastData.length > 0) {
            const lastCandle = pastData[pastData.length - 1];
            if (lastCandle && lastCandle.open !== undefined && lastCandle.close !== undefined) {
                priceScaleTimerRef.current.updateCandleData(lastCandle.open, lastCandle.close);
            }
        }

        replayIndexRef.current = clampedIndex;

        if (preserveView && currentVisibleRange && chartRef.current) {
            try {
                setTimeout(() => {
                    const timeScale = chartRef.current.timeScale();
                    timeScale.setVisibleLogicalRange(currentVisibleRange);
                }, 0);
            } catch (e) {
                // Ignore errors
            }
        }
    }, [indicators, updateAxisLabel, updateIndicators]);

    useEffect(() => {
        updateReplayDataRef.current = updateReplayData;
    }, [updateReplayData]);

    const handleReplayPlayPause = () => {
        setIsPlaying(prev => !prev);
    };

    const handleReplayForward = () => {
        const currentIndex = replayIndexRef.current;
        if (currentIndex !== null && currentIndex < fullDataRef.current.length - 1) {
            const nextIndex = currentIndex + 1;
            setReplayIndex(nextIndex);
            updateReplayData(nextIndex);
        }
    };

    const handleReplayJumpTo = () => {
        setIsSelectingReplayPoint(true);
        setIsPlaying(false);

        if (mainSeriesRef.current && fullDataRef.current && fullDataRef.current.length > 0) {
            let currentVisibleRange = null;
            if (chartRef.current) {
                try {
                    const timeScale = chartRef.current.timeScale();
                    currentVisibleRange = timeScale.getVisibleRange();
                } catch (e) {
                    // Ignore errors
                }
            }

            const currentReplayIndex = replayIndexRef.current;

            dataRef.current = fullDataRef.current;
            const transformedData = transformData(fullDataRef.current, chartTypeRef.current);
            mainSeriesRef.current.setData(transformedData);
            updateIndicators(fullDataRef.current, indicators);

            setTimeout(() => {
                if (chartRef.current && fullDataRef.current && fullDataRef.current.length > 0) {
                    try {
                        const timeScale = chartRef.current.timeScale();

                        if (currentVisibleRange && currentVisibleRange.from && currentVisibleRange.to) {
                            timeScale.setVisibleRange(currentVisibleRange);
                        } else if (currentReplayIndex !== null && currentReplayIndex >= 0) {
                            const currentIndex = currentReplayIndex;
                            const currentTime = fullDataRef.current[currentIndex]?.time;

                            if (currentTime) {
                                const DEFAULT_VIEW_WINDOW = 200;
                                const startIndex = Math.max(0, currentIndex - DEFAULT_VIEW_WINDOW / 2);
                                const endIndex = Math.min(fullDataRef.current.length - 1, currentIndex + DEFAULT_VIEW_WINDOW / 2);

                                const startTime = fullDataRef.current[startIndex]?.time;
                                const endTime = fullDataRef.current[endIndex]?.time;

                                if (startTime && endTime) {
                                    timeScale.setVisibleRange({ from: startTime, to: endTime });
                                }
                            }
                        } else {
                            try {
                                timeScale.fitContent();
                            } catch (e) {
                                // Ignore
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to restore visible range in Jump to Bar:', e);
                    }
                }
            }, 50);
        }

        if (chartContainerRef.current) {
            chartContainerRef.current.style.cursor = 'crosshair';
        }
    };

    const handleSliderChange = useCallback((index, hideFuture = true) => {
        if (index >= 0 && index < fullDataRef.current.length) {
            if (isPlayingRef.current) {
                setIsPlaying(false);
                isPlayingRef.current = false;
                stopReplay();
            }

            setReplayIndex(index);
            updateReplayData(index, hideFuture);
        }
    }, [updateReplayData]);

    useEffect(() => {
        if (isPlaying && isReplayMode) {
            stopReplay();

            const currentIndex = replayIndexRef.current;
            if (currentIndex !== null) {
                updateReplayData(currentIndex, true);
            }

            const intervalMs = 1000 / replaySpeed;

            replayIntervalRef.current = setInterval(() => {
                const currentIndex = replayIndexRef.current;

                if (currentIndex === null || currentIndex >= fullDataRef.current.length - 1) {
                    setIsPlaying(false);
                    isPlayingRef.current = false;
                    return;
                }

                const nextIndex = currentIndex + 1;

                setReplayIndex(nextIndex);
                updateReplayData(nextIndex, true);
            }, intervalMs);
        } else {
            stopReplay();
        }
        return () => stopReplay();
    }, [isPlaying, isReplayMode, replaySpeed, updateReplayData]);

    useEffect(() => {
        if (!chartRef.current || !isReplayMode || isSelectingReplayPoint || isPlaying) return;
        if (!mainSeriesRef.current) return;

        const handleReplayClick = (param) => {
            if (!param) return;
            if (!fullDataRef.current || fullDataRef.current.length === 0) return;
            if (isSelectingReplayPoint) return;
            if (isPlayingRef.current) return;

            try {
                let clickedTime = null;

                if (param.time) {
                    clickedTime = param.time;
                } else if (param.point) {
                    const timeScale = chartRef.current.timeScale();
                    clickedTime = timeScale.coordinateToTime(param.point.x);
                }

                if (!clickedTime) return;

                let clickedIndex = -1;
                let minDiff = Infinity;

                for (let i = 0; i < fullDataRef.current.length; i++) {
                    const diff = Math.abs(fullDataRef.current[i].time - clickedTime);
                    if (diff < minDiff) {
                        minDiff = diff;
                        clickedIndex = i;
                    }
                }

                if (clickedIndex === -1) {
                    clickedIndex = fullDataRef.current.length - 1;
                }

                clickedIndex = Math.max(0, Math.min(clickedIndex, fullDataRef.current.length - 1));

                let currentVisibleRange = null;
                try {
                    const timeScale = chartRef.current.timeScale();
                    currentVisibleRange = timeScale.getVisibleRange();
                } catch (e) {
                    // Ignore
                }

                setReplayIndex(clickedIndex);
                replayIndexRef.current = clickedIndex;
                updateReplayData(clickedIndex, true);

                if (currentVisibleRange && chartRef.current) {
                    setTimeout(() => {
                        try {
                            const timeScale = chartRef.current.timeScale();
                            const clickedCandleTime = fullDataRef.current[clickedIndex]?.time;
                            if (clickedCandleTime && currentVisibleRange.to > clickedCandleTime) {
                                const rangeWidth = currentVisibleRange.to - currentVisibleRange.from;
                                const newTo = clickedCandleTime;
                                const newFrom = newTo - rangeWidth;
                                timeScale.setVisibleRange({ from: newFrom, to: newTo });
                            } else {
                                timeScale.setVisibleRange(currentVisibleRange);
                            }
                        } catch (e) {
                            // Ignore
                        }
                    }, 0);
                }
            } catch (e) {
                console.warn('Error handling replay click:', e);
            }
        };

        chartRef.current.subscribeClick(handleReplayClick);

        return () => {
            if (chartRef.current) {
                chartRef.current.unsubscribeClick(handleReplayClick);
            }
        };
    }, [isReplayMode, isSelectingReplayPoint, isPlaying, updateReplayData]);

    useEffect(() => {
        if (!chartRef.current || !isSelectingReplayPoint) return;
        if (!mainSeriesRef.current) return;

        const handleChartClick = (param) => {
            if (!param || !isSelectingReplayPoint) return;
            if (!fullDataRef.current || fullDataRef.current.length === 0) return;

            try {
                let clickedTime = null;

                if (param.time) {
                    clickedTime = param.time;
                } else if (param.point) {
                    const timeScale = chartRef.current.timeScale();
                    const x = param.point.x;
                    clickedTime = timeScale.coordinateToTime(x);
                }

                if (!clickedTime) return;

                let clickedIndex = fullDataRef.current.findIndex(d => d.time === clickedTime);

                if (clickedIndex === -1) {
                    let minDiff = Infinity;
                    fullDataRef.current.forEach((d, i) => {
                        const diff = Math.abs(d.time - clickedTime);
                        if (diff < minDiff) {
                            minDiff = diff;
                            clickedIndex = i;
                        }
                    });
                }

                clickedIndex = Math.max(0, Math.min(clickedIndex, fullDataRef.current.length - 1));

                if (clickedIndex >= 0 && clickedIndex < fullDataRef.current.length) {
                    const selectedIndex = clickedIndex;

                    let currentVisibleRange = null;
                    try {
                        const timeScale = chartRef.current.timeScale();
                        currentVisibleRange = timeScale.getVisibleRange();
                    } catch (e) {
                        // Ignore
                    }

                    let rangeWidth = null;
                    if (currentVisibleRange && currentVisibleRange.from && currentVisibleRange.to) {
                        rangeWidth = currentVisibleRange.to - currentVisibleRange.from;
                    }

                    setReplayIndex(selectedIndex);
                    replayIndexRef.current = selectedIndex;

                    const selectedTime = fullDataRef.current[selectedIndex]?.time;
                    let targetRange = null;

                    if (selectedTime && rangeWidth && rangeWidth > 0) {
                        const newFrom = selectedTime - rangeWidth / 2;
                        const newTo = selectedTime + rangeWidth / 2;

                        const firstTime = fullDataRef.current[0]?.time;
                        const lastAvailableTime = fullDataRef.current[selectedIndex]?.time;

                        if (firstTime && lastAvailableTime) {
                            let adjustedFrom = Math.max(firstTime, newFrom);
                            let adjustedTo = Math.min(lastAvailableTime, newTo);

                            if (adjustedFrom === firstTime && adjustedTo < newTo) {
                                adjustedTo = Math.min(lastAvailableTime, adjustedFrom + rangeWidth);
                            } else if (adjustedTo === lastAvailableTime && adjustedFrom > newFrom) {
                                adjustedFrom = Math.max(firstTime, adjustedTo - rangeWidth);
                            }

                            if (adjustedTo > adjustedFrom && (adjustedTo - adjustedFrom) >= rangeWidth * 0.3) {
                                targetRange = { from: adjustedFrom, to: adjustedTo };
                            }
                        }
                    }

                    if (!targetRange && selectedTime) {
                        const VIEW_WINDOW = 300;
                        const startIndex = Math.max(0, selectedIndex - VIEW_WINDOW / 2);
                        const endIndex = selectedIndex;
                        const startTime = fullDataRef.current[startIndex]?.time;
                        const endTime = fullDataRef.current[endIndex]?.time;
                        if (startTime && endTime) {
                            targetRange = { from: startTime, to: endTime };
                        }
                    }

                    updateReplayData(selectedIndex, true, false);

                    setIsSelectingReplayPoint(false);
                    if (chartContainerRef.current) {
                        chartContainerRef.current.style.cursor = 'default';
                    }

                    if (targetRange && chartRef.current) {
                        try {
                            const timeScale = chartRef.current.timeScale();
                            timeScale.setVisibleRange(targetRange);

                            setTimeout(() => {
                                if (chartRef.current) {
                                    try {
                                        chartRef.current.timeScale().setVisibleRange(targetRange);
                                    } catch (e) {
                                        // Ignore
                                    }
                                }
                            }, 10);

                            setTimeout(() => {
                                if (chartRef.current) {
                                    try {
                                        chartRef.current.timeScale().setVisibleRange(targetRange);
                                    } catch (e) {
                                        // Ignore
                                    }
                                }
                            }, 100);
                        } catch (e) {
                            console.warn('Failed to set visible range after selection:', e);
                        }
                    }
                }
            } catch (e) {
                console.warn('Error handling chart click in Jump to Bar:', e);
            }
        };

        chartRef.current.subscribeClick(handleChartClick);

        return () => {
            if (chartRef.current) {
                chartRef.current.unsubscribeClick(handleChartClick);
            }
        };
    }, [isSelectingReplayPoint, updateReplayData]);

    return (
        <div className={`${styles.chartWrapper} ${isToolbarVisible ? styles.toolbarVisible : ''}`}>
            <div
                id="container"
                ref={chartContainerRef}
                className={styles.chartContainer}
                style={{
                    position: 'relative',
                    touchAction: 'none'
                }}
            />
            
            <ChartOverlays 
                isLoading={isLoading} 
                isActuallyLoading={isActuallyLoadingRef.current} 
            />

            <ChartWatermark 
                showWatermark={showWatermark}
                watermarkText={watermarkText}
            />

            {/* OHLC Header Bar */}
            {ohlcData && (
                <div className={styles.ohlcHeader} style={{ left: isToolbarVisible ? '55px' : '10px' }}>
                    <span className={styles.ohlcSymbol}>{symbol} · {interval.toUpperCase()}</span>
                    <span className={`${styles.ohlcDot} ${ohlcData.isUp ? '' : styles.down}`}></span>
                    <div className={styles.ohlcValues}>
                        <span className={styles.ohlcItem}>
                            <span className={styles.ohlcLabel}>O</span>
                            <span className={styles.ohlcValue}>{ohlcData.open?.toFixed(2)}</span>
                        </span>
                        <span className={styles.ohlcItem}>
                            <span className={styles.ohlcLabel}>H</span>
                            <span className={styles.ohlcValue}>{ohlcData.high?.toFixed(2)}</span>
                        </span>
                        <span className={styles.ohlcItem}>
                            <span className={styles.ohlcLabel}>L</span>
                            <span className={styles.ohlcValue}>{ohlcData.low?.toFixed(2)}</span>
                        </span>
                        <span className={styles.ohlcItem}>
                            <span className={styles.ohlcLabel}>C</span>
                            <span className={`${styles.ohlcValue} ${ohlcData.isUp ? styles.up : styles.down}`}>{ohlcData.close?.toFixed(2)}</span>
                        </span>
                        <span className={styles.ohlcChange}>
                            <span className={`${styles.ohlcChangeValue} ${ohlcData.change >= 0 ? styles.up : styles.down}`}>
                                {ohlcData.change >= 0 ? '+' : ''}{ohlcData.change?.toFixed(2)} ({ohlcData.changePercent >= 0 ? '+' : ''}{ohlcData.changePercent?.toFixed(2)}%)
                            </span>
                        </span>
                    </div>
                </div>
            )}

            {/* Replay Controls */}
            {isReplayMode && (
                <ReplayControls
                    isPlaying={isPlaying}
                    speed={replaySpeed}
                    onPlayPause={handleReplayPlayPause}
                    onForward={handleReplayForward}
                    onJumpTo={handleReplayJumpTo}
                    onSpeedChange={setReplaySpeed}
                    onClose={() => {
                        setIsReplayMode(false);
                        if (onReplayModeChange) {
                            onReplayModeChange(false);
                        }
                        if (mainSeriesRef.current && fullDataRef.current.length > 0) {
                            dataRef.current = fullDataRef.current;
                            const transformedData = transformData(fullDataRef.current, chartTypeRef.current);
                            mainSeriesRef.current.setData(transformedData);
                            updateIndicators(fullDataRef.current, indicators);
                        }
                    }}
                />
            )}

            {/* Replay Slider */}
            {isReplayMode && (
                <ReplaySlider
                    chartRef={chartRef}
                    isReplayMode={isReplayMode}
                    replayIndex={replayIndex}
                    fullData={fullDataRef.current}
                    onSliderChange={handleSliderChange}
                    containerRef={chartContainerRef}
                    isSelectingReplayPoint={isSelectingReplayPoint}
                    isPlaying={isPlaying}
                />
            )}
        </div>
    );
});

export default ChartComponent;