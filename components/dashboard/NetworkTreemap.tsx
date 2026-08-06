"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/constants";
import { PATTERN_DEFS, PATTERN_OPACITY, getCategoryPatternId } from "@/lib/treemap-patterns";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { D3Treemap } from "@/components/dashboard/D3Treemap";
import { TreemapViewSelector } from "@/components/dashboard/TreemapViewSelector";
import { TreemapMetricSelector } from "@/components/dashboard/TreemapMetricSelector";
import { Button } from "@/components/ui/button";
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
    isFetching,
    error,
    refetch,
    period,
    treemapView,
    metric,
    setSelectedNode,
  } = useDashboard();
  const [isRetrying, setIsRetrying] = useState(false);
  const retryPending = isRetrying || isFetching;

  const handleRetry = async () => {
    if (retryPending) {
      return;
    }
    setIsRetrying(true);
    try {
      await refetch();
    } finally {
      setIsRetrying(false);
    }
  };

  const activePayload = data
    ? metric === "xlm_volume"
      ? data.treemaps[`xlm_${treemapView}` as keyof typeof data.treemaps]
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
          {/* Inject pattern defs so legend swatches can reference them */}
          <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
            <defs>
              {PATTERN_DEFS.map((p) => (
                <pattern
                  key={p.id}
                  id={p.id}
                  x="0"
                  y="0"
                  width={p.width}
                  height={p.height}
                  patternUnits="userSpaceOnUse"
                  patternTransform={p.patternTransform}
                >
                  {p.shapes.map((shape, i) =>
                    shape.type === "circle" ? (
                      <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} fill={shape.fill} />
                    ) : (
                      <line key={i} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />
                    )
                  )}
                </pattern>
              ))}
            </defs>
          </svg>
          {CATEGORY_LEGEND.map((item) => {
            const patternId = getCategoryPatternId(item.key);
            return (
              <span
                key={item.key}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300"
              >
                {/* Compound swatch: color fill + pattern overlay */}
                <svg
                  width="14"
                  height="14"
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                >
                  <rect
                    width="14"
                    height="14"
                    rx="3"
                    fill={CATEGORY_COLORS[item.key]}
                  />
                  {patternId ? (
                    <rect
                      width="14"
                      height="14"
                      rx="3"
                      fill={`url(#${patternId})`}
                      opacity={PATTERN_OPACITY}
                    />
                  ) : null}
                </svg>
                {item.label}
              </span>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className={CHART_FRAME_CLASS}>
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        ) : isError || !data || !activeTreemap ? (
          <div className="flex h-[420px] flex-col items-center justify-center gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-200 sm:h-[520px] lg:h-[600px]">
            <p role="alert">{error?.message ?? "Unable to load treemap data."}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={retryPending}
              aria-busy={retryPending}
              aria-label={
                retryPending
                  ? "Retrying network activity data"
                  : "Retry loading network activity data"
              }
              className="gap-2 border-red-500/30 text-red-100 hover:bg-red-500/10"
            >
              <RefreshCw
                className={`h-4 w-4 ${retryPending ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              {retryPending ? "Retrying…" : "Retry"}
            </Button>
          </div>
        ) : (
          <div key={`${period}-${treemapView}-${metric}`} className={CHART_FRAME_CLASS}>
            {activeTreemap.children && activeTreemap.children.length > 0 ? (
              <D3Treemap root={activeTreemap} onSelect={setSelectedNode} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                No data for this metric and view combination.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
