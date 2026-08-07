/** Active metric unit helpers for treemap tiles, tooltips, and detail. */

import type { DashboardMetricId } from "@/lib/types";

export interface MetricUnitInfo {
  id: DashboardMetricId;
  label: string;
  /** Short unit shown after compact values on tiles (may be empty for ops). */
  unitSuffix: string;
  /** Unit used in tooltips / spoken labels. */
  unitLabel: string;
}

const METRIC_UNITS: Record<string, MetricUnitInfo> = {
  ops: {
    id: "ops",
    label: "Operations",
    unitSuffix: "",
    unitLabel: "ops",
  },
  transactions: {
    id: "transactions" as DashboardMetricId,
    label: "Transactions",
    unitSuffix: "txns",
    unitLabel: "txns",
  },
  xlm_volume: {
    id: "xlm_volume",
    label: "XLM Volume",
    unitSuffix: "XLM",
    unitLabel: "XLM",
  },
  usdc: {
    id: "usdc",
    label: "USDC Volume",
    unitSuffix: "USDC",
    unitLabel: "USDC",
  },
  protocol_tvl: {
    id: "protocol_tvl",
    label: "Protocol TVL",
    unitSuffix: "USD",
    unitLabel: "USD",
  },
};

export function getMetricUnit(metric: DashboardMetricId): MetricUnitInfo {
  return METRIC_UNITS[metric] ?? METRIC_UNITS.ops;
}

export function formatMetricWithUnit(
  formattedValue: string,
  metric: DashboardMetricId,
): string {
  const { unitSuffix, unitLabel } = getMetricUnit(metric);
  const unit = unitSuffix || unitLabel;
  return unit ? `${formattedValue} ${unit}` : formattedValue;
}
