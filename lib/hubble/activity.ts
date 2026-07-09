import { getBigQueryClient } from "@/lib/hubble/client";
import { getCached, setCache } from "@/lib/hubble/cache";
import { getMockActivityData } from "@/lib/hubble/mock-data";
import {
  accountQuery,
  categoryQuery,
  contractQuery,
  getAccountQueryTypes,
  mapAccountRows,
  mapCategoryRows,
  mapContractRows,
  type RawQueryResults,
} from "@/lib/hubble/queries";
import { hasBigQueryCredentials } from "@/lib/hubble/client";
import { buildAllTreemaps, buildKpis } from "@/lib/entities/build-treemap";
import { resolvePeriod } from "@/lib/periods";
import type { ActivityResponse, Period } from "@/lib/types";

async function runQuery<T>(
  query: string,
  params: Record<string, unknown>,
): Promise<T[]> {
  const client = getBigQueryClient();
  if (!client) {
    throw new Error("BigQuery client is not configured");
  }

  const [rows] = await client.query({
    query,
    params,
  });

  return rows as T[];
}

async function fetchFromHubble(
  start: string,
  end: string,
): Promise<RawQueryResults> {
  const params = { start, end };

  const [categoryRows, contractRows, accountRows] = await Promise.all([
    runQuery<Record<string, unknown>>(categoryQuery, params),
    runQuery<Record<string, unknown>>(contractQuery, params),
    runQuery<Record<string, unknown>>(accountQuery, {
      ...params,
      types: getAccountQueryTypes(),
    }),
  ]);

  return {
    categories: mapCategoryRows(categoryRows),
    contracts: mapContractRows(contractRows),
    accounts: mapAccountRows(accountRows),
  };
}

export async function getActivityData(period: Period): Promise<ActivityResponse> {
  const range = resolvePeriod(period);
  const cacheKey = `activity:v5:${period}:${range.start.toISOString()}`;

  const cached = getCached<ActivityResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const start = range.start.toISOString();
  const end = range.end.toISOString();

  let raw: RawQueryResults;
  let source: ActivityResponse["source"] = "mock";

  if (hasBigQueryCredentials()) {
    try {
      raw = await fetchFromHubble(start, end);
      source = "hubble";
    } catch {
      raw = getMockActivityData();
    }
  } else {
    raw = getMockActivityData();
  }

  const kpis = buildKpis(raw.categories, raw.contracts);
  const treemaps = buildAllTreemaps(raw);

  const response: ActivityResponse = {
    period,
    start,
    end,
    source,
    categories: raw.categories,
    contracts: raw.contracts,
    accounts: raw.accounts,
    kpis,
    treemaps,
  };

  setCache(cacheKey, response);
  return response;
}
