/**
 * Metric contract system.
 *
 * Each metric type declares its unit, compact formatting rules, and
 * whether it represents a currency or a plain count.  The rest of the
 * UI reads from the active metric contract so that tiles, tooltips,
 * and the detail panel always show the correct unit.
 */

// ---------------------------------------------------------------------------
// Metric identifiers
// ---------------------------------------------------------------------------

export type MetricId = "operations" | "xlm_volume" | "usdc_volume" | "tvl_usd";

// ---------------------------------------------------------------------------
// Metric contract
// ---------------------------------------------------------------------------

export interface MetricContract {
  /** Machine-readable identifier. */
  id: MetricId;
  /** Human-readable label, e.g. "Operations". */
  label: string;
  /** Short unit suffix for compact display on tiles, e.g. "ops", "XLM". */
  unitSuffix: string;
  /** Full unit label for detail views, e.g. "operations", "XLM", "USDC". */
  unitLabel: string;
  /** Whether the metric represents a currency amount. */
  isCurrency: boolean;
  /** Number of decimal places for full (non-compact) display. */
  decimals: number;
  /** Optional currency symbol prefix, e.g. "$". */
  symbol?: string;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const METRICS: Record<MetricId, MetricContract> = {
  operations: {
    id: "operations",
    label: "Operations",
    unitSuffix: "ops",
    unitLabel: "operations",
    isCurrency: false,
    decimals: 0,
  },
  xlm_volume: {
    id: "xlm_volume",
    label: "XLM Volume",
    unitSuffix: "XLM",
    unitLabel: "XLM",
    isCurrency: true,
    decimals: 2,
  },
  usdc_volume: {
    id: "usdc_volume",
    label: "USDC Volume",
    unitSuffix: "USDC",
    unitLabel: "USDC",
    isCurrency: true,
    decimals: 2,
  },
  tvl_usd: {
    id: "tvl_usd",
    label: "TVL",
    unitSuffix: "USD",
    unitLabel: "USD",
    isCurrency: true,
    decimals: 2,
    symbol: "$",
  },
};

export const DEFAULT_METRIC: MetricId = "operations";

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format a numeric value into a **compact** string with the metric unit.
 *
 * Examples:
 *   formatMetricCompact(1_234_567, METRICS.operations)  → "1.2M ops"
 *   formatMetricCompact(98_500,    METRICS.xlm_volume)   → "98.5K XLM"
 *   formatMetricCompact(42,        METRICS.operations)   → "42 ops"
 *   formatMetricCompact(1_234_567, METRICS.tvl_usd)      → "$1.2M"
 */
export function formatMetricCompact(
  value: number,
  contract: MetricContract,
): string {
  const compact = compactNumber(value);

  if (contract.symbol) {
    // Currency with a symbol: "$1.2M" (suffix omitted when symbol present)
    return `${contract.symbol}${compact}`;
  }

  return `${compact} ${contract.unitSuffix}`;
}

/**
 * Format a numeric value into a **full** string with the metric unit.
 *
 * Examples:
 *   formatMetricFull(1_234_567, METRICS.operations)  → "1,234,567 operations"
 *   formatMetricFull(98_500.5,  METRICS.xlm_volume)   → "98,500.50 XLM"
 *   formatMetricFull(1_000,     METRICS.tvl_usd)      → "$1,000.00 USD"
 */
export function formatMetricFull(
  value: number,
  contract: MetricContract,
): string {
  const formatted = contract.isCurrency
    ? value.toLocaleString("en-US", {
        minimumFractionDigits: contract.decimals,
        maximumFractionDigits: contract.decimals,
      })
    : value.toLocaleString("en-US");

  if (contract.symbol) {
    return `${contract.symbol}${formatted} ${contract.unitLabel}`;
  }

  return `${formatted} ${contract.unitLabel}`;
}

/**
 * Return a compact representation of a number without any unit.
 */
function compactNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString("en-US");
}

/**
 * Look up the metric contract for a given ID, falling back to the
 * default "operations" contract.
 */
export function getMetricContract(id?: MetricId | null): MetricContract {
  if (id && METRICS[id]) {
    return METRICS[id];
  }
  return METRICS[DEFAULT_METRIC];
}
