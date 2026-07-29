import type { ActivityResponse } from "../activity-response";

/** Representative valid visualization response for schema tests. */
export const validActivityResponseFixture: ActivityResponse = {
  period: "1d",
  start: "2026-07-28T00:00:00.000Z",
  end: "2026-07-28T23:59:59.999Z",
  source: "hubble",
  provenance: {
    source: "hubble",
    methodology:
      "Operation counts aggregated from Hubble BigQuery for the selected period.",
    generatedAt: "2026-07-29T00:00:00.000Z",
  },
  categories: [{ type_string: "payment", op_count: 100 }],
  contracts: [{ contract_id: "CABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDE", op_count: 40 }],
  accounts: [
    {
      account_id: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEF",
      type_string: "payment",
      op_count: 60,
    },
  ],
  sorobanFunctions: [{ function_name: "transfer", op_count: 40 }],
  sorobanFunctionContracts: [
    {
      function_name: "transfer",
      contract_id: "CABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDE",
      op_count: 40,
    },
  ],
  kpis: {
    totalOps: { kind: "operations", unit: "ops", value: 100 },
    sorobanShare: { kind: "share", unit: "percent", value: 40 },
    topCategory: "Payments",
    activeContracts: { kind: "entity_count", unit: "count", value: 1 },
  },
  treemaps: {
    events: {
      name: "Network Activity",
      value: 100,
      meta: { type: "root", opCount: 100 },
      children: [
        {
          name: "Payments",
          value: 60,
          meta: {
            type: "category",
            category: "payments",
            opCount: 60,
            share: 60,
            childCount: 1,
          },
          children: [
            {
              name: "payment",
              value: 60,
              meta: {
                type: "entity",
                category: "payments",
                opCount: 60,
                eventType: "payment",
              },
            },
          ],
        },
        {
          name: "Soroban Contracts",
          value: 40,
          meta: {
            type: "category",
            category: "soroban",
            opCount: 40,
            share: 40,
            childCount: 1,
          },
          children: [
            {
              name: "transfer",
              value: 40,
              meta: {
                type: "entity",
                category: "soroban",
                opCount: 40,
                eventType: "transfer",
              },
            },
          ],
        },
      ],
    },
    actors: {
      name: "Network Activity",
      value: 100,
      meta: { type: "root", opCount: 100 },
      children: [
        {
          name: "Payments",
          value: 60,
          color: "#14B8A6",
          meta: {
            type: "category",
            category: "payments",
            opCount: 60,
            share: 60,
            childCount: 1,
          },
          children: [
            {
              id: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEF",
              name: "Example Wallet",
              value: 60,
              meta: {
                type: "account",
                id: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEF",
                category: "payments",
                opCount: 60,
              },
            },
          ],
        },
      ],
    },
  },
};

export function cloneValidFixture(): ActivityResponse {
  return structuredClone(validActivityResponseFixture);
}
