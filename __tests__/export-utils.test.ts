import {
  buildExportMetadata,
  generateSafeFilename,
  getStructuredRowsForExport,
  flattenTreemapForCsv,
} from "@/lib/export-utils";
import type { ActivityResponse, Period } from "@/lib/types";
import type { TreemapViewId } from "@/lib/constants";

// Mock data for testing
const mockData: ActivityResponse = {
  period: "1d",
  start: "2026-07-28T00:00:00.000Z",
  end: "2026-07-28T23:59:59.999Z",
  source: "hubble",
  categories: [
    { type_string: "payment", op_count: 450000 },
    { type_string: "invoke_host_function", op_count: 320000 },
    { type_string: "other", op_count: 15000 },
  ],
  contracts: [
    { contract_id: "CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2", op_count: 125000 },
  ],
  accounts: [
    { account_id: "GABC123...", type_string: "payment", op_count: 89000 },
  ],
  sorobanFunctions: [
    { function_name: "swap", op_count: 210000 },
  ],
  sorobanFunctionContracts: [],
  kpis: {
    totalOps: 800000,
    sorobanShare: 40,
    topCategory: "Payments",
    activeContracts: 120,
  },
  treemaps: {
    events: {
      name: "Network Activity",
      value: 800000,
      meta: { type: "root", opCount: 800000 },
      children: [
        {
          name: "Payments",
          value: 450000,
          meta: { type: "category", category: "payments", opCount: 450000 },
          children: [],
        },
        {
          name: "Soroban",
          value: 320000,
          meta: { type: "category", category: "soroban", opCount: 320000 },
          children: [],
        },
        {
          name: "Other",
          value: 15000,
          meta: { type: "category", category: "other", opCount: 15000 },
          children: [],
        },
      ],
    },
    actors: {
      name: "Accounts & Contracts",
      value: 800000,
      meta: { type: "root", opCount: 800000 },
      children: [],
    },
  },
};

describe("Export Utilities", () => {
  test("generateSafeFilename produces deterministic safe names", () => {
    const name1 = generateSafeFilename("lumenmap-treemap", "Network Activity", "1d", "png", "20260728");
    const name2 = generateSafeFilename("lumenmap-data", "Accounts & Contracts", "7d", "csv", "20260728");

    expect(name1).toBe("lumenmap-treemap-network-activity-1d-20260728.png");
    expect(name2).toBe("lumenmap-data-accounts-contracts-7d-20260728.csv");
  });

  test("buildExportMetadata includes required fields", () => {
    const metadata = buildExportMetadata(mockData, "1d", "events", "Operation Types");

    expect(metadata.metric).toBe("Operation Types");
    expect(metadata.unit).toBe("operations");
    expect(metadata.period).toBe("1d");
    expect(metadata.timezone).toBe("UTC");
    expect(metadata.freshness).toContain("2026");
    expect(metadata.filters.period).toBe("1d");
    expect(metadata.generatedAt).toBeDefined();
  });

  test("getStructuredRowsForExport returns categories for events view", () => {
    const { rows, syntheticIdentifiers } = getStructuredRowsForExport(mockData, "events");

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some(r => r.source_table === "categories")).toBe(true);
    expect(syntheticIdentifiers).toContain("other");
  });

  test("getStructuredRowsForExport returns accounts/contracts for actors view", () => {
    const { rows } = getStructuredRowsForExport(mockData, "actors");

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some(r => r.source_table === "contracts" || r.source_table === "accounts")).toBe(true);
  });

  test("flattenTreemapForCsv correctly flattens hierarchy and marks synthetic rows", () => {
    const flat = flattenTreemapForCsv(mockData.treemaps.events);

    expect(flat.length).toBeGreaterThan(1);
    expect(flat[0].name).toBe("Network Activity");
    expect(flat.some(r => r.is_synthetic === "yes")).toBe(true); // "Other" row
    expect(flat.every(r => r.value !== undefined)).toBe(true);
  });

  test("CSV export metadata contains all required fields", () => {
    const metadata = buildExportMetadata(mockData, "30d", "actors", "Accounts & Contracts");

    expect(metadata).toHaveProperty("metric");
    expect(metadata).toHaveProperty("unit");
    expect(metadata).toHaveProperty("period");
    expect(metadata).toHaveProperty("timezone");
    expect(metadata).toHaveProperty("freshness");
    expect(metadata).toHaveProperty("filters");
    expect(metadata).toHaveProperty("generatedAt");
    expect(metadata).toHaveProperty("view");
  });
});
