import { getBigQueryClient, hasBigQueryCredentials } from "@/lib/hubble/client";
import { getCached, setCache } from "@/lib/hubble/cache";
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
import { buildAllTreemaps, buildKpis } from "@/lib/entities/build-treemap";
import {
  collectTreemapIds,
  homeDomainsToEntities,
  resolveEntityLabels,
} from "@/lib/entities/resolve-labels";
import { resolvePeriod } from "@/lib/periods";
import type { ActivityResponse, Period } from "@/lib/types";
import {
  classifyError,
  endTimer,
  logError,
  logInfo,
  startTimer,
} from "@/lib/log";

async function runQuery<T>(
  name: string,
  query: string,
  params: Record<string, unknown>,
  correlationId: string,
): Promise<T[]> {
  const timer = startTimer();

  logInfo({
    event: "activity.query.start",
    correlationId,
    queryName: name,
  });

  const client = getBigQueryClient();
  if (!client) {
    const errorMsg = "BigQuery client is not configured";
    logError({
      event: "activity.query.error",
      correlationId,
      queryName: name,
      durationMs: endTimer(timer),
      errorClass: "validation",
      errorMessage: errorMsg,
    });
    throw new Error(errorMsg);
  }

  try {
    const [rows] = await client.query({
      query,
      params,
    });

    logInfo({
      event: "activity.query.complete",
      correlationId,
      queryName: name,
      durationMs: endTimer(timer),
      rowCount: rows.length,
    });

    return rows as T[];
  } catch (error) {
    const errorClass = classifyError(error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    logError({
      event: "activity.query.error",
      correlationId,
      queryName: name,
      durationMs: endTimer(timer),
      errorClass,
      errorMessage,
    });

    throw error;
  }
}

async function fetchFromHubble(
  start: string,
  end: string,
  correlationId: string,
): Promise<RawQueryResults> {
  const params = { start, end };

  const [
    categoryRows,
    contractRows,
    accountRows,
    sorobanFunctionRows,
    sorobanFunctionContractRows,
  ] = await Promise.all([
    runQuery<Record<string, unknown>>("category", categoryQuery, params, correlationId),
    runQuery<Record<string, unknown>>("contract", contractQuery, params, correlationId),
    runQuery<Record<string, unknown>>("account", accountQuery, {
      ...params,
      types: getAccountQueryTypes(),
    }, correlationId),
    runQuery<Record<string, unknown>>("sorobanFunction", sorobanFunctionQuery, params, correlationId),
    runQuery<Record<string, unknown>>("sorobanFunctionContract", sorobanFunctionContractQuery, params, correlationId),
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

async function fetchHomeDomains(ids: string[], correlationId: string) {
  if (ids.length === 0) {
    return {};
  }

  const rows = await runQuery<Record<string, unknown>>(
    "accountMetadata",
    accountMetadataQuery,
    { ids },
    correlationId,
  );

  return homeDomainsToEntities(mapAccountMetadataRows(rows));
}

export async function getActivityData(
  period: Period,
  correlationId: string,
): Promise<ActivityResponse> {
  if (!hasBigQueryCredentials()) {
    throw new Error(
      "BigQuery credentials are required. Set GOOGLE_APPLICATION_CREDENTIALS in .env.local",
    );
  }

  const range = resolvePeriod(period);
  const cacheKey = `activity:v10:${period}:${range.start.toISOString()}`;

  const cached = getCached<ActivityResponse>(cacheKey);
  if (cached) {
    logInfo({
      event: "activity.cache.hit",
      correlationId,
      period,
    });
    return cached;
  }

  logInfo({
    event: "activity.cache.miss",
    correlationId,
    period,
  });

  const start = range.start.toISOString();
  const end = range.end.toISOString();

  const fetchTimer = startTimer();
  const raw = await fetchFromHubble(start, end, correlationId);
  logInfo({
    event: "activity.fetch.complete",
    correlationId,
    period,
    durationMs: endTimer(fetchTimer),
  });

  const kpiTimer = startTimer();
  const kpis = buildKpis(raw.categories, raw.contracts);
  logInfo({
    event: "activity.kpi.build",
    correlationId,
    period,
    durationMs: endTimer(kpiTimer),
  });

  const labelTimer = startTimer();
  const labels = await resolveEntityLabels(collectTreemapIds(raw), {
    fetchHomeDomains: (ids) => fetchHomeDomains(ids, correlationId),
  });
  logInfo({
    event: "activity.label.resolve",
    correlationId,
    period,
    durationMs: endTimer(labelTimer),
  });

  const treemapTimer = startTimer();
  const treemaps = buildAllTreemaps({ ...raw, labels });
  logInfo({
    event: "activity.treemap.build",
    correlationId,
    period,
    durationMs: endTimer(treemapTimer),
  });

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
