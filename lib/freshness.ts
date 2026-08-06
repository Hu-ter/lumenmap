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
 * Classify the freshness of data given its upstream data-through ISO timestamp
 * (`ActivityResponseMetadata.sourceTimestamp`).
 *
 * Uses API freshness metadata rather than client request time as the
 * reference for how old the data is. `now` defaults to `new Date()` and
 * can be overridden in tests.
 */
export function classifyFreshness(
  sourceTimestamp: string | undefined,
  now: Date = new Date(),
): FreshnessState {
  if (!sourceTimestamp) {
    return "unknown";
  }

  const dataThrough = new Date(sourceTimestamp).getTime();

  if (Number.isNaN(dataThrough)) {
    return "unknown";
  }

  const lagMs = now.getTime() - dataThrough;
  return lagMs >= STALE_THRESHOLD_MS ? "stale" : "fresh";
}
