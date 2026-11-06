'use client';

import * as React from 'react';

export interface ChartColors {
  accent: string;
  info: string;
  warning: string;
  success: string;
  danger: string;
  grid: string;
  axis: string;
  surface: string;
  text: string;
  /** Categorical ramp, distinct in lightness as well as hue so it survives colour blindness. */
  series: string[];
  /** Task status keeps one meaning everywhere: done is positive, review is caution. */
  status: Record<string, string>;
}

const FALLBACK: ChartColors = {
  accent: '#14624f',
  info: '#235fa8',
  warning: '#9a5b00',
  success: '#1b7a4b',
  danger: '#b23a2e',
  grid: '#e2e3de',
  axis: '#5a605c',
  surface: '#ffffff',
  text: '#191c1a',
  series: ['#14624f', '#235fa8', '#9a5b00', '#7a8b84', '#4a6fa5', '#6b8f7f'],
  status: { BACKLOG: '#7a8b84', TODO: '#235fa8', IN_PROGRESS: '#14624f', REVIEW: '#9a5b00', DONE: '#1b7a4b', CANCELLED: '#b23a2e' },
};

function read(): ChartColors {
  if (typeof window === 'undefined') return FALLBACK;
  const style = getComputedStyle(document.documentElement);
  const rgb = (name: string, fallback: string) => {
    const raw = style.getPropertyValue(name).trim();
    return raw ? `rgb(${raw})` : fallback;
  };
  const accent = rgb('--accent', FALLBACK.accent);
  const info = rgb('--info', FALLBACK.info);
  const warning = rgb('--warning', FALLBACK.warning);
  const success = rgb('--success', FALLBACK.success);
  const danger = rgb('--danger', FALLBACK.danger);
  return {
    accent,
    info,
    warning,
    success,
    danger,
    grid: rgb('--border', FALLBACK.grid),
    axis: rgb('--text-muted', FALLBACK.axis),
    surface: rgb('--surface', FALLBACK.surface),
    text: rgb('--text', FALLBACK.text),
    series: [accent, info, warning, rgb('--text-faint', '#7a8b84'), rgb('--info', info), success],
    status: {
      BACKLOG: rgb('--text-faint', '#7a8b84'),
      TODO: info,
      IN_PROGRESS: accent,
      REVIEW: warning,
      DONE: success,
      CANCELLED: danger,
    },
  };
}

/**
 * Charts are SVG, so they need resolved colour values rather than class names. This reads the
 * design tokens and re-reads them whenever the theme flips, which keeps charts in step with the
 * rest of the UI in dark mode instead of leaving light-mode gridlines on a dark panel.
 */
export function useChartColors(): ChartColors {
  const [colors, setColors] = React.useState<ChartColors>(FALLBACK);

  React.useEffect(() => {
    setColors(read());
    const observer = new MutationObserver(() => setColors(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return colors;
}
