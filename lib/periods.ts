// All time intervals use the half-open convention [start, end):
//   start <= event_time < end
// This prevents double-counting boundary events across adjacent periods.

import type { Period } from "@/lib/types";

export interface PeriodRange {
  period: Period;
  start: Date;
  end: Date;
  label: string;
}

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "1d", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "month", label: "This Month" },
];

function utcDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

function addDaysUTC(d: Date, days: number): Date {
  return utcDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days);
}

export function resolvePeriod(period: Period, now = new Date()): PeriodRange {
  const base = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  switch (period) {
    case "1d":
      return {
        period,
        start: base,
        end: addDaysUTC(base, 1),
        label: "Today",
      };
    case "7d":
      return {
        period,
        start: addDaysUTC(base, -6),
        end: addDaysUTC(base, 1),
        label: "Last 7 Days",
      };
    case "30d":
      return {
        period,
        start: addDaysUTC(base, -29),
        end: addDaysUTC(base, 1),
        label: "Last 30 Days",
      };
    case "month":
      return {
        period,
        start: utcDate(now.getUTCFullYear(), now.getUTCMonth(), 1),
        end: utcDate(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
        label: "This Month",
      };
    default:
      return resolvePeriod("1d", now);
  }
}

export function isValidPeriod(value: string | null): value is Period {
  return value === "1d" || value === "7d" || value === "30d" || value === "month";
}