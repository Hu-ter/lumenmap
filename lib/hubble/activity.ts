import { getBigQueryClient } from "@/lib/hubble/client";
import { getCached, setCache } from "@/lib/hubble/cache";
import { getMockActivityData } from "@/lib/hubble/mock-data";
import {
  accountQuery,
  accountMetadataQuery,
  categoryQuery,
  contractQuery,
  getAccountQueryTypes,
  mapAccountMetadataRows,
  mapAccountRows,
  mapCategoryRows,
  mapContractRows,
  mapSorobanFunctionContractRows,
  mapSorobanFunctionRows,
  sorobanFunctionContractQuery,
  sorobanFunctionQuery,
  type RawQueryResults,
} from "@/lib/hubble/queries";
import { hasBigQueryCredentials } from "@/lib/hubble/client";
import { buildAllTreemaps, buildKpis } from "@/lib/entities/build-treemap";
import {
  collectTreemapIds,
  homeDomainsToEntities,
  resolveEntityLabels,
} from "@/lib/entities/resolve-labels";
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

  const [
    categoryRows,
    contractRows,
    accountRows,
    sorobanFunctionRows,
    sorobanFunctionContractRows,
  ] = await Promise.all([
    runQuery<Record<string, unknown>>(categoryQuery, params),
    runQuery<Record<string, unknown>>(contractQuery, params),
    runQuery<Record<string, unknown>>(accountQuery, {
      ...params,
      types: getAccountQueryTypes(),
    }),
    runQuery<Record<string, unknown>>(sorobanFunctionQuery, params),
    runQuery<Record<string, unknown>>(sorobanFunctionContractQuery, params),
  ]);

  return {
    categories: mapCategoryRows(categoryRows),
    contracts: mapContractRows(contractRows),
    accounts: mapAccountRows(accountRows),
    sorobanFunctions: mapSorobanFunctionRows(sorobanFunctionRows),
    sorobanFunctionContracts: mapSorobanFunctionContractRows(
      sorobanFunctionContractRows,
    ),
  };
}

async function fetchHomeDomains(ids: string[]) {
  if (ids.length === 0) {
    return {};
  }

  const rows = await runQuery<Record<string, unknown>>(accountMetadataQuery, {
    ids,
  });

  return homeDomainsToEntities(mapAccountMetadataRows(rows));
}

export async function getActivityData(period: Period): Promise<ActivityResponse> {
  const range = resolvePeriod(period);
  const cacheKey = `activity:v9:${period}:${range.start.toISOString()}`;

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
  const labels = await resolveEntityLabels(collectTreemapIds(raw), {
    fetchHomeDomains: hasBigQueryCredentials() ? fetchHomeDomains : undefined,
  });
  const treemaps = buildAllTreemaps({ ...raw, labels });

  const response: ActivityResponse = {
    period,
    start,
    end,
    source,
    categories: raw.categories,
    contracts: raw.contracts,
    accounts: raw.accounts,
    sorobanFunctions: raw.sorobanFunctions,
    sorobanFunctionContracts: raw.sorobanFunctionContracts,
    kpis,
    treemaps,
  };

  setCache(cacheKey, response);
  return response;
}
