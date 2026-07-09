import {
  CATEGORY_COLORS,
  GROUP_LABELS,
  TYPE_TO_GROUP,
  UNKNOWN_ENTITY_TOP_N,
} from "@/lib/constants";
import {
  getDisplayName,
  getProtocolLabel,
  lookupEntity,
} from "@/lib/entities/registry";
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

function getGroupForType(type: string): string {
  return TYPE_TO_GROUP[type] ?? "other";
}

function withNodeIds(node: TreemapNode, prefix = "root"): TreemapNode {
  const id = `${prefix}-${node.name}`;
  return {
    ...node,
    id,
    children: node.children?.map((child, index) =>
      withNodeIds(child, `${id}-${index}`),
    ),
  };
}

function sumValues(nodes: TreemapNode[]): number {
  return nodes.reduce((total, node) => total + (node.value ?? 0), 0);
}

function buildContractBranch(contracts: ContractRow[]): TreemapNode | null {
  if (contracts.length === 0) {
    return null;
  }

  const byProtocol = new Map<string, ContractRow[]>();

  for (const contract of contracts) {
    const protocol = getProtocolLabel(contract.contract_id);
    const list = byProtocol.get(protocol) ?? [];
    list.push(contract);
    byProtocol.set(protocol, list);
  }

  const children: TreemapNode[] = [];

  for (const [protocol, rows] of byProtocol) {
    const sorted = [...rows].sort((a, b) => b.op_count - a.op_count);
    const known = sorted.filter((row) => lookupEntity(row.contract_id));
    const unknown = sorted.filter((row) => !lookupEntity(row.contract_id));

    const protocolChildren: TreemapNode[] = known.map((row) => ({
      name: getDisplayName(row.contract_id),
      value: row.op_count,
      color: CATEGORY_COLORS.soroban,
      meta: {
        type: "contract",
        id: row.contract_id,
        category: "soroban",
        protocol,
        opCount: row.op_count,
      },
    }));

    if (unknown.length > 0) {
      const topUnknown = unknown.slice(0, UNKNOWN_ENTITY_TOP_N);
      const restUnknown = unknown.slice(UNKNOWN_ENTITY_TOP_N);
      const restTotal = restUnknown.reduce((sum, row) => sum + row.op_count, 0);

      protocolChildren.push(
        ...topUnknown.map((row) => ({
          name: getDisplayName(row.contract_id),
          value: row.op_count,
          color: CATEGORY_COLORS.soroban,
          meta: {
            type: "contract" as const,
            id: row.contract_id,
            category: "soroban",
            protocol,
            opCount: row.op_count,
          },
        })),
      );

      if (restTotal > 0) {
        protocolChildren.push({
          name: "Other Contracts",
          value: restTotal,
          color: CATEGORY_COLORS.other,
          meta: {
            type: "entity",
            category: "soroban",
            protocol,
            opCount: restTotal,
          },
        });
      }
    }

    children.push({
      name: protocol,
      children: protocolChildren,
      meta: {
        type: "entity",
        category: "soroban",
        protocol,
        opCount: sumValues(protocolChildren),
      },
    });
  }

  return {
    name: GROUP_LABELS.soroban,
    children,
    meta: {
      type: "category",
      category: "soroban",
      opCount: sumValues(children),
    },
  };
}

