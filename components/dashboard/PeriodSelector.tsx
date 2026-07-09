"use client";

import { PERIOD_OPTIONS } from "@/lib/periods";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard/DashboardProvider";

export function PeriodSelector() {
  const { period, setPeriod } = useDashboard();

  return (
    <div className="flex flex-wrap gap-2">
      {PERIOD_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={period === option.value ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriod(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
