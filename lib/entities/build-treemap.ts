import {
  CATEGORY_COLORS,
  GROUP_LABELS,
  TYPE_TO_GROUP,
} from "@/lib/constants";
import { getDisplayName, lookupEntity } from "@/lib/entities/registry";
import type {
  AccountRow,
  ActivityKpis,
  CategoryRow,
  ContractRow,
  EntityInfo,
  SorobanFunctionContractRow,
  SorobanFunctionRow,
  TreemapNode,
  UsdcAccountRow,
  UsdcCategoryRow,
} from "@/lib/types";

interface BuildTreemapInput {
  categories: CategoryRow[];
  contracts: ContractRow[];
  accounts: AccountRow[];
  sorobanFunctions: SorobanFunctionRow[];
  sorobanFunctionContracts: SorobanFunctionContractRow[];
  usdcCategories?: UsdcCategoryRow[];
  usdcAccounts?: UsdcAccountRow[];
  labels?: Record<string, EntityInfo>;
}

const GROUP_ORDER = [
  "soroban",
  "payments",
  "dex",
  "trustlines",
  "account",
  "other",
] as const;

function getGroupForType(type: string): string {
  return TYPE_TO_GROUP[type] ?? "other";
}

function getGroupTotals(categories: CategoryRow[]): Map<string, number> {
  const totals = new Map<string, number>();

  for (const row of categories) {
    const group = getGroupForType(row.type_string);
    totals.set(group, (totals.get(group) ?? 0) + row.op_count);
  }

  return totals;
}

function buildContractLeaves(
  contracts: ContractRow[],
  labels?: BuildTreemapInput["labels"],
): TreemapNode[] {
  return [...contracts]
    .sort((a, b) => b.op_count - a.op_count)
    .map((row) => {
      const entity = lookupEntity(row.contract_id, labels);
      return {
        id: row.contract_id,
        name: entity?.name ?? getDisplayName(row.contract_id, labels),
        value: row.op_count,
        color: CATEGORY_COLORS.soroban,
        meta: {
          type: "contract",
          id: row.contract_id,
          category: "soroban",
          protocol: entity?.protocol,
          opCount: row.op_count,
          unit: "ops",
        },
      };
    });
}

function buildAccountLeavesFromRows(
  rows: { account_id: string; op_count: number }[],
  group: string,
  labels?: BuildTreemapInput["labels"],
): TreemapNode[] {
  const color = CATEGORY_COLORS[group] ?? CATEGORY_COLORS.other;

  return [...rows]
    .sort((a, b) => b.op_count - a.op_count)
    .map((row) => {
      const entity = lookupEntity(row.account_id, labels);
      return {
        id: row.account_id,
        name: entity?.name ?? getDisplayName(row.account_id, labels),
        value: row.op_count,
        color,
        meta: {
          type: "account",
          id: row.account_id,
          category: group,
          protocol: entity?.protocol,
          opCount: row.op_count,
          unit: "ops",
        },
      };
    });
}

function buildAccountLeaves(
  accounts: AccountRow[],
  group: string,
  labels?: BuildTreemapInput["labels"],
): TreemapNode[] {
  const filtered = accounts.filter(
    (row) => getGroupForType(row.type_string) === group,
  );

  const byAccount = new Map<string, number>();
  for (const row of filtered) {
    byAccount.set(
      row.account_id,
      (byAccount.get(row.account_id) ?? 0) + row.op_count,
    );
  }

  const rows = [...byAccount.entries()].map(([account_id, op_count]) => ({
    account_id,
    op_count,
  }));

  return buildAccountLeavesFromRows(rows, group, labels);
}

function buildAccountLeavesForEventType(
  accounts: AccountRow[],
  eventType: string,
  group: string,
  labels?: BuildTreemapInput["labels"],
): TreemapNode[] {
  const rows = accounts
    .filter((row) => row.type_string === eventType)
    .map((row) => ({
      account_id: row.account_id,
      op_count: row.op_count,
    }));

  if (rows.length === 0) {
    return [];
  }

  return buildAccountLeavesFromRows(rows, group, labels);
}

function buildContractLeavesForFunction(
  rows: SorobanFunctionContractRow[],
  functionName: string,
  labels?: BuildTreemapInput["labels"],
): TreemapNode[] {
  return buildContractLeaves(
    rows
      .filter((row) => row.function_name === functionName)
      .map((row) => ({
        contract_id: row.contract_id,
        op_count: row.op_count,
      })),
    labels,
  );
}

function buildSorobanFunctionLeaves(input: BuildTreemapInput): TreemapNode[] {
  const color = CATEGORY_COLORS.soroban;

  return [...input.sorobanFunctions]
    .sort((a, b) => b.op_count - a.op_count)
    .map((row) => {
      const contractChildren = buildContractLeavesForFunction(
        input.sorobanFunctionContracts,
        row.function_name,
        input.labels,
      );

      return {
        name: row.function_name.replaceAll("_", " "),
        value: row.op_count,
        color,
        ...(contractChildren.length > 0 ? { children: contractChildren } : {}),
        meta: {
          type: "entity" as const,
          category: "soroban",
          opCount: row.op_count,
          unit: "ops",
          eventType: row.function_name,
          childCount: contractChildren.length || undefined,
        },
      };
    });
}

