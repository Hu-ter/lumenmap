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
  TreemapNode,
} from "@/lib/types";

interface BuildTreemapInput {
  categories: CategoryRow[];
  contracts: ContractRow[];
  accounts: AccountRow[];
}

const GROUP_ORDER = [
  "soroban",
  "payments",
  "dex",
  "trustlines",
  "account",
  "other",
] as const;

const MAX_TOP_TILES = 10;
const MAX_OTHER_CHILDREN = 60;

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

function buildOtherBucket(
  label: string,
  category: string,
  children: TreemapNode[],
): TreemapNode | null {
  if (children.length === 0) {
    return null;
  }

  const value = children.reduce((sum, child) => sum + (child.value ?? 0), 0);

  return {
    name: label,
    value,
    color: CATEGORY_COLORS.other,
    children,
    meta: {
      type: "entity",
      category,
      opCount: value,
      childCount: children.length,
    },
  };
}

function buildContractLeaves(
  contracts: ContractRow[],
  categoryTotal: number,
): TreemapNode[] {
  const sorted = [...contracts].sort((a, b) => b.op_count - a.op_count);
  const top = sorted.slice(0, MAX_TOP_TILES);
  const rest = sorted.slice(MAX_TOP_TILES, MAX_TOP_TILES + MAX_OTHER_CHILDREN);

  const leaves: TreemapNode[] = top.map((row) => {
    const entity = lookupEntity(row.contract_id);
    return {
      name: entity?.name ?? getDisplayName(row.contract_id),
      value: row.op_count,
      color: CATEGORY_COLORS.soroban,
      meta: {
        type: "contract",
        id: row.contract_id,
        category: "soroban",
        protocol: entity?.protocol,
        opCount: row.op_count,
      },
    };
  });

  const topSum = leaves.reduce((sum, leaf) => sum + (leaf.value ?? 0), 0);
  const restSum = rest.reduce((sum, row) => sum + row.op_count, 0);
  const unattributed = Math.max(0, categoryTotal - topSum - restSum);

  const otherChildren: TreemapNode[] = rest.map((row) => {
    const entity = lookupEntity(row.contract_id);
    return {
      name: entity?.name ?? getDisplayName(row.contract_id),
      value: row.op_count,
      color: CATEGORY_COLORS.soroban,
      meta: {
        type: "contract",
        id: row.contract_id,
        category: "soroban",
        protocol: entity?.protocol,
        opCount: row.op_count,
      },
    };
  });

  if (unattributed > 0) {
    otherChildren.push({
      name: "Unlisted contracts",
      value: unattributed,
      color: CATEGORY_COLORS.other,
      meta: {
        type: "entity",
        category: "soroban",
        opCount: unattributed,
      },
    });
  }

  const otherBucket = buildOtherBucket(
    "Other Contracts",
    "soroban",
    otherChildren,
  );

  return otherBucket ? [...leaves, otherBucket] : leaves;
}

function buildAccountLeavesFromRows(
  rows: { account_id: string; op_count: number }[],
  group: string,
  categoryTotal: number,
  otherLabel: string,
): TreemapNode[] {
  const sorted = [...rows].sort((a, b) => b.op_count - a.op_count);
  const top = sorted.slice(0, MAX_TOP_TILES);
  const rest = sorted.slice(MAX_TOP_TILES, MAX_TOP_TILES + MAX_OTHER_CHILDREN);

  const color = CATEGORY_COLORS[group] ?? CATEGORY_COLORS.other;

  const leaves: TreemapNode[] = top.map((row) => {
    const entity = lookupEntity(row.account_id);
    return {
      name: entity?.name ?? getDisplayName(row.account_id),
      value: row.op_count,
      color,
      meta: {
        type: "account",
        id: row.account_id,
        category: group,
        protocol: entity?.protocol,
        opCount: row.op_count,
      },
    };
  });

  const topSum = leaves.reduce((sum, leaf) => sum + (leaf.value ?? 0), 0);
  const restSum = rest.reduce((sum, row) => sum + row.op_count, 0);
  const unattributed = Math.max(0, categoryTotal - topSum - restSum);

  const otherChildren: TreemapNode[] = rest.map((row) => {
    const entity = lookupEntity(row.account_id);
    return {
      name: entity?.name ?? getDisplayName(row.account_id),
      value: row.op_count,
      color,
      meta: {
        type: "account",
        id: row.account_id,
        category: group,
        protocol: entity?.protocol,
        opCount: row.op_count,
      },
    };
  });

  if (unattributed > 0) {
    otherChildren.push({
      name: "Unlisted sources",
      value: unattributed,
      color: CATEGORY_COLORS.other,
      meta: {
        type: "entity",
        category: group,
        opCount: unattributed,
      },
    });
  }

  const otherBucket = buildOtherBucket(otherLabel, group, otherChildren);

  return otherBucket ? [...leaves, otherBucket] : leaves;
}

