"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, HelpCircle, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { formatNumber } from "@/lib/utils";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function ActivityHeatmap() {
  const { data, isLoading, isError, error, metric } = useDashboard();
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);

  const buckets = data?.heatmap?.buckets ?? [];

  // Compute max value for color scaling
  const maxVal = useMemo(() => {
    let max = 0;
    for (const b of buckets) {
      const val = metric === "transactions" || metric === "txn_events" || metric === "txn_actors" ? b.transactions : b.operations;
      if (val > max) max = val;
    }
    return max;
  }, [buckets, metric]);

  const hasData = buckets.length > 0 && maxVal > 0;

  if (isLoading) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="pt-4">
          <Skeleton className="h-[260px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-red-950/40 bg-zinc-900/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium text-red-400">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Activity Heatmap Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <p className="text-sm text-zinc-400">
            {error instanceof Error
              ? error.message
              : "Unable to load heatmap data."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeMetricLabel = metric === "transactions" || metric === "txn_events" || metric === "txn_actors" ? "Transactions" : "Operations";
  
  // Calculate cell color based on intensity
  const getCellColor = (val: number) => {
    if (val === 0) return "bg-zinc-800/40";
    const intensity = Math.max(0.1, val / maxVal);
    // Cyan color scale based on intensity
    if (intensity < 0.2) return "bg-cyan-900/40";
    if (intensity < 0.4) return "bg-cyan-800/60";
    if (intensity < 0.6) return "bg-cyan-700/80";
    if (intensity < 0.8) return "bg-cyan-600";
    return "bg-cyan-400";
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
            <Activity className="h-5 w-5 text-cyan-400" />
            Hour-of-Week Activity Heatmap
          </CardTitle>
          <p className="text-xs text-zinc-400">
            Activity patterns across a 7×24 grid for the selected period.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Legend ({activeMetricLabel}):</span>
            <div className="flex gap-1">
              <div className="h-3 w-3 rounded-sm bg-zinc-800/40" title="0" />
              <div className="h-3 w-3 rounded-sm bg-cyan-900/40" title="Low" />
              <div className="h-3 w-3 rounded-sm bg-cyan-800/60" />
              <div className="h-3 w-3 rounded-sm bg-cyan-700/80" />
              <div className="h-3 w-3 rounded-sm bg-cyan-600" />
              <div className="h-3 w-3 rounded-sm bg-cyan-400" title="High" />
            </div>
            <span className="text-zinc-500 ml-1">(UTC basis)</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {!hasData ? (
          <div className="flex h-[240px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 text-center">
            <HelpCircle className="h-8 w-8 text-zinc-500" />
            <p className="text-sm text-zinc-400">No activity recorded to generate heatmap.</p>
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto pb-4">
            <div className="min-w-[700px]">
              {/* Screen reader table fallback */}
              <table className="sr-only">
                <caption>Hour-of-week activity heatmap data (UTC)</caption>
                <thead>
                  <tr>
                    <th>Day</th>
                    {HOURS.map(h => <th key={h}>{h}:00</th>)}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((dayName, d) => (
                    <tr key={d}>
                      <td>{dayName}</td>
                      {HOURS.map(h => {
                        const b = buckets.find(b => b.dayOfWeek === d && b.hourOfDay === h);
                        const val = b ? (activeMetricLabel === "Transactions" ? b.transactions : b.operations) : 0;
                        return <td key={h}>{val} {activeMetricLabel}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Visual Heatmap Grid */}
              <div className="flex flex-col gap-1 select-none" aria-hidden="true">
                {/* Column Headers (Hours) */}
                <div className="flex ml-12 mb-1">
                  {HOURS.map(h => (
                    <div key={h} className="flex-1 text-center text-[10px] text-zinc-500">
                      {h % 2 === 0 ? h : ""}
                    </div>
                  ))}
                </div>

                {/* Rows (Days) */}
                {DAYS.map((dayName, d) => (
                  <div key={d} className="flex items-center gap-1 group">
                    <div className="w-11 text-[10px] font-medium text-zinc-400 text-right pr-2">
                      {dayName.slice(0, 3)}
                    </div>
                    <div className="flex flex-1 gap-1">
                      {HOURS.map(h => {
                        const b = buckets.find(b => b.dayOfWeek === d && b.hourOfDay === h);
                        const val = b ? (activeMetricLabel === "Transactions" ? b.transactions : b.operations) : 0;
                        const isHovered = hoveredCell?.day === d && hoveredCell?.hour === h;
                        
                        return (
                          <div 
                            key={h} 
                            className="relative flex-1 aspect-square min-w-[20px]"
                            onMouseEnter={() => setHoveredCell({ day: d, hour: h })}
                            onMouseLeave={() => setHoveredCell(null)}
                          >
                            <div 
                              className={`w-full h-full rounded-sm transition-colors duration-150 border ${isHovered ? 'border-zinc-300 z-10 scale-110' : 'border-transparent'} ${getCellColor(val)}`} 
                            />
                            {/* Tooltip */}
                            {isHovered && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                                <div className="flex flex-col gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-xl min-w-max">
                                  <div className="font-medium text-zinc-300 border-b border-zinc-800 pb-1">
                                    {dayName}, {h.toString().padStart(2, '0')}:00 UTC
                                  </div>
                                  <div className="flex justify-between gap-3 pt-1">
                                    <span className="text-zinc-400">{activeMetricLabel}:</span>
                                    <span className="font-mono text-white font-medium">{formatNumber(val)}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
