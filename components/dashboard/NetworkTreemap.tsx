"use client";

import { useMemo, useState } from "react";
import { CATEGORY_COLORS } from "@/lib/constants";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { D3Treemap } from "@/components/dashboard/D3Treemap";
import { TreemapViewSelector } from "@/components/dashboard/TreemapViewSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { TreemapNode } from "@/lib/types";

const CATEGORY_LEGEND = [
  { key: "soroban", label: "Soroban" },
  { key: "payments", label: "Payments" },
  { key: "dex", label: "DEX" },
  { key: "trustlines", label: "Trustlines" },
  { key: "account", label: "Account Ops" },
  { key: "other", label: "Other" },
];

export function NetworkTreemap() {
  const {
    data,
    isLoading,
    isError,
    error,
    period,
    treemapView,
    setSelectedNode,
  } = useDashboard();

  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(
    new Set(),
  );

  const toggleCategory = (key: string) => {
    setExcludedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const resetFilters = () => {
    setExcludedCategories(new Set());
  };

  const activeTreemap = data?.treemaps[treemapView];

  const filteredTreemap = useMemo(() => {
    if (!activeTreemap) return activeTreemap;
    if (excludedCategories.size === 0) return activeTreemap;

    const filterNode = (node: TreemapNode): TreemapNode | null => {
      const category = node.meta?.category;

      if (category && excludedCategories.has(category)) {
        return null;
      }

      if (node.children && node.children.length > 0) {
        const filteredChildren = node.children
          .map(filterNode)
          .filter((child): child is TreemapNode => child !== null);

        if (filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }

        const val = node.value ?? node.meta?.opCount ?? 0;
        if (val === 0) return null;
      }

      const effectiveCategory = category || "other";
      if (excludedCategories.has(effectiveCategory)) {
        return null;
      }

      return node;
    };

    const newRoot = filterNode(activeTreemap);
    return newRoot || { ...activeTreemap, children: [], value: 0 };
  }, [activeTreemap, excludedCategories]);

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

  if (isError || !data || !filteredTreemap) {
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

  const isEmpty =
    !filteredTreemap.children || filteredTreemap.children.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div>
          <CardTitle>Network Treemap</CardTitle>
          <p className="text-xs text-zinc-500">
            Switch views to explore operation types or top accounts and
            contracts.
          </p>
        </div>
        <TreemapViewSelector />
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORY_LEGEND.map((item) => {
            const isExcluded = excludedCategories.has(item.key);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleCategory(item.key)}
                aria-pressed={!isExcluded}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
                  isExcluded
                    ? "border-transparent bg-white/5 text-zinc-500 opacity-50 hover:bg-white/10"
                    : "border-white/10 bg-white/10 text-zinc-300 hover:bg-white/20"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[item.key] }}
                />
                {item.label}
              </button>
            );
          })}
          {excludedCategories.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-6 px-2 text-xs text-zinc-400 hover:text-white"
            >
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div
          key={`${period}-${treemapView}-${excludedCategories.size}`}
          className="h-[420px] sm:h-[520px] lg:h-[600px] overflow-hidden rounded-xl border border-white/5 bg-black/20 p-2 sm:p-3"
        >
          {isEmpty ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              No categories selected.
            </div>
          ) : (
            <D3Treemap root={filteredTreemap} onSelect={setSelectedNode} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