function buildAccountLeaves(
  accounts: AccountRow[],
  group: string,
  categoryTotal: number,
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

  const otherLabel =
    group === "payments"
      ? "Other Payments"
      : group === "dex"
        ? "Other DEX Activity"
        : group === "trustlines"
          ? "Other Trustlines"
          : "Other Account Ops";

  return buildAccountLeavesFromRows(rows, group, categoryTotal, otherLabel);
}

function buildAccountLeavesForEventType(
  accounts: AccountRow[],
  eventType: string,
  typeTotal: number,
  group: string,
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

  const label = eventType.replaceAll("_", " ");
  return buildAccountLeavesFromRows(
    rows,
    group,
    typeTotal,
    `Other ${label}`,
  );
}

function buildTypeLeaves(
  input: BuildTreemapInput,
  group: string,
): TreemapNode[] {
  const color = CATEGORY_COLORS[group] ?? CATEGORY_COLORS.other;

  return input.categories
    .filter((row) => getGroupForType(row.type_string) === group)
    .sort((a, b) => b.op_count - a.op_count)
    .map((row) => {
      let children: TreemapNode[] | undefined;

      if (group === "soroban") {
        const contractChildren = buildContractLeaves(
          input.contracts,
          row.op_count,
        );
        if (contractChildren.length > 0) {
          children = contractChildren;
        }
      } else {
        const accountChildren = buildAccountLeavesForEventType(
          input.accounts,
          row.type_string,
          row.op_count,
          group,
        );
        if (accountChildren.length > 0) {
          children = accountChildren;
        }
      }

      return {
        name: row.type_string.replaceAll("_", " "),
        value: row.op_count,
        color,
        ...(children ? { children } : {}),
        meta: {
          type: "entity" as const,
          category: group,
          opCount: row.op_count,
          eventType: row.type_string,
          childCount: children?.length,
        },
      };
    });
}

function buildCategoryGroupChildren(
  group: string,
  input: BuildTreemapInput,
  categoryTotal: number,
): TreemapNode[] {
  if (group === "soroban") {
    return buildContractLeaves(input.contracts, categoryTotal);
  }

  if (group === "payments" || group === "dex" || group === "trustlines") {
    const accountLeaves = buildAccountLeaves(
      input.accounts,
      group,
      categoryTotal,
    );
    if (accountLeaves.length > 0) {
      return accountLeaves;
    }
  }

  return buildTypeLeaves(input, group);
}

function buildGroupedTreemap(
  input: BuildTreemapInput,
  getCategoryChildren: (
    group: string,
    categoryTotal: number,
  ) => TreemapNode[],
): TreemapNode {
  const groupTotals = getGroupTotals(input.categories);
  const totalOps = categoriesTotal(input.categories);

  const children: TreemapNode[] = GROUP_ORDER.flatMap((group) => {
    const value = groupTotals.get(group) ?? 0;
    if (value <= 0) {
      return [];
    }

    const categoryChildren = getCategoryChildren(group, value);

    return [
      {
        name: GROUP_LABELS[group] ?? group,
        value,
        color: CATEGORY_COLORS[group] ?? CATEGORY_COLORS.other,
        meta: {
          type: "category",
          category: group,
          opCount: value,
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
    },
    children,
  };
}

export function buildEventTypeTreemap(input: BuildTreemapInput): TreemapNode {
  return buildGroupedTreemap(input, (group) => buildTypeLeaves(input, group));
}

export function buildActorTreemap(input: BuildTreemapInput): TreemapNode {
  return buildGroupedTreemap(input, (group, categoryTotal) =>
    buildCategoryGroupChildren(group, input, categoryTotal),
  );
}

export function buildAllTreemaps(input: BuildTreemapInput) {
  return {
    events: buildEventTypeTreemap(input),
    actors: buildActorTreemap(input),
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
