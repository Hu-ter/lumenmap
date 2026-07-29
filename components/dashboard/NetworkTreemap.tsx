"use client";

import { CATEGORY_COLORS } from "@/lib/constants";
import { PATTERN_DEFS, PATTERN_OPACITY, getCategoryPatternId } from "@/lib/treemap-patterns";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { D3Treemap } from "@/components/dashboard/D3Treemap";
import { TreemapViewSelector } from "@/components/dashboard/TreemapViewSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

  if (isError || !data) {
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

  const activeTreemap = data.treemaps[treemapView];

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
        <div
          key={`${period}-${treemapView}`}
          className="h-[420px] sm:h-[520px] lg:h-[600px] overflow-hidden rounded-xl border border-white/5 bg-black/20 p-2 sm:p-3"
        >
          <D3Treemap root={activeTreemap} onSelect={setSelectedNode} />
        </div>
      </CardContent>
    </Card>
  );
}
