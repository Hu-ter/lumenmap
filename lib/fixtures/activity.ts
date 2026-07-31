import { buildAllTreemaps, buildKpis } from "@/lib/entities/build-treemap";
import { getFixtureRawActivity } from "@/lib/fixtures/raw-data";
import { resolvePeriod } from "@/lib/periods";
import type { ActivityResponse, Period } from "@/lib/types";

/**
 * Builds a complete dashboard payload from the deterministic fixture rows.
 * The fixture goes through the same KPI and treemap builders as live
 * BigQuery data, so fixture mode exercises the real rendering pipeline.
 *
 * Used when `LUMENMAP_DATA_SOURCE=fixture` (local development and the
 * Playwright e2e suite). Requires no GCP credentials and performs no
 * network calls: labels resolve from the local entity registry only.
 */
export function getFixtureActivityData(period: Period): ActivityResponse {
  const raw = getFixtureRawActivity(period);
  const range = resolvePeriod(period);

  return {
    period,
    start: range.start.toISOString(),
    end: range.end.toISOString(),
    source: "fixture",
    categories: raw.categories,
    contracts: raw.contracts,
    accounts: raw.accounts,
    sorobanFunctions: raw.sorobanFunctions,
    sorobanFunctionContracts: raw.sorobanFunctionContracts,
    kpis: buildKpis(raw.categories, raw.contracts),
    treemaps: buildAllTreemaps(raw),
  };
}
