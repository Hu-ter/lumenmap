"use client";

import { useMemo } from "react";
import { CATEGORY_COLORS } from "@/lib/constants";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { D3Treemap } from "@/components/dashboard/D3Treemap";
import { TreemapViewSelector } from "@/components/dashboard/TreemapViewSelector";
import { TreemapMetricSelector } from "@/components/dashboard/TreemapMetricSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { findTreemapPath } from "@/lib/search";

import type { TreemapNode } from "@/lib/types";

const CATEGORY_LEGEND = [
  { key: "soroban", label: "Soroban" },
  { key: "payments", label: "Payments" },
  { key: "dex", label: "DEX" },
  { key: "trustlines", label: "Trustlines" },
  { key: "account", label: "Account Ops" },
  { key: "other", label: "Other" },
];


function resolveFocusNavigation(
  root: TreemapNode,
  focusRequest: NonNullable<ReturnType<typeof useDashboard>["focusRequest"]>,
): { initialPath: TreemapNode[]; highlightKey: string | null } {
  const fullPath = findTreemapPath(root, focusRequest);
  if (!fullPath || fullPath.length < 2) {
    return { initialPath: [], highlightKey: null };
  }

  const matched = fullPath[fullPath.length - 1];
  const parentPath = fullPath.slice(1, -1);
  const highlightKey = matched.meta?.id ?? matched.id ?? matched.name;

  // Drill into category nodes; otherwise show the matched tile at its parent level.
  if (
    focusRequest.type === "category" &&
    matched.children &&
    matched.children.length > 0
  ) {
    return {
      initialPath: fullPath.slice(1),
      highlightKey,
    };
  }

  return {
    initialPath: parentPath,
    highlightKey,

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
    focusRequest,
  } = useDashboard();

  const activeTreemap = data?.treemaps[treemapView];

  const focusNavigation = useMemo(() => {
    if (!activeTreemap || !focusRequest) {
      return { initialPath: [] as TreemapNode[], highlightKey: null as string | null };
    }
    if (focusRequest.treemapView !== treemapView) {
      return { initialPath: [] as TreemapNode[], highlightKey: null as string | null };
    }
    return resolveFocusNavigation(activeTreemap, focusRequest);
  }, [activeTreemap, focusRequest, treemapView]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network Treemap</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[520px] w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data || !activeTreemap) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network Treemap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[360px] items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-200">
            {error?.message ?? "Unable to load treemap data."}
          </div>
        </CardContent>
      </Card>
    );
  }



  const treemapKey = [
    period,
    treemapView,
    focusRequest?.key ?? "none",
  ].join(":");

  const activeTreemap = metric === "xlm_volume"

  const activePayload = metric === "xlm_volume"

    ? data.treemaps[`xlm_${treemapView}` as keyof typeof data.treemaps]
    : data.treemaps[treemapView];
  const activeTreemap = toChartNode(activePayload);


  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div>
          <CardTitle>Network Treemap</CardTitle>
          <p className="text-xs text-zinc-500">
            Switch views to explore operation types or top accounts and
            contracts. Use search to jump to a known identity.
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

        <div className="h-[420px] sm:h-[520px] lg:h-[600px] overflow-hidden rounded-xl border border-white/5 bg-black/20 p-2 sm:p-3">
          <D3Treemap
            key={treemapKey}
            root={activeTreemap}
            onSelect={setSelectedNode}
            initialPath={focusNavigation.initialPath}
            highlightKey={focusNavigation.highlightKey}
          />

        <div
          key={`${period}-${treemapView}-${metric}`}
          className="h-[420px] sm:h-[520px] lg:h-[600px] overflow-hidden rounded-xl border border-white/5 bg-black/20 p-2 sm:p-3"
        >
          {activeTreemap.children && activeTreemap.children.length > 0 ? (
            <D3Treemap root={activeTreemap} onSelect={setSelectedNode} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              No data for this metric and view combination.
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
}
