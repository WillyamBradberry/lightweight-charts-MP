import React from 'react';

/**
 * Component to display a watermark on top of the chart
 */
const ChartWatermark = ({ 
  showWatermark = false, 
  watermarkText = 'MP Charts', 
  watermarkColor = 'rgba(255, 255, 255, 0.1)' 
}) => {
  if (!showWatermark) return null;

  const style = {
    position: 'absolute',
    bottom: '50px',
    right: '50px',
    zIndex: 2,
    fontSize: '48px',
    fontWeight: 'bold',
    color: watermarkColor,
    pointerEvents: 'none',
    userSelect: 'none',
    textTransform: 'uppercase',
  };

  return (
    <div style={style}>
      {watermarkText}
    </div>
  );
};

export default ChartWatermark;