function buildAccountBranch(
  group: string,
  accounts: AccountRow[],
): TreemapNode | null {
  const filtered = accounts.filter(
    (row) => getGroupForType(row.type_string) === group,
  );

  if (filtered.length === 0) {
    return null;
  }

  const byAccount = new Map<string, number>();
  for (const row of filtered) {
    byAccount.set(
      row.account_id,
      (byAccount.get(row.account_id) ?? 0) + row.op_count,
    );
  }

  const sorted = [...byAccount.entries()]
    .map(([account_id, op_count]) => ({ account_id, op_count }))
    .sort((a, b) => b.op_count - a.op_count);

  const byProtocol = new Map<string, { account_id: string; op_count: number }[]>();

  for (const row of sorted) {
    const protocol = getProtocolLabel(row.account_id);
    const list = byProtocol.get(protocol) ?? [];
    list.push(row);
    byProtocol.set(protocol, list);
  }

  const children: TreemapNode[] = [];

  for (const [protocol, rows] of byProtocol) {
    const known = rows.filter((row) => lookupEntity(row.account_id));
    const unknown = rows.filter((row) => !lookupEntity(row.account_id));

    const protocolChildren: TreemapNode[] = known.map((row) => ({
      name: getDisplayName(row.account_id),
      value: row.op_count,
      color: CATEGORY_COLORS[group] ?? CATEGORY_COLORS.other,
      meta: {
        type: "account",
        id: row.account_id,
        category: group,
        protocol,
        opCount: row.op_count,
      },
    }));

    const topUnknown = unknown.slice(0, UNKNOWN_ENTITY_TOP_N);
    const restUnknown = unknown.slice(UNKNOWN_ENTITY_TOP_N);
    const restTotal = restUnknown.reduce((sum, row) => sum + row.op_count, 0);

    protocolChildren.push(
      ...topUnknown.map((row) => ({
        name: getDisplayName(row.account_id),
        value: row.op_count,
        color: CATEGORY_COLORS[group] ?? CATEGORY_COLORS.other,
        meta: {
          type: "account" as const,
          id: row.account_id,
          category: group,
          protocol,
          opCount: row.op_count,
        },
      })),
    );

    if (restTotal > 0) {
      protocolChildren.push({
        name: "Other Accounts",
        value: restTotal,
        color: CATEGORY_COLORS.other,
        meta: {
          type: "entity",
          category: group,
          protocol,
          opCount: restTotal,
        },
      });
    }

    children.push({
      name: protocol,
      children: protocolChildren,
      meta: {
        type: "entity",
        category: group,
        protocol,
        opCount: sumValues(protocolChildren),
      },
    });
  }

  return {
    name: GROUP_LABELS[group] ?? group,
    children,
    meta: {
      type: "category",
      category: group,
      opCount: sumValues(children),
    },
  };
}

function buildOtherBranch(categories: CategoryRow[]): TreemapNode | null {
  const otherCategories = categories.filter(
    (row) => getGroupForType(row.type_string) === "other",
  );

  if (otherCategories.length === 0) {
    return null;
  }

  const children: TreemapNode[] = otherCategories.map((row) => ({
    name: row.type_string,
    value: row.op_count,
    color: CATEGORY_COLORS.other,
    meta: {
      type: "entity",
      category: "other",
      opCount: row.op_count,
    },
  }));

  return {
    name: GROUP_LABELS.other,
    children,
    meta: {
      type: "category",
      category: "other",
      opCount: sumValues(children),
    },
  };
}

export function buildKpis(
  categories: CategoryRow[],
  contracts: ContractRow[],
): ActivityKpis {
  const totalOps = categories.reduce((sum, row) => sum + row.op_count, 0);
  const sorobanOps = categories
    .filter((row) => getGroupForType(row.type_string) === "soroban")
    .reduce((sum, row) => sum + row.op_count, 0);

  const groupedTotals = new Map<string, number>();
  for (const row of categories) {
    const group = getGroupForType(row.type_string);
    groupedTotals.set(group, (groupedTotals.get(group) ?? 0) + row.op_count);
  }

  const topCategoryEntry = [...groupedTotals.entries()].sort(
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
  const { categories, contracts, accounts } = input;

  const branches: TreemapNode[] = [];

  const sorobanBranch = buildContractBranch(contracts);
  if (sorobanBranch) {
    branches.push(sorobanBranch);
  }

  for (const group of ["payments", "dex", "trustlines", "account"] as const) {
    const branch = buildAccountBranch(group, accounts);
    if (branch) {
      branches.push(branch);
    }
  }

  const otherBranch = buildOtherBranch(categories);
  if (otherBranch) {
    branches.push(otherBranch);
  }

  const totalOps = categories.reduce((sum, row) => sum + row.op_count, 0);

  const withShares = branches.map((branch) => ({
    ...branch,
    meta: {
      ...branch.meta,
      type: branch.meta?.type ?? "category",
      share:
        totalOps > 0 && branch.meta?.opCount
          ? (branch.meta.opCount / totalOps) * 100
          : 0,
    },
  }));

  return withNodeIds({
    name: "Network Activity",
    children: withShares,
    meta: {
      type: "root",
      opCount: totalOps,
    },
  });
}

export function attachShares(node: TreemapNode, total: number): TreemapNode {
  const value =
    node.value ??
    (node.children ? sumValues(node.children) : node.meta?.opCount ?? 0);

  return {
    ...node,
    value: node.children ? undefined : value,
    meta: {
      ...node.meta,
      type: node.meta?.type ?? "entity",
      share: total > 0 ? (value / total) * 100 : 0,
      opCount: value,
    },
    children: node.children?.map((child) => attachShares(child, total)),
  };
}
