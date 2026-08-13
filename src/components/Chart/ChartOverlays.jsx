import React from 'react';
import styles from './ChartComponent.module.css';

/**
 * Component to handle various chart overlays (loading, errors, etc.)
 */
const ChartOverlays = ({ isLoading, isActuallyLoading }) => {
  if (!isLoading || !isActuallyLoading) return null;

  return (
    <div className={styles.loadingOverlay}>
      <div className={styles.spinner}></div>
      <div>Loading...</div>
    </div>
  );
};

export default ChartOverlays;
