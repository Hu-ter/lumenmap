"use client";

import { TREEMAP_VIEWS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { MetricSelector } from "@/components/dashboard/MetricSelector";

export function TreemapViewSelector() {
  const { treemapView, setTreemapView } = useDashboard();
  const activeView = TREEMAP_VIEWS.find((view) => view.id === treemapView);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <MetricSelector />
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-400">View</span>
          <div className="flex flex-wrap gap-2">
            {TREEMAP_VIEWS.map((view) => (
              <Button
                key={view.id}
                variant={treemapView === view.id ? "default" : "outline"}
                size="sm"
                onClick={() => setTreemapView(view.id)}
              >
                {view.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      {activeView ? (
        <p className="text-xs text-zinc-500">{activeView.description}</p>
      ) : null}
    </div>
  );
}

