/**
 * Data freshness classification for the LumenMap dashboard.
 *
 * Hubble refreshes in intraday batches. A 4-hour lag is the documented
 * boundary between normal batch latency and actionable staleness.
 *
 * Adjust STALE_THRESHOLD_MS here if the upstream refresh cadence changes.
 */

/** Lag in milliseconds above which data is considered stale. Default: 4 hours. */
export const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000;

/**
 * Three-state freshness classification:
 * - "fresh"   — data lag is within the acceptable threshold
 * - "stale"   — data lag exceeds STALE_THRESHOLD_MS
 * - "unknown" — the data-through timestamp is absent or unparseable
 */
export type FreshnessState = "fresh" | "stale" | "unknown";

/**
 * Classify the freshness of data given its data-through ISO timestamp.
 *
 * Uses API metadata (`endIso`) rather than client request time as the
 * reference for how old the data is. `now` defaults to `new Date()` and
 * can be overridden in tests.
 *
 * @param endIso - ISO 8601 string from `ActivityResponse.end`
 * @param now    - current time reference (defaults to Date.now())
 * @returns FreshnessState
 */
export function classifyFreshness(
  endIso: string | undefined,
  now: Date = new Date(),
): FreshnessState {
  if (!endIso) {
    return "unknown";
  }

  const dataThrough = new Date(endIso).getTime();

  if (Number.isNaN(dataThrough)) {
    return "unknown";
  }

  const lagMs = now.getTime() - dataThrough;
  return lagMs >= STALE_THRESHOLD_MS ? "stale" : "fresh";
}
