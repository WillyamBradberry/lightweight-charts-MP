import { useMemo, useEffect } from 'react';
import { buildChartOptions } from '../builders/chartOptionsBuilder';

/**
 * Hook to manage chart options and apply them to the chart instance
 * 
 * @param {Object} chartInstance - The Lightweight Chart instance
 * @param {Object} props - Component props containing theme, magnetMode, etc.
 * @returns {Object} currentOptions
 */
export const useChartOptions = (chartInstance, { theme, magnetMode }) => {
  const options = useMemo(() => buildChartOptions(theme, magnetMode), [theme, magnetMode]);

  useEffect(() => {
    if (chartInstance) {
      chartInstance.applyOptions(options);
    }
  }, [chartInstance, options]);

  return options;
};
