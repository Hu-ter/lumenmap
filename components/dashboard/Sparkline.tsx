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

function buildPath(points: Point[]): string {
  return points
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
}

function SparklineSkeleton({ height, className = '' }: Pick<SparklineProps, 'height' | 'className'>) {
  const style = height ? { height } : undefined;
  return (
    <div
      className={`data-sparkline data-sparkline--skeleton ${className}`}
      style={style}
      role="status"
      aria-label="Loading sparkline"
    />
  );
}

export function Sparkline({
  data,
  height,
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
  const points = computePoints(data, width, height ?? 24);
  const d = buildPath(points);
  const style = height ? { height } : undefined;

  return (
    <div className={`data-sparkline ${className}`} style={style}>
      <svg
        viewBox={`0 0 ${width} ${height ?? 24}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
        role="img"
        aria-label="Sparkline"
      >
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
