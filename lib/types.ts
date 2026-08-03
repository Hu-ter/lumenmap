export type Period = "1d" | "7d" | "30d" | "month";

export type DataSource = "hubble";

/** Stable identifiers used by the public treemap contract. */
export type MetricId =
  | "operation_count"
  | "transaction_count"
  | "asset_volume"
  | "tvl";

/** Internal selector values for the two metrics currently backed by queries. */
export type DashboardMetricId = "ops" | "xlm_volume";

export type CountUnit =
  | { kind: "count"; subject: "operation" }
  | { kind: "count"; subject: "transaction" };

export type AssetIdentity =
  | { type: "native"; code: "XLM" }
  | { type: "issued"; code: string; issuer: string };

export type AssetUnit = { kind: "asset"; asset: AssetIdentity };

/**
 * A discriminated metric contract keeps identifiers, serialized values, and
 * units coupled. Asset amounts are strings so consumers cannot accidentally
 * treat them as count values.
 */
export type MetricContract =
  | {
      metric: "operation_count";
      value: number;
      unit: { kind: "count"; subject: "operation" };
    }
  | {
      metric: "transaction_count";
      value: number;
      unit: { kind: "count"; subject: "transaction" };
    }
  | { metric: "asset_volume"; value: string; unit: AssetUnit }
  | { metric: "tvl"; value: string; unit: AssetUnit };

type MetricVariant<M extends MetricId> = Extract<MetricContract, { metric: M }>;

export type MetricValue<M extends MetricId> = MetricVariant<M>["value"];
export type MetricUnit<M extends MetricId> = MetricVariant<M>["unit"];

export const OPERATION_COUNT_UNIT = {
  kind: "count",
  subject: "operation",
} as const satisfies MetricUnit<"operation_count">;

export const XLM_ASSET_UNIT = {
  kind: "asset",
  asset: { type: "native", code: "XLM" },
} as const satisfies MetricUnit<"asset_volume">;

export type TreemapNodeType =
  | "root"
  | "category"
  | "entity"
  | "contract"
  | "account";

export interface EntityInfo {
  name: string;
  category: string;
  protocol: string;
}

export interface CategoryRow {
  type_string: string;
  op_count: number;
  xlm_volume?: number;
}

export interface ContractRow {
  contract_id: string;
  op_count: number;
}

export interface AccountRow {
  account_id: string;
  type_string: string;
  op_count: number;
  xlm_volume?: number;
}

export interface SorobanFunctionRow {
  function_name: string;
  op_count: number;
}

export interface SorobanFunctionContractRow {
  function_name: string;
  contract_id: string;
  op_count: number;
}

export interface ActivityKpis {
  totalOps: number;
  sorobanShare: number;
  topCategory: string;
  activeContracts: number;
}

export interface TreemapNodeMeta {
  type: TreemapNodeType;
  id?: string;
  category?: string;
  protocol?: string;
  share?: number;
  opCount?: number;
  xlmVolume?: number;
  childCount?: number;
  eventType?: string;
}

export interface TreemapNode<TValue extends number | string = number> {
  id?: string;
  name: string;
  value?: TValue;
  color?: string;
  children?: TreemapNode<TValue>[];
  meta?: TreemapNodeMeta;
}

export type TreemapPayload<M extends MetricId> = TreemapNode<MetricValue<M>> & {
  metric: M;
  unit: MetricUnit<M>;
};

export interface ActivityTreemaps {
  events: TreemapPayload<"operation_count">;
  actors: TreemapPayload<"operation_count">;
  xlm_events: TreemapPayload<"asset_volume">;
  xlm_actors: TreemapPayload<"asset_volume">;
}

export interface ActivityResponse {
  period: Period;
  start: string;
  end: string;
  source: DataSource;
  sourceTimestamp: string;
  isPeriodComplete: boolean;
  categories: CategoryRow[];
  contracts: ContractRow[];
  accounts: AccountRow[];
  sorobanFunctions: SorobanFunctionRow[];
  sorobanFunctionContracts: SorobanFunctionContractRow[];
  kpis: ActivityKpis;
  treemaps: ActivityTreemaps;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  supported?: Period[];
}

export interface SelectedNode {
  name: string;
  value: number;
  share: number;
  meta?: TreemapNodeMeta;
}