function buildTypeLeaves(
  input: BuildTreemapInput,
  group: string,
): TreemapNode[] {
  if (group === "soroban") {
    return buildSorobanFunctionLeaves(input);
  }

  const color = CATEGORY_COLORS[group] ?? CATEGORY_COLORS.other;

  return input.categories
    .filter((row) => getGroupForType(row.type_string) === group)
    .sort((a, b) => b.op_count - a.op_count)
    .map((row) => {
      const accountChildren = buildAccountLeavesForEventType(
        input.accounts,
        row.type_string,
        group,
        input.labels,
      );

      return {
        name: row.type_string.replaceAll("_", " "),
        value: row.op_count,
        color,
        ...(accountChildren.length > 0 ? { children: accountChildren } : {}),
        meta: {
          type: "entity" as const,
          category: group,
          opCount: row.op_count,
          unit: "ops",
          eventType: row.type_string,
          childCount: accountChildren.length || undefined,
        },
      };
    });
}

function buildCategoryGroupChildren(
  group: string,
  input: BuildTreemapInput,
): TreemapNode[] {
  if (group === "soroban") {
    return buildContractLeaves(input.contracts, input.labels);
  }

  if (group === "payments" || group === "dex" || group === "trustlines") {
    const accountLeaves = buildAccountLeaves(
      input.accounts,
      group,
      input.labels,
    );
    if (accountLeaves.length > 0) {
      return accountLeaves;
    }
  }

  return buildTypeLeaves(input, group);
}

function buildGroupedTreemap(
  input: BuildTreemapInput,
  getCategoryChildren: (group: string) => TreemapNode[],
): TreemapNode {
  const groupTotals = getGroupTotals(input.categories);
  const totalOps = categoriesTotal(input.categories);

  const children: TreemapNode[] = GROUP_ORDER.flatMap((group) => {
    const value = groupTotals.get(group) ?? 0;
    if (value <= 0) {
      return [];
    }

    const categoryChildren = getCategoryChildren(group);

    return [
      {
        name: GROUP_LABELS[group] ?? group,
        value,
        color: CATEGORY_COLORS[group] ?? CATEGORY_COLORS.other,
        meta: {
          type: "category",
          category: group,
          opCount: value,
          unit: "ops",
          share: totalOps > 0 ? (value / totalOps) * 100 : 0,
          childCount: categoryChildren.length,
        },
        children: categoryChildren,
      },
    ];
  });

  return {
    name: "Network Activity",
    value: totalOps,
    meta: {
      type: "root",
      opCount: totalOps,
      unit: "ops",
    },
    children,
  };
}

export function buildEventTypeTreemap(input: BuildTreemapInput): TreemapNode {
  return buildGroupedTreemap(input, (group) => buildTypeLeaves(input, group));
}

export function buildActorTreemap(input: BuildTreemapInput): TreemapNode {
  return buildGroupedTreemap(input, (group) =>
    buildCategoryGroupChildren(group, input),
  );
}

function buildUsdcAccountLeavesFromRows(
  rows: { account_id: string; amount: number }[],
  group: string,
  labels?: BuildTreemapInput["labels"],
): TreemapNode[] {
  const color = CATEGORY_COLORS[group] ?? CATEGORY_COLORS.other;

  return [...rows]
    .sort((a, b) => b.amount - a.amount)
    .map((row) => {
      const entity = lookupEntity(row.account_id, labels);
      return {
        id: row.account_id,
        name: entity?.name ?? getDisplayName(row.account_id, labels),
        value: row.amount,
        color,
        meta: {
          type: "account",
          id: row.account_id,
          category: group,
          protocol: entity?.protocol,
          amount: row.amount,
          unit: "USDC",
        },
      };
    });
}

function buildUsdcAccountLeaves(
  usdcAccounts: UsdcAccountRow[],
  group: string,
  labels?: BuildTreemapInput["labels"],
): TreemapNode[] {
  const filtered = usdcAccounts.filter(
    (row) => getGroupForType(row.type_string) === group,
  );

  const byAccount = new Map<string, number>();
  for (const row of filtered) {
    byAccount.set(
      row.account_id,
      (byAccount.get(row.account_id) ?? 0) + row.amount,
    );
  }

  const rows = [...byAccount.entries()].map(([account_id, amount]) => ({
    account_id,
    amount,
  }));

  return buildUsdcAccountLeavesFromRows(rows, group, labels);
}

function buildUsdcAccountLeavesForEventType(
  usdcAccounts: UsdcAccountRow[],
  eventType: string,
  group: string,
  labels?: BuildTreemapInput["labels"],
): TreemapNode[] {
  const rows = usdcAccounts
    .filter((row) => row.type_string === eventType)
    .map((row) => ({
      account_id: row.account_id,
      amount: row.amount,
    }));

  if (rows.length === 0) {
    return [];
  }

  return buildUsdcAccountLeavesFromRows(rows, group, labels);
}

