import fixture from "@/data/fixtures/category-share.json";
import {
  buildCategoryShareSeries,
  type CategoryShareRawRow,
  type CategoryShareSeries,
} from "@/lib/charts/category-share";
import type { Period } from "@/lib/types";

interface CategoryShareFixtureFile {
  description?: string;
  now: string;
  period: Period;
  start: string;
  end: string;
  rows: CategoryShareRawRow[];
}

const stored = fixture as CategoryShareFixtureFile;

export function getFixtureCategoryShareSeries(
  period: Period = stored.period,
  now = new Date(stored.now),
): CategoryShareSeries {
  if (period === stored.period) {
    return buildCategoryShareSeries({
      period,
      start: new Date(stored.start),
      end: new Date(stored.end),
      rows: stored.rows,
      now,
    });
  }

  const { start, end, rows } = projectFixtureOntoPeriod(period, now);
  return buildCategoryShareSeries({ period, start, end, rows, now });
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function endOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function projectFixtureOntoPeriod(
  period: Period,
  now: Date,
): { start: Date; end: Date; rows: CategoryShareRawRow[] } {
  const end = endOfUtcDay(now);
  let start = startOfUtcDay(now);

  if (period === "7d") {
    start = startOfUtcDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
  } else if (period === "30d") {
    start = startOfUtcDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
  } else if (period === "month") {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  const byHour = new Map<number, CategoryShareRawRow[]>();
  for (const row of stored.rows) {
    const hour = new Date(row.bucket_start).getUTCHours();
    const list = byHour.get(hour) ?? [];
    list.push(row);
    byHour.set(hour, list);
  }

  const hours = [...byHour.keys()].sort((a, b) => a - b);
  const rows: CategoryShareRawRow[] = [];
  hours.forEach((hour, index) => {
    const day = new Date(start.getTime());
    day.setUTCDate(day.getUTCDate() + index);
    for (const row of byHour.get(hour) ?? []) {
      rows.push({ ...row, bucket_start: day.toISOString() });
    }
  });

  return { start, end, rows };
}
