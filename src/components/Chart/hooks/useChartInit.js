import { useEffect, useState, useRef } from 'react';
import { createChart } from 'lightweight-charts';

/**
 * Hook to initialize and manage the Lightweight Chart instance
 *
 * @param {React.RefObject} containerRef - Reference to the div element that will contain the chart
 * @param {Object} options - Initial chart configuration options
 * @returns {Object} { chartInstance, isReady }
 */
export const useChartInit = (containerRef, options = {}) => {
  const [chartInstance, setChartInstance] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize chart
    const chart = createChart(containerRef.current, options);
    chartInstanceRef.current = chart;
    setChartInstance(chart);
    setIsReady(true);

    // Initial resize to fit container
    const handleResize = () => {
      if (containerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    // Use ResizeObserver for more reliable sizing
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    // Trigger initial resize
    handleResize();

    return () => {
      resizeObserver.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
      setChartInstance(null);
      setIsReady(false);
    };
  }, [containerRef]); // Only re-run if container element changes

  return {
    chartInstance,
    isReady
  };
};
