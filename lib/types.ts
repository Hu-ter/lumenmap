import type {
  ActivityKpis,
  ActivityProvenance,
  ActivityResponse,
  DataSource,
  Metric,
  Period,
  TreemapNode,
} from "@/lib/schemas/activity-response";

export type {
  ActivityKpis,
  ActivityProvenance,
  ActivityResponse,
  DataSource,
  Metric,
  Period,
  TreemapNode,
};

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
}

export interface ContractRow {
  contract_id: string;
  op_count: number;
}

export interface AccountRow {
  account_id: string;
  type_string: string;
  op_count: number;
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

export interface TreemapNodeMeta {
  type: TreemapNodeType;
  id?: string;
  category?: string;
  protocol?: string;
  share?: number;
  opCount?: number;
  childCount?: number;
  eventType?: string;
}

export type ActivityTreemaps = ActivityResponse["treemaps"];

export interface SelectedNode {
  name: string;
  value: number;
  share: number;
  meta?: TreemapNodeMeta;
}
