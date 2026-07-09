import {
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";
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

export function resolvePeriod(period: Period, now = new Date()): PeriodRange {
  const end = endOfDay(now);

  switch (period) {
    case "1d":
      return {
        period,
        start: startOfDay(now),
        end,
        label: "Today",
      };
    case "7d":
      return {
        period,
        start: startOfDay(subDays(now, 6)),
        end,
        label: "Last 7 Days",
      };
    case "30d":
      return {
        period,
        start: startOfDay(subDays(now, 29)),
        end,
        label: "Last 30 Days",
      };
    case "month":
      return {
        period,
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: "This Month",
      };
    default:
      return resolvePeriod("7d", now);
  }
}

export function isValidPeriod(value: string | null): value is Period {
  return value === "1d" || value === "7d" || value === "30d" || value === "month";
}
