"use client";

import { AlertTriangle, HelpCircle } from "lucide-react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { classifyFreshness } from "@/lib/freshness";

/** Format the data-through timestamp for display in the warning banner. */
function formatDataThrough(endIso: string): string {
  try {
    return new Date(endIso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return endIso;
  }
}

/**
 * FreshnessWarning renders a contextual banner when data lag exceeds the
 * documented stale threshold (lib/freshness.ts).
 *
 * - fresh   → renders nothing
 * - stale   → amber banner with ⚠ icon, exact data-through time, non-color cue
 * - unknown → grey notice with ? icon
 *
 * The warning uses `data.end` from the API response, not the client request
 * time, as the reference for data age.
 */
export function FreshnessWarning() {
  const { data } = useDashboard();

  // No warning while loading or if there is no data yet.
  if (!data) {
    return null;
  }

  const state = classifyFreshness(data.end);

  if (state === "fresh") {
    return null;
  }

  if (state === "unknown") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-3 text-sm text-zinc-400"
      >
        <HelpCircle
          className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
          aria-hidden="true"
        />
        <span>
          <strong className="font-medium text-zinc-300">
            Data freshness unknown.
          </strong>{" "}
          The data-through timestamp is unavailable. Figures may not reflect the
          latest on-chain activity.
        </span>
      </div>
    );
  }

  // state === "stale"
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
    >
      <AlertTriangle
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
        aria-hidden="true"
      />
      <span>
        <strong className="font-medium text-amber-300">
          ⚠ Data may be stale.
        </strong>{" "}
        Hubble has not refreshed within the expected window.{" "}
        <span className="whitespace-nowrap font-mono text-xs text-amber-300/80">
          Data through: {formatDataThrough(data.end)}
        </span>
      </span>
    </div>
  );
}
