import type { Period } from "@/lib/types";

export interface PeriodRange {
  period: Period;
  start: Date;
  end: Date;
  label: string;
}

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "1d", label: "Today (UTC)" },
  { value: "7d", label: "7 Days (UTC)" },
  { value: "30d", label: "30 Days (UTC)" },
  { value: "month", label: "This Month (UTC)" },
];

export function resolvePeriod(period: Period, now = new Date()): PeriodRange {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();

  const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

  switch (period) {
    case "1d":
      return {
        period,
        start: new Date(Date.UTC(y, m, d, 0, 0, 0, 0)),
        end,
        label: "Today (UTC)",
      };
    case "7d":
      return {
        period,
        start: new Date(Date.UTC(y, m, d - 6, 0, 0, 0, 0)),
        end,
        label: "Last 7 Days (UTC)",
      };
    case "30d":
      return {
        period,
        start: new Date(Date.UTC(y, m, d - 29, 0, 0, 0, 0)),
        end,
        label: "Last 30 Days (UTC)",
      };
    case "month":
      return {
        period,
        start: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
        end: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
        label: "This Month (UTC)",
      };
    default:
      return resolvePeriod("1d", now);
  }
}

export function isValidPeriod(value: string | null): value is Period {
  return value === "1d" || value === "7d" || value === "30d" || value === "month";
}
