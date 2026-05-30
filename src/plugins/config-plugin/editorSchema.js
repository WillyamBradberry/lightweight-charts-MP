// src/plugins/config-plugin/editorSchema.js
export const editorSchema = {
  // ─── Features ───
  features: {
    drawingTools: {
      label: 'Drawing Tools',
      icon: 'Pencil',
      enabled: true,
      configurable: true,
      subFeatures: {
        trendline: { label: 'Trend Line', enabled: true },
        fibonacci: { label: 'Fibonacci', enabled: true },
        rectangle: { label: 'Rectangle', enabled: true },
        text: { label: 'Text', enabled: true },
        // ... 40+ tools
      }
    },
    alerts: {
      label: 'Price Alerts',
      icon: 'Bell',
      enabled: true,
      configurable: true,
      options: {
        maxCount: { type: 'number', default: 50, min: 1, max: 200 },
        soundEnabled: { type: 'boolean', default: true },
        retentionHours: { type: 'number', default: 24 }
      }
    },
    replay: {
      label: 'Bar Replay',
      icon: 'PlayCircle',
      enabled: true,
      configurable: true
    },
    indicators: {
      label: 'Indicators',
      icon: 'Activity',
      enabled: true,
      configurable: true,
      subFeatures: {
        sma: { label: 'SMA', enabled: true, options: { period: 20 } },
        ema: { label: 'EMA', enabled: true, options: { period: 50 } }
      }
    },
    watchlist: {
      label: 'Watchlist',
      icon: 'List',
      enabled: true,
      configurable: false  // всегда включен
    }
  },

  // ─── Styles (Theme Editor) ───
  styles: {
    chart: {
      background: { type: 'color', default: '#131722' },
      gridLines: { type: 'color', default: '#2A2E39' },
      textColor: { type: 'color', default: '#D1D4DC' },
      crosshair: { type: 'color', default: '#758696' },
      // ...
    },
    tools: {
      trendLine: {
        lineColor: { type: 'color', default: 'rgb(0,0,0)' },
        width: { type: 'range', default: 2, min: 1, max: 10 },
        lineStyle: { type: 'select', options: ['solid','dotted','dashed'], default: 'solid' }
      },
      horizontalLine: {
        lineColor: { type: 'color', default: '#2962FF' },
        width: { type: 'range', default: 2, min: 1, max: 10 }
      },
      // ... per-tool styles
    },
    alerts: {
      lineColor: { type: 'color', default: '#131722' },
      lineWidth: { type: 'range', default: 1, min: 1, max: 5 },
      iconBadge: { type: 'color', default: '#131722' },
      hoverLabelBg: { type: 'color', default: '#FFFFFF' },
      // ...
    }
  },

  // ─── Behaviors ───
  behaviors: {
    magnetMode: { type: 'boolean', default: false },
    autoSave: { type: 'select', options: ['off','5s','30s','1m'], default: '30s' },
    confirmDelete: { type: 'boolean', default: true },
    keyboardShortcuts: { type: 'boolean', default: true },
    rightClickCancel: { type: 'boolean', default: true }
  }
};