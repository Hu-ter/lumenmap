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

const MAX_LEAVES = 10;

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

function appendOtherLeaf(
  leaves: TreemapNode[],
  categoryTotal: number,
  category: string,
  label: string,
): TreemapNode[] {
  const leafSum = leaves.reduce((sum, leaf) => sum + (leaf.value ?? 0), 0);
  const remainder = categoryTotal - leafSum;

  if (remainder <= 0) {
    return leaves;
  }

  return [
    ...leaves,
    {
      name: label,
      value: remainder,
      color: CATEGORY_COLORS.other,
      meta: {
        type: "entity",
        category,
        opCount: remainder,
      },
    },
  ];
}

function buildContractLeaves(
  contracts: ContractRow[],
  categoryTotal: number,
): TreemapNode[] {
  const sorted = [...contracts].sort((a, b) => b.op_count - a.op_count);
  const top = sorted.slice(0, MAX_LEAVES);

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

  return appendOtherLeaf(leaves, categoryTotal, "soroban", "Other Contracts");
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

  const sorted = [...byAccount.entries()]
    .map(([account_id, op_count]) => ({ account_id, op_count }))
    .sort((a, b) => b.op_count - a.op_count)
    .slice(0, MAX_LEAVES);

  const color = CATEGORY_COLORS[group] ?? CATEGORY_COLORS.other;

  const leaves: TreemapNode[] = sorted.map((row) => {
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

  const otherLabel =
    group === "payments"
      ? "Other Payments"
      : group === "dex"
        ? "Other DEX Activity"
        : group === "trustlines"
          ? "Other Trustlines"
          : "Other Account Ops";

  return appendOtherLeaf(leaves, categoryTotal, group, otherLabel);
}

function buildTypeLeaves(
  categories: CategoryRow[],
  group: string,
): TreemapNode[] {
  const color = CATEGORY_COLORS[group] ?? CATEGORY_COLORS.other;

  return categories
    .filter((row) => getGroupForType(row.type_string) === group)
    .sort((a, b) => b.op_count - a.op_count)
    .map((row) => ({
      name: row.type_string.replaceAll("_", " "),
      value: row.op_count,
      color,
      meta: {
        type: "entity" as const,
        category: group,
        opCount: row.op_count,
      },
    }));
}

function buildCategoryChildren(
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

  return buildTypeLeaves(input.categories, group);
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

export function buildTreemap(input: BuildTreemapInput): TreemapNode {
  const groupTotals = getGroupTotals(input.categories);
  const totalOps = categoriesTotal(input.categories);

  const children: TreemapNode[] = GROUP_ORDER.flatMap((group) => {
    const value = groupTotals.get(group) ?? 0;
    if (value <= 0) {
      return [];
    }

    const categoryChildren = buildCategoryChildren(group, input, value);

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

function categoriesTotal(categories: CategoryRow[]): number {
  return categories.reduce((sum, row) => sum + row.op_count, 0);
}