export function buildUsdcEventTypeTreemap(input: BuildTreemapInput): TreemapNode {
  const usdcCategories = input.usdcCategories ?? [];
  const usdcAccounts = input.usdcAccounts ?? [];
  const totalUsdc = usdcCategories.reduce((sum, row) => sum + row.amount, 0);

  const groupTotals = new Map<string, number>();
  for (const row of usdcCategories) {
    const group = getGroupForType(row.type_string);
    groupTotals.set(group, (groupTotals.get(group) ?? 0) + row.amount);
  }

  const children: TreemapNode[] = GROUP_ORDER.flatMap((group) => {
    const value = groupTotals.get(group) ?? 0;
    if (value <= 0) {
      return [];
    }

    const typeLeaves = usdcCategories
      .filter((row) => getGroupForType(row.type_string) === group)
      .sort((a, b) => b.amount - a.amount)
      .map((row) => {
        const accountChildren = buildUsdcAccountLeavesForEventType(
          usdcAccounts,
          row.type_string,
          group,
          input.labels,
        );

        return {
          name: row.type_string.replaceAll("_", " "),
          value: row.amount,
          color: CATEGORY_COLORS[group] ?? CATEGORY_COLORS.other,
          ...(accountChildren.length > 0 ? { children: accountChildren } : {}),
          meta: {
            type: "entity" as const,
            category: group,
            amount: row.amount,
            unit: "USDC",
            eventType: row.type_string,
            childCount: accountChildren.length || undefined,
          },
        };
      });

    return [
      {
        name: GROUP_LABELS[group] ?? group,
        value,
        color: CATEGORY_COLORS[group] ?? CATEGORY_COLORS.other,
        meta: {
          type: "category",
          category: group,
          amount: value,
          unit: "USDC",
          share: totalUsdc > 0 ? (value / totalUsdc) * 100 : 0,
          childCount: typeLeaves.length,
        },
        children: typeLeaves,
      },
    ];
  });

  return {
    name: "Network USDC Activity",
    value: totalUsdc,
    meta: {
      type: "root",
      amount: totalUsdc,
      unit: "USDC",
    },
    children,
  };
}

export function buildUsdcActorTreemap(input: BuildTreemapInput): TreemapNode {
  const usdcCategories = input.usdcCategories ?? [];
  const usdcAccounts = input.usdcAccounts ?? [];
  const totalUsdc = usdcCategories.reduce((sum, row) => sum + row.amount, 0);

  const groupTotals = new Map<string, number>();
  for (const row of usdcCategories) {
    const group = getGroupForType(row.type_string);
    groupTotals.set(group, (groupTotals.get(group) ?? 0) + row.amount);
  }

  const children: TreemapNode[] = GROUP_ORDER.flatMap((group) => {
    const value = groupTotals.get(group) ?? 0;
    if (value <= 0) {
      return [];
    }

    const accountLeaves = buildUsdcAccountLeaves(usdcAccounts, group, input.labels);

    return [
      {
        name: GROUP_LABELS[group] ?? group,
        value,
        color: CATEGORY_COLORS[group] ?? CATEGORY_COLORS.other,
        meta: {
          type: "category",
          category: group,
          amount: value,
          unit: "USDC",
          share: totalUsdc > 0 ? (value / totalUsdc) * 100 : 0,
          childCount: accountLeaves.length,
        },
        children: accountLeaves,
      },
    ];
  });

  return {
    name: "Network USDC Activity",
    value: totalUsdc,
    meta: {
      type: "root",
      amount: totalUsdc,
      unit: "USDC",
    },
    children,
  };
}

export function buildAllTreemaps(input: BuildTreemapInput) {
  const opsEvents = buildEventTypeTreemap(input);
  const opsActors = buildActorTreemap(input);
  const usdcEvents = buildUsdcEventTypeTreemap(input);
  const usdcActors = buildUsdcActorTreemap(input);

  return {
    events: opsEvents,
    actors: opsActors,
    ops: {
      events: opsEvents,
      actors: opsActors,
    },
    usdc: {
      events: usdcEvents,
      actors: usdcActors,
    },
  };
}

/** @deprecated Use buildActorTreemap or buildAllTreemaps */
export function buildTreemap(input: BuildTreemapInput): TreemapNode {
  return buildActorTreemap(input);
}

export function buildKpis(
  categories: CategoryRow[],
  contracts: ContractRow[],
): ActivityKpis {
  const totalOps = categories.reduce((sum, row) => sum + row.op_count, 0);
  const groupTotals = getGroupTotals(categories);
  const sorobanOps = groupTotals.get("soroban") ?? 0;

  const topCategoryEntry = [...groupTotals.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];

  return {
    totalOps,
    sorobanShare: totalOps > 0 ? (sorobanOps / totalOps) * 100 : 0,
    topCategory: topCategoryEntry
      ? (GROUP_LABELS[topCategoryEntry[0]] ?? topCategoryEntry[0])
      : "N/A",
    activeContracts: contracts.length,
  };
}

function categoriesTotal(categories: CategoryRow[]): number {
  return categories.reduce((sum, row) => sum + row.op_count, 0);
}
