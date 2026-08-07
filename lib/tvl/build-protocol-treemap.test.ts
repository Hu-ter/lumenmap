import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProtocolTvlTreemap } from "./build-protocol-treemap";
import { fetchProtocolTvlResults } from "./protocol-registry";

describe("protocol TVL treemap", () => {
  it("builds sized tiles from adapter snapshots with status metadata", async () => {
    const results = await fetchProtocolTvlResults();
    const treemap = buildProtocolTvlTreemap(results);

    assert.equal(treemap.metric, "tvl");
    assert.ok(Number(treemap.value) > 0);
    assert.ok((treemap.children?.length ?? 0) >= 4);

    const stale = treemap.children?.find((child) => child.name === "LOBSTR");
    assert.ok(stale);
    assert.equal(stale?.meta?.adapterStatus, "stale");
    assert.equal(stale?.meta?.adapterStatusLabel, "Stale");
    assert.ok((stale?.meta?.tvlUsd ?? 0) > 0);
    assert.ok(stale?.meta?.snapshotTime);
  });
});
