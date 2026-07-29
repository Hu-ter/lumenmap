import { describe, expect, it } from "vitest";
import { TOP_CONTRACT_LIMIT } from "@/lib/constants";
import { mapActiveContractCountRow } from "./queries";

describe("mapActiveContractCountRow", () => {
  it("counts each duplicate contract ID once", () => {
    const rows = [
      { contract_id: "CONTRACT_A" },
      { contract_id: "CONTRACT_B" },
      { contract_id: "CONTRACT_A" },
    ];

    expect(mapActiveContractCountRow(rows)).toEqual({
      active_contract_count: 2,
    });
  });

  it("excludes null, undefined, and empty contract IDs", () => {
    const rows = [
      { contract_id: "CONTRACT_A" },
      { contract_id: null },
      { contract_id: undefined },
      { contract_id: "" },
      { contract_id: "CONTRACT_B" },
    ];

    expect(mapActiveContractCountRow(rows)).toEqual({
      active_contract_count: 2,
    });
  });

  it("returns zero for an empty period", () => {
    expect(mapActiveContractCountRow([])).toEqual({
      active_contract_count: 0,
    });
  });

  it("can exceed TOP_CONTRACT_LIMIT, unlike the capped leaderboard", () => {
    const contractCount = TOP_CONTRACT_LIMIT + 50;
    const rows = Array.from({ length: contractCount }, (_, i) => ({
      contract_id: `CONTRACT_${i}`,
    }));

    expect(mapActiveContractCountRow(rows)).toEqual({
      active_contract_count: contractCount,
    });
  });
});
