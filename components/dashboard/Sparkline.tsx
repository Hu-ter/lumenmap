import * as React from 'react';

export interface SparklineProps {
  data?: number[] | null;
  height?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  loading?: boolean;
}

interface Point {
  x: number;
  y: number;
}

function computePoints(data: number[], width: number, height: number): Point[] {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const padding = 2;
  const innerHeight = Math.max(2, height - padding * 2);
  return data.map((value, i) => {
    const x = i * stepX;
    const y = padding + ((max - value) / range) * innerHeight;
    return { x, y };
  });
}

function SparklineSkeleton({ height = 32, className = '' }: Pick<SparklineProps, 'height' | 'className'>) {
  return (
    <div
      className={`animate-pulse motion-reduce:animate-none rounded bg-gray-200 dark:bg-gray-800 ${className}`}
      style={{ height, width: '100%' }}
      role="status"
      aria-label="Loading sparkline"
    />
  );
}

export function Sparkline({
  data,
  height = 32,
  color = 'currentColor',
  strokeWidth = 1.5,
  className = '',
  loading = false,
}: SparklineProps) {
  if (loading && (!data || data.length === 0)) {
    return <SparklineSkeleton height={height} className={className} />;
  }

  if (!data || data.length < 2) return null;

  const width = 100; // viewBox coordinate space; actual svg stretches via preserveAspectRatio="none"
  const points = computePoints(data, width, height);
  const pointsString = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
      role="img"
      aria-label="Sparkline"
    >
      <polyline
        points={pointsString}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
