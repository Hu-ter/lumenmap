import type { ActivityResponse, Period } from "@/lib/types";

export const DETERMINISTIC_START = "2026-07-29T00:00:00.000Z";
export const DETERMINISTIC_END = "2026-07-29T23:59:59.000Z";

export function getMockLoadedActivity(period: Period = "1d"): ActivityResponse {
  return {
    period,
    start: DETERMINISTIC_START,
    end: DETERMINISTIC_END,
    source: "hubble",
    categories: [
      { type_string: "invoke_host_function", op_count: 5400 },
      { type_string: "payment", op_count: 3200 },
      { type_string: "manage_buy_offer", op_count: 1800 },
      { type_string: "change_trust", op_count: 900 },
      { type_string: "set_options", op_count: 400 },
      { type_string: "inflation", op_count: 100 },
    ],
    contracts: [
      { contract_id: "CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2", op_count: 3200 },
      { contract_id: "CCW67TSBVM25P5G5D2YVDXRE7ZKGTV2ZAGTQLYCD6LNZFSLIHYSLUYD3", op_count: 2200 },
    ],
    accounts: [
      { account_id: "GAAZI4TCR3TY5OJHCTJC2A4AFLGFFL6SPI4CYJJ3P7RQ4MVRZMKWC6KH", type_string: "payment", op_count: 1500 },
      { account_id: "GBXGQJWVLWOYHFLVTKWV5FGHA3LNYY2JQKM7OAJA6B2X5DVL3FA6YOKN", type_string: "manage_buy_offer", op_count: 1200 },
    ],
    sorobanFunctions: [
      { function_name: "swap", op_count: 3100 },
      { function_name: "deposit", op_count: 1500 },
      { function_name: "withdraw", op_count: 800 },
    ],
    sorobanFunctionContracts: [
      { function_name: "swap", contract_id: "CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2", op_count: 3100 },
    ],
    kpis: {
      totalOps: 11800,
      sorobanShare: 45.76,
      topCategory: "Soroban Contracts",
      activeContracts: 2,
    },
    treemaps: {
      events: {
        name: "Network Activity",
        value: 11800,
        meta: { type: "root", opCount: 11800 },
        children: [
          {
            name: "Soroban Contracts",
            value: 5400,
            color: "#7B61FF",
            meta: { type: "category", category: "soroban", opCount: 5400, share: 45.76, childCount: 3 },
            children: [
              {
                name: "swap",
                value: 3100,
                color: "#7B61FF",
                meta: { type: "entity", category: "soroban", opCount: 3100, eventType: "swap" },
              },
              {
                name: "deposit",
                value: 1500,
                color: "#7B61FF",
                meta: { type: "entity", category: "soroban", opCount: 1500, eventType: "deposit" },
              },
              {
                name: "withdraw",
                value: 800,
                color: "#7B61FF",
                meta: { type: "entity", category: "soroban", opCount: 800, eventType: "withdraw" },
              },
            ],
          },
          {
            name: "Payments",
            value: 3200,
            color: "#14B8A6",
            meta: { type: "category", category: "payments", opCount: 3200, share: 27.12, childCount: 1 },
            children: [
              {
                name: "payment",
                value: 3200,
                color: "#14B8A6",
                meta: { type: "entity", category: "payments", opCount: 3200, eventType: "payment" },
              },
            ],
          },
          {
            name: "DEX Trades",
            value: 1800,
            color: "#F59E0B",
            meta: { type: "category", category: "dex", opCount: 1800, share: 15.25, childCount: 1 },
            children: [
              {
                name: "manage buy offer",
                value: 1800,
                color: "#F59E0B",
                meta: { type: "entity", category: "dex", opCount: 1800, eventType: "manage_buy_offer" },
              },
            ],
          },
        ],
      },
      actors: {
        name: "Network Activity",
        value: 11800,
        meta: { type: "root", opCount: 11800 },
        children: [
          {
            name: "Soroban Contracts",
            value: 5400,
            color: "#7B61FF",
            meta: { type: "category", category: "soroban", opCount: 5400, share: 45.76, childCount: 2 },
            children: [
              {
                id: "CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2",
                name: "Soroswap Router",
                value: 3200,
                color: "#7B61FF",
                meta: { type: "contract", id: "CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2", category: "soroban", protocol: "Soroswap", opCount: 3200 },
              },
              {
                id: "CCW67TSBVM25P5G5D2YVDXRE7ZKGTV2ZAGTQLYCD6LNZFSLIHYSLUYD3",
                name: "Phoenix DEX",
                value: 2200,
                color: "#7B61FF",
                meta: { type: "contract", id: "CCW67TSBVM25P5G5D2YVDXRE7ZKGTV2ZAGTQLYCD6LNZFSLIHYSLUYD3", category: "soroban", protocol: "Phoenix", opCount: 2200 },
              },
            ],
          },
        ],
      },
    },
    timeseries: {
      granularity: "hour",
      totals: {
        transactions: 3800,
        operations: 11800,
      },
      buckets: [
        { timestamp: "2026-07-29T00:00:00.000Z", label: "00:00 UTC", transactions: 400, operations: 1200 },
        { timestamp: "2026-07-29T04:00:00.000Z", label: "04:00 UTC", transactions: 650, operations: 2100 },
        { timestamp: "2026-07-29T08:00:00.000Z", label: "08:00 UTC", transactions: 900, operations: 2900 },
        { timestamp: "2026-07-29T12:00:00.000Z", label: "12:00 UTC", transactions: 1100, operations: 3600 },
        { timestamp: "2026-07-29T16:00:00.000Z", label: "16:00 UTC", transactions: 750, operations: 2000, isPartial: true },
      ],
    },
  };
}

export function getMockEmptyActivity(period: Period = "1d"): ActivityResponse {
  return {
    period,
    start: DETERMINISTIC_START,
    end: DETERMINISTIC_END,
    source: "hubble",
    categories: [],
    contracts: [],
    accounts: [],
    sorobanFunctions: [],
    sorobanFunctionContracts: [],
    kpis: {
      totalOps: 0,
      sorobanShare: 0,
      topCategory: "N/A",
      activeContracts: 0,
    },
    treemaps: {
      events: { name: "Network Activity", value: 0, meta: { type: "root", opCount: 0 }, children: [] },
      actors: { name: "Network Activity", value: 0, meta: { type: "root", opCount: 0 }, children: [] },
    },
    timeseries: {
      granularity: "hour",
      totals: { transactions: 0, operations: 0 },
      buckets: [],
    },
  };
}
