"use client";

import { differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { Skeleton } from "@/components/ui/skeleton";

function formatLag(dataThrough: string): string {
  const now = Date.now();
  const through = new Date(dataThrough).getTime();
  const mins = differenceInMinutes(now, through);

  if (mins < 1) return "<1m behind";
  if (mins < 60) return `${mins}m behind`;

  const hours = differenceInHours(now, through);
  if (hours < 24) {
    const remainMins = mins % 60;
    return remainMins > 0 ? `${hours}h ${remainMins}m behind` : `${hours}h behind`;
  }

  const days = differenceInDays(now, through);
  return `${days}d behind`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatUtcTimestamp(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const MM = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const HH = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  return `${yyyy}-${MM}-${dd} ${HH}:${mm} UTC`;
}

export function FreshnessIndicator() {
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-56" />
      </div>
    );
  }

  if (isError || !data?.freshness) {
    return (
      <p className="text-xs text-zinc-500">
        Data source:{" "}
        <span className="text-zinc-300">Hubble BigQuery</span>
        {" · "}
        <span className="text-amber-500">Data freshness unavailable</span>
      </p>
    );
  }

  const { dataThrough } = data.freshness;
  const lag = formatLag(dataThrough);
  const utcDisplay = formatUtcTimestamp(dataThrough);

  return (
    <p
      className="text-xs text-zinc-500"
      title={`Data through ${dataThrough} · Refreshed ${data.freshness.lastRefreshed}`}
    >
      Data through{" "}
      <span className="text-zinc-300">{utcDisplay}</span>
      {" · "}
      <span className="text-zinc-400">{lag}</span>
    </p>
  );
}
