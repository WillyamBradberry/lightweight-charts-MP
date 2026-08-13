/**
 * Builder for chart options object
 */
export const buildChartOptions = (theme, magnetMode) => {
  return {
    layout: {
      textColor: theme === 'dark' ? '#D1D4DC' : '#131722',
      background: { color: theme === 'dark' ? '#131722' : '#ffffff' },
    },
    grid: {
      vertLines: { color: theme === 'dark' ? '#2A2E39' : '#e0e3eb' },
      horzLines: { color: theme === 'dark' ? '#2A2E39' : '#e0e3eb' },
    },
    crosshair: {
      mode: magnetMode ? 1 : 0,
      vertLine: {
        width: 1,
        color: theme === 'dark' ? '#758696' : '#9598a1',
        style: 3,
        labelBackgroundColor: theme === 'dark' ? '#758696' : '#9598a1',
      },
      horzLine: {
        width: 1,
        color: theme === 'dark' ? '#758696' : '#9598a1',
        style: 3,
        labelBackgroundColor: theme === 'dark' ? '#758696' : '#9598a1',
      },
    },
    timeScale: {
      borderColor: theme === 'dark' ? '#2A2E39' : '#e0e3eb',
      timeVisible: true,
    },
    rightPriceScale: {
      borderColor: theme === 'dark' ? '#2A2E39' : '#e0e3eb',
    },
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
    },
    handleScale: {
      mouseWheel: true,
      pinch: true,
    },
  };
};
