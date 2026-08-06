import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildKpis } from "@/lib/entities/build-treemap";
import type { CategoryRow, ContractRow, ActivityKpis } from "@/lib/types";

function category(
  op_count: number,
  type_string = "invoke_host_function",
): CategoryRow {
  return { type_string, op_count };
}

function contract(contract_id: string, op_count = 1): ContractRow {
  return { contract_id, op_count };
}

function build(
  contracts: ContractRow[],
  totalActiveContracts?: number,
): ActivityKpis {
  return buildKpis([category(100)], contracts, [], totalActiveContracts);
}

describe("activeContracts KPI — metric provenance", () => {
  test("exposes activeContracts as an entity_count metric on ActivityKpis", () => {
    const kpis = build([contract("C1")], 1);
    assert.ok("activeContracts" in kpis);
    assert.equal(kpis.activeContracts.kind, "entity_count");
    assert.equal(kpis.activeContracts.unit, "count");
    assert.equal(typeof kpis.activeContracts.value, "number");
  });

  test("returns a correct shape alongside the other KPI fields", () => {
    const kpis = build([contract("C1")], 1);
    assert.equal(kpis.totalOps.kind, "operations");
    assert.equal(kpis.sorobanShare.kind, "share");
    assert.equal(typeof kpis.topCategory, "string");
    assert.equal(kpis.activeContracts.kind, "entity_count");
  });
});

describe("activeContracts KPI — decoupled from capped list length", () => {
  test("uses the separate uncapped count when provided", () => {
    const capped: ContractRow[] = Array.from({ length: 200 }, (_, i) =>
      contract(`C${i}`),
    );
    const kpis = build(capped, 500);
    assert.equal(kpis.activeContracts.value, 500);
  });

  test("reflects the uncapped count even when it is below the list limit", () => {
    const capped: ContractRow[] = Array.from({ length: 200 }, (_, i) =>
      contract(`C${i}`),
    );
    const kpis = build(capped, 50);
    assert.equal(kpis.activeContracts.value, 50);
  });

  test("reflects the uncapped count when it exactly equals the list limit", () => {
    const capped: ContractRow[] = Array.from({ length: 200 }, (_, i) =>
      contract(`C${i}`),
    );
    const kpis = build(capped, 200);
    assert.equal(kpis.activeContracts.value, 200);
  });

  test("reflects the uncapped count when it is above the list limit", () => {
    const capped: ContractRow[] = Array.from({ length: 3 }, (_, i) =>
      contract(`C${i}`),
    );
    const kpis = build(capped, 10_000);
    assert.equal(kpis.activeContracts.value, 10_000);
  });
});

describe("activeContracts KPI — boundary cases", () => {
  test("handles zero active contracts", () => {
    const kpis = build([], 0);
    assert.equal(kpis.activeContracts.value, 0);
  });

  test("handles zero uncapped count with a non-empty capped list", () => {
    const kpis = build([contract("C1"), contract("C2")], 0);
    assert.equal(kpis.activeContracts.value, 0);
  });

  test("handles a single active contract", () => {
    const kpis = build([contract("C1")], 1);
    assert.equal(kpis.activeContracts.value, 1);
  });

  test("falls back to contracts.length when totalActiveContracts is omitted", () => {
    const capped = [contract("C1"), contract("C2"), contract("C3")];
    const kpis = build(capped);
    assert.equal(kpis.activeContracts.value, 3);
  });
});

describe("activeContracts KPI — duplicates and mutation safety", () => {
  test("uncapped count is authoritative even with duplicate-looking capped ids", () => {
    const capped = [contract("C1"), contract("C1"), contract("C2")];
    const kpis = build(capped, 2);
    assert.equal(kpis.activeContracts.value, 2);
  });

  test("mutating the contracts array after KPI build does not change the KPI", () => {
    const capped = [contract("C1"), contract("C2")];
    const kpis = build(capped, 2);
    capped.push(contract("C3"));
    assert.equal(kpis.activeContracts.value, 2);
  });

  test("mutating contracts when falling back to length uses the length at call time", () => {
    const capped = [contract("C1"), contract("C2")];
    const kpis = build(capped);
    assert.equal(kpis.activeContracts.value, 2);
    capped.push(contract("C3"));
    assert.equal(kpis.activeContracts.value, 2);
  });
});
