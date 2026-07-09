import { getCached, setCache } from "@/lib/hubble/cache";
import { lookupEntity } from "@/lib/entities/registry";
import type { EntityInfo } from "@/lib/types";

const STELLAR_EXPERT_DIRECTORY =
  "https://api.stellar.expert/explorer/public/directory";
const BATCH_SIZE = 50;
const LABEL_CACHE_TTL_SECONDS = 86_400;

interface DirectoryRecord {
  address: string;
  name?: string;
  domain?: string;
  tags?: string[];
}

interface DirectoryResponse {
  _embedded?: {
    records?: DirectoryRecord[];
  };
}

export interface ResolveLabelsOptions {
  fetchHomeDomains?: (ids: string[]) => Promise<Record<string, EntityInfo>>;
}

function tagToCategory(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) {
    return "account";
  }

  const priority = [
    "exchange",
    "anchor",
    "issuer",
    "wallet",
    "defi",
    "custodian",
    "sdf",
  ];

  for (const tag of priority) {
    if (tags.includes(tag)) {
      return tag === "sdf" ? "foundation" : tag;
    }
  }

  return tags[0];
}

function formatDomainLabel(domain: string): string {
  const normalized = domain.replace(/^www\./, "");
  const root = normalized.split(".")[0] ?? normalized;
  return root.charAt(0).toUpperCase() + root.slice(1);
}

function recordToEntity(record: DirectoryRecord): EntityInfo {
  return {
    name: record.name?.trim() || formatDomainLabel(record.domain ?? record.address),
    category: tagToCategory(record.tags),
    protocol: record.domain?.replace(/^www\./, "") ?? record.name ?? "Stellar",
  };
}

function homeDomainToEntity(homeDomain: string): EntityInfo {
  const protocol = homeDomain.replace(/^www\./, "");
  return {
    name: formatDomainLabel(protocol),
    category: "account",
    protocol,
  };
}

async function fetchDirectoryBatch(ids: string[]): Promise<Record<string, EntityInfo>> {
  const params = new URLSearchParams();
  for (const id of ids) {
    params.append("address[]", id);
  }
  params.set("limit", String(ids.length));

  const response = await fetch(`${STELLAR_EXPERT_DIRECTORY}?${params.toString()}`, {
    next: { revalidate: LABEL_CACHE_TTL_SECONDS },
  });

  if (!response.ok) {
    return {};
  }

  const payload = (await response.json()) as DirectoryResponse;
  const records = payload._embedded?.records ?? [];
  const resolved: Record<string, EntityInfo> = {};

  for (const record of records) {
    if (!record.address) {
      continue;
    }
    resolved[record.address] = recordToEntity(record);
  }

  return resolved;
}

function cacheResolvedLabels(resolved: Record<string, EntityInfo>): void {
  for (const [id, entity] of Object.entries(resolved)) {
    setCache(`label:${id}`, entity, LABEL_CACHE_TTL_SECONDS);
  }
}

export async function resolveEntityLabels(
  ids: string[],
  options: ResolveLabelsOptions = {},
): Promise<Record<string, EntityInfo>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const resolved: Record<string, EntityInfo> = {};
  const pending: string[] = [];

  for (const id of uniqueIds) {
    const local = lookupEntity(id);
    if (local) {
      resolved[id] = local;
      continue;
    }

    const cacheKey = `label:${id}`;
    const cached = getCached<EntityInfo>(cacheKey);
    if (cached) {
      resolved[id] = cached;
      continue;
    }

    pending.push(id);
  }

  for (let index = 0; index < pending.length; index += BATCH_SIZE) {
    const batch = pending.slice(index, index + BATCH_SIZE);
    try {
      const batchResolved = await fetchDirectoryBatch(batch);
      Object.assign(resolved, batchResolved);
      cacheResolvedLabels(batchResolved);
    } catch {
      // Fall back to other resolvers when directory lookup fails.
    }
  }

  const unresolved = pending.filter((id) => !resolved[id]);
  const accountIds = unresolved.filter((id) => id.startsWith("G"));

  if (accountIds.length > 0 && options.fetchHomeDomains) {
    try {
      const homeDomains = await options.fetchHomeDomains(accountIds);
      Object.assign(resolved, homeDomains);
      cacheResolvedLabels(homeDomains);
    } catch {
      // Ignore home domain lookup failures.
    }
  }

  return resolved;
}

export function homeDomainsToEntities(
  rows: { account_id: string; home_domain: string }[],
): Record<string, EntityInfo> {
  const resolved: Record<string, EntityInfo> = {};

  for (const row of rows) {
    if (!row.home_domain) {
      continue;
    }
    resolved[row.account_id] = homeDomainToEntity(row.home_domain);
  }

  return resolved;
}

export function collectTreemapIds(raw: {
  accounts: { account_id: string }[];
  contracts: { contract_id: string }[];
}): string[] {
  return [
    ...raw.accounts.map((row) => row.account_id),
    ...raw.contracts.map((row) => row.contract_id),
  ];
}
