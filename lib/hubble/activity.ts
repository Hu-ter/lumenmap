import { executeQuery } from "@/lib/hubble/executor";
import { getCached, setCache } from "@/lib/hubble/cache";
import {
  ACCOUNT_QUERY_TYPES,
  accountQuery,
  accountMetadataQuery,
  categoryQuery,
  contractQuery,
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
    executeQuery<Record<string, unknown>>(categoryQuery, params),
    executeQuery<Record<string, unknown>>(contractQuery, params),
    executeQuery<Record<string, unknown>>(accountQuery, {
      ...params,
      types: ACCOUNT_QUERY_TYPES,
    }),
    executeQuery<Record<string, unknown>>(sorobanFunctionQuery, params),
    executeQuery<Record<string, unknown>>(sorobanFunctionContractQuery, params),
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

  const rows = await executeQuery<Record<string, unknown>>(accountMetadataQuery, {
    ids,
  });

  return homeDomainsToEntities(mapAccountMetadataRows(rows));
}

export async function getActivityData(period: Period): Promise<ActivityResponse> {
  if (!hasBigQueryCredentials()) {
    throw new Error(
      "BigQuery credentials are required. Set GOOGLE_APPLICATION_CREDENTIALS in .env.local",
    );
  }

  const range = resolvePeriod(period);
  const cacheKey = `activity:v10:${period}:${range.start.toISOString()}`;

  const cached = getCached<ActivityResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const start = range.start.toISOString();
  const end = range.end.toISOString();
  const raw = await fetchFromHubble(start, end);
  const kpis = buildKpis(raw.categories, raw.contracts);
  const labels = await resolveEntityLabels(collectTreemapIds(raw), {
    fetchHomeDomains,
  });
  const treemaps = buildAllTreemaps({ ...raw, labels });

  const response: ActivityResponse = {
    period,
    start,
    end,
    source: "hubble",
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
