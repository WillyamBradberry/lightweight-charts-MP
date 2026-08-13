import { useRef } from 'react';
import { useChartInit } from './useChartInit';
import { useChartOptions } from './useChartOptions';
import { useChartResize } from './useChartResize';
import { useChartEvents } from './useChartEvents';
import { useWatermark } from './useWatermark';

/**
 * Main unifying hook for chart logic
 * 
 * @param {React.RefObject} containerRef - Reference to the chart container div
 * @param {Object} props - Chart configuration props
 * @returns {Object} { chartInstance, isReady }
 */
export const useChart = (containerRef, props) => {
  const { theme, magnetMode, watermarkConfig } = props;

  // 1. Initialize Chart
  const { chartInstance, isReady } = useChartInit(containerRef);

  // 2. Manage Options (Theme, Magnet mode, etc.)
  useChartOptions(chartInstance, { theme, magnetMode });

  // 3. Handle Resize (Handled inside useChartInit via ResizeObserver, 
  // but could be expanded here if needed)
  useChartResize(chartInstance, containerRef);

  // 4. Handle Events (Crosshair, Click, etc.)
  useChartEvents(chartInstance, props);

  // 5. Handle Watermark
  useWatermark(chartInstance, watermarkConfig);

  return {
    chartInstance,
    isReady
  };
};
