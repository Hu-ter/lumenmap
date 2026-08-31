"use client";

import { Activity, Boxes, Layers, Wallet, Zap, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricInfo } from "@/components/metrics/MetricInfo";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { classifyFreshness } from "@/lib/freshness";
import {
  METRIC_DEFINITIONS,
  type KpiMetricId,
} from "@/lib/metrics/definitions";
import { formatNumber, formatPercent } from "@/lib/utils";

const KPI_CONFIG = [
  {
    key: "totalOps" as const satisfies KpiMetricId,
    icon: Activity,
    format: (value: number) => formatNumber(value),
  },
  {
    key: "sorobanShare" as const satisfies KpiMetricId,
    icon: Zap,
    format: (value: number) => formatPercent(value),
  },
  {
    key: "topCategory" as const satisfies KpiMetricId,
    icon: Layers,
    format: (value: string) => value,
  },
  {
    key: "activeContracts" as const satisfies KpiMetricId,
    icon: Boxes,
    format: (value: number) => formatNumber(value),
  },
  {
    key: "activeWallets" as const satisfies KpiMetricId,
    icon: Wallet,
    format: (value: number) => formatNumber(value),
  },
  {
    key: "activeDestinationAccounts" as const satisfies KpiMetricId,
    icon: ArrowDown,
    format: (value: number) => formatNumber(value),
  },
];


function getSeries(data: any, key: string): number[] | undefined {
  if (!data?.timeseries || !Array.isArray(data.timeseries)) return undefined;
  const series = data.timeseries
    .map((point: any) => point?.[key])
    .filter((v: any): v is number => typeof v === "number" && Number.isFinite(v));
  return series.length > 1 ? series : undefined;
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const width = 100;
  const height = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Trend"
      className="mt-2"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KpiCards() {
  const { data, isLoading } = useDashboard();
  const freshnessState = classifyFreshness(data?.sourceTimestamp);

  if (isLoading || !data) {
    return (
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 lg:gap-4"
        aria-busy="true"
      >
        {KPI_CONFIG.map((item) => (
          <Card key={item.key}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              {/* Titles wrap to two lines in the narrow mobile columns, so the
                  skeleton reserves the same number of lines per breakpoint. */}
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-4 w-24 max-w-full" />
                <Skeleton className="h-4 w-16 max-w-full sm:hidden" />
              </div>
              <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 max-w-full" />
              {["totalOps", "sorobanShare"].includes(item.key) ? (
                <Skeleton className="mt-2 h-6 w-full max-w-[120px]" />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 lg:gap-4">
      {KPI_CONFIG.map((item) => {
        const Icon = item.icon;
        const metric = METRIC_DEFINITIONS[item.key];
        const kpi = data.kpis[item.key];
        const value = typeof kpi === "string" ? kpi : kpi.value;
        const series = getSeries(data, item.key);

        return (
          <Card key={item.key}>
            <CardHeader className="flex-row items-start justify-between space-y-0 gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <CardTitle>{metric.title}</CardTitle>
                <MetricInfo metric={metric} />
              </div>
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-surface-accent" />
            </CardHeader>
            <CardContent>
              <p
                data-testid={`kpi-value-${item.key}`}
                className="text-2xl font-semibold text-text-primary"
              >
                {item.format(value as never)}
              </p>
              {freshnessState === "stale" ? (
                <p className="mt-0.5 text-xs font-medium text-amber-400">
                  (stale)
                </p>
              ) : null}
              {series ? <Sparkline data={series} /> : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
