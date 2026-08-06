"use client";

import { CATEGORY_COLORS } from "@/lib/constants";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { D3Treemap } from "@/components/dashboard/D3Treemap";
import { TreemapViewSelector } from "@/components/dashboard/TreemapViewSelector";
import { TreemapMetricSelector } from "@/components/dashboard/TreemapMetricSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TreemapNode } from "@/lib/types";

const CATEGORY_LEGEND = [
  { key: "soroban", label: "Soroban" },
  { key: "payments", label: "Payments" },
  { key: "dex", label: "DEX" },
  { key: "trustlines", label: "Trustlines" },
  { key: "account", label: "Account Ops" },
  { key: "other", label: "Other" },
];

// Shared with the loading skeleton so reserved space matches the rendered
// chart at every breakpoint.
const CHART_FRAME_CLASS =
  "h-[420px] sm:h-[520px] lg:h-[600px] overflow-x-auto overflow-y-hidden rounded-xl border border-white/5 bg-black/20 p-2 sm:p-3";

function toChartNode(node: TreemapNode<number | string>): TreemapNode {
  const { value, children, ...rest } = node;
  return {
    ...rest,
    ...(value !== undefined ? { value: Number(value) } : {}),
    ...(children
      ? { children: children.map(toChartNode) }
      : {}),
  };
}

export function NetworkTreemap() {
  const {
    data,
    isLoading,
    isError,
    error,
    period,
    treemapView,
    metric,
    setSelectedNode,
  } = useDashboard();

  const activePayload = data
    ? metric === "xlm_volume"
      ? data.treemaps[`xlm_${treemapView}` as keyof typeof data.treemaps]
      : metric === "usdc"
        ? data.treemaps[`usdc_${treemapView}` as keyof typeof data.treemaps]
        : data.treemaps[treemapView]
    : null;
  const activeTreemap = activePayload ? toChartNode(activePayload) : null;

  return (
    <Card aria-busy={isLoading || undefined}>
      <CardHeader className="flex flex-col gap-4">
        <div>
          <CardTitle>Network Treemap</CardTitle>
          <p className="text-xs text-zinc-500">
            Switch views to explore operation types or top accounts and
            contracts.
          </p>
        </div>
        <TreemapViewSelector />
        <TreemapMetricSelector />
        <div className="flex flex-wrap gap-2">
          {CATEGORY_LEGEND.map((item) => (
            <span
              key={item.key}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[item.key] }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className={CHART_FRAME_CLASS}>
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        ) : isError || !data || !activeTreemap ? (
          <div className="flex h-[420px] items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-200 sm:h-[520px] lg:h-[600px]">
            {error?.message ?? "Unable to load treemap data."}
          </div>
        ) : (
          <div key={`${period}-${treemapView}-${metric}`} className={CHART_FRAME_CLASS}>
            {activeTreemap.children && activeTreemap.children.length > 0 ? (
              <D3Treemap root={activeTreemap} onSelect={setSelectedNode} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center text-sm text-zinc-500">
                <p className="font-medium text-zinc-300">
                  {metric === "usdc"
                    ? "No USDC payment volume recorded for this period."
                    : "No data for this metric and view combination."}
                </p>
                {metric === "usdc" ? (
                  <p className="text-xs text-zinc-500">
                    Try selecting a different time range or metric option.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
