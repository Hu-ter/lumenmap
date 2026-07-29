"use client";

import { TREEMAP_METRICS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard/DashboardProvider";

export function MetricSelector() {
  const { metric, setMetric } = useDashboard();

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-400">Metric</span>
      <div className="flex flex-wrap gap-2">
        {TREEMAP_METRICS.map((item) => (
          <Button
            key={item.id}
            variant={metric === item.id ? "default" : "outline"}
            size="sm"
            onClick={() => setMetric(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
