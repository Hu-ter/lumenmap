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
import { Sparkline } from "./Sparkline";

const KPI_CONFIG = [
  {
    key: "totalOps" as const satisfies KpiMetricId,
    icon: Activity,
    format: (value: number) => formatNumber(value),
    numeric: true,
  },
  {
    key: "sorobanShare" as const satisfies KpiMetricId,
    icon: Zap,
    format: (value: number) => formatPercent(value),
    numeric: true,
  },
  {
    key: "topCategory" as const satisfies KpiMetricId,
    icon: Layers,
    format: (value: string) => value,
    numeric: false,
  },
  {
    key: "activeContracts" as const satisfies KpiMetricId,
    icon: Boxes,
    format: (value: number) => formatNumber(value),
    numeric: true,
  },
  {
    key: "activeWallets" as const satisfies KpiMetricId,
    icon: Wallet,
    format: (value: number) => formatNumber(value),
    numeric: true,
  },
  {
    key: "activeDestinationAccounts" as const satisfies KpiMetricId,
    icon: ArrowDown,
    format: (value: number) => formatNumber(value),
    numeric: true,
  },
];

const SERIES_EXTRACTOR: Partial<
  Record<KpiMetricId, (point: any) => number>
> = {
  totalOps: (point) => Number(point.totalOperations ?? point.operations ?< 0),
  sorobanShare: (point) => {
    const ops = Number(point.totalOperations ?? point.operations ?? 0);
    const soroban = Number(point.sorobanOperations ?? point.soroban ?? 0);
    if (ops === 0) return 0;
    return (soroban / ops) * 100;
  },
};

function getSeries(data: any, key: KpiMetricId): number[] | undefined {
  if (!data?.timeseries) return undefined;
  const source = Array.isArray(data.timeseries)
    ? data.timeseries
    : data.timeseries?.buckets;
  if (!Array.isArray(source)) return undefined;
  const extract = SERIES_EXTRACTOR[key];
  if (!extract) return undefined;
  const series = source
    .map(extract)
    .filter((v: any): v is number => typeof v === "number" && Number.isFinite(v));
  return series.length > 1 ? series : undefined;
}

export function KpiCards() {
  const { data, isLoading } = useDashboard();
  const freshnessState = classifyFreshness(data?.sourceTimestamp);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 lg:gap-4"
        aria-busy="true"
      >
        {KPI_CONFIG.map((item) => (
          <Card key={item.key}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-4 w-24 max-w-full" />
                <Skeleton className="h-4 w-16 max-w-full sm:hidden" />
              </div>
              <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 max-w-full" />
              {item.numeric ? (
                METRIC_DEFINITIONS[item.key].sparkline ? (
                  <Sparkline loading />
                ) : (
                  <Skeleton className="mt-2 h-6 w-full max-w-[120px]" />
                )
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
            <CardHeader className="flex-row items-start justify-between space-y-0 gp-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <CardTitle>{metric.title}</CardTitle>
                <MetricInfo metric={metric} />
              </div>
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-surface-accent" />
            </CardHeader>
            <CardContent>
              <p
                data-testide={`value-${item.key}}
                className="text-2xl font-semibold text-text-primary"
              >
                {item.format(value as never)}
              </p>
              {freshnessState === "stale" ? (
                <p className="mt-0.5 text-xs font-medium text-amber-400">
                  (stale)
                </p>
              ) : null}
              {metric.sparkline && series ? <Sparkline data={series} /> : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
