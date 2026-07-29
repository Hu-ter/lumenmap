import { describe, it, expect } from "vitest";
import { buildKpis } from "@/lib/entities/build-treemap";
import type { CategoryRow, ContractRow, ActivityKpis } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal category row factory. */
function category(op_count: number, type_string = "invoke_host_function"): CategoryRow {
  return { type_string, op_count };
}

/** A minimal contract row factory. */
function contract(contract_id: string, op_count = 1): ContractRow {
  return { contract_id, op_count };
}

/** Shorthand — returns KPIs from only the arguments that matter for this test. */
function build(
  contracts: ContractRow[],
  totalActiveContracts?: number,
): ActivityKpis {
  return buildKpis([category(100)], contracts, totalActiveContracts);
}

// ---------------------------------------------------------------------------
// Provenance — the KPI field / type identity
// ---------------------------------------------------------------------------

describe("activeContracts KPI — metric provenance", () => {
  it("exposes activeContracts as a number field on ActivityKpis", () => {
    const kpis = build([contract("C1")], 1);
    // The key name "activeContracts" IS the provenance identifier.
    // No separate tag/label mechanism exists in the codebase per the existing
    // design (source:"hubble" on the response envelope is the data-source
    // provenance; each KPI's key is its metric identity).
    expect(kpis).toHaveProperty("activeContracts");
    expect(typeof kpis.activeContracts).toBe("number");
  });

  it("returns a correct shape alongside the other KPI fields", () => {
    const kpis = build([contract("C1")], 1);
    expect(kpis).toMatchObject({
      totalOps: expect.any(Number),
      sorobanShare: expect.any(Number),
      topCategory: expect.any(String),
      activeContracts: expect.any(Number),
    });
  });
});

// ---------------------------------------------------------------------------
// Decoupling from the capped contracts list
// ---------------------------------------------------------------------------

describe("activeContracts KPI — decoupled from capped list length", () => {
  it("uses the separate uncapped count when provided", () => {
    // The capped contracts list has 200 items, but there are 500 active contracts.
    const capped: ContractRow[] = Array.from({ length: 200 }, (_, i) =>
      contract(`C${i}`),
    );
    const uncapped = 500;

    const kpis = build(capped, uncapped);
    expect(kpis.activeContracts).toBe(500);
  });

  it("reflects the uncapped count even when it is below the list limit", () => {
    const capped: ContractRow[] = Array.from({ length: 200 }, (_, i) =>
      contract(`C${i}`),
    );
    const uncapped = 50;

    const kpis = build(capped, uncapped);
    expect(kpis.activeContracts).toBe(50);
  });

  it("reflects the uncapped count when it exactly equals the list limit", () => {
    const capped: ContractRow[] = Array.from({ length: 200 }, (_, i) =>
      contract(`C${i}`),
    );
    const uncapped = 200;

    const kpis = build(capped, uncapped);
    expect(kpis.activeContracts).toBe(200);
  });

  it("reflects the uncapped count when it is above the list limit", () => {
    const capped: ContractRow[] = Array.from({ length: 3 }, (_, i) =>
      contract(`C${i}`),
    );
    const uncapped = 10_000;

    const kpis = build(capped, uncapped);
    expect(kpis.activeContracts).toBe(10_000);
  });
});

// ---------------------------------------------------------------------------
// Boundary cases
// ---------------------------------------------------------------------------

describe("activeContracts KPI — boundary cases", () => {
  it("handles zero active contracts", () => {
    const kpis = build([], 0);
    expect(kpis.activeContracts).toBe(0);
  });

  it("handles zero uncapped count with a non-empty capped list (edge case)", () => {
    const kpis = build([contract("C1"), contract("C2")], 0);
    expect(kpis.activeContracts).toBe(0);
  });

  it("handles a single active contract", () => {
    const kpis = build([contract("C1")], 1);
    expect(kpis.activeContracts).toBe(1);
  });

  it("falls back to contracts.length when totalActiveContracts is omitted (backward compat)", () => {
    const kpis = build([contract("C1"), contract("C2")]);
    expect(kpis.activeContracts).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Duplicate semantics — deduplication
// ---------------------------------------------------------------------------

describe("activeContracts KPI — duplicate semantics", () => {
  it("uses the deduplicated uncapped count when duplicates exist in the capped list", () => {
    // The capped list has duplicate contract IDs, which inflate its length.
    const capped: ContractRow[] = [
      contract("C1"),
      contract("C2"),
      contract("C1"), // duplicate ID
      contract("C3"),
      contract("C2"), // duplicate ID
    ];
    // contracts.length   === 5
    // distinct contracts === 3
    const distinctUncapped = 3;

    const kpis = build(capped, distinctUncapped);
    // The KPI should reflect the deduplicated count, not the raw array length.
    expect(kpis.activeContracts).toBe(3);
    expect(capped.length).toBe(5); // Double check — array length differs.
  });
});

// ---------------------------------------------------------------------------
// Regression — mutating / truncating the contracts array
// ---------------------------------------------------------------------------

describe("activeContracts KPI — regression: unaffected by contract list mutations", () => {
  it("does not change when the contracts array is truncated", () => {
    const original: ContractRow[] = Array.from({ length: 200 }, (_, i) =>
      contract(`C${i}`),
    );
    const uncapped = 1_234;

    const kpis = build(original, uncapped);
    const before = kpis.activeContracts;

    // Simulate: the capped list gets truncated (e.g. a bug in the query layer).
    const truncated = original.slice(0, 10);
    const kpisAfterTruncation = build(truncated, uncapped);

    expect(before).toBe(1_234);
    expect(kpisAfterTruncation.activeContracts).toBe(before);
  });

  it("does not change when contracts array is mutated (extra items added)", () => {
    const original: ContractRow[] = [contract("C1")];
    const uncapped = 42;

    const kpis = build(original, uncapped);
    const before = kpis.activeContracts;

    // Simulate: the capped list grows (more items returned by a future query).
    const enlarged = [...original, contract("C2"), contract("C3")];
    const kpisAfterGrowth = build(enlarged, uncapped);

    expect(before).toBe(42);
    expect(kpisAfterGrowth.activeContracts).toBe(before);
  });

  it("does not change when contracts array is emptied", () => {
    const original: ContractRow[] = Array.from({ length: 200 }, (_, i) =>
      contract(`C${i}`),
    );
    const uncapped = 999;

    const kpis = build(original, uncapped);
    const before = kpis.activeContracts;

    const kpisEmpty = build([], uncapped);
    expect(before).toBe(999);
    expect(kpisEmpty.activeContracts).toBe(999);
  });
});
