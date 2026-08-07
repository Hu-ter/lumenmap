import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ExampleTvlAdapter, type TvlAdapterResult } from "./adapter";

describe("ProtocolTvlAdapter Contract", () => {
  it("validates a complete outcome", async () => {
    const mockResult: TvlAdapterResult = {
      protocol: "example-protocol",
      network: "stellar",
      status: "complete",
      snapshotTime: "2023-01-01T00:00:00Z",
      methodologyVersion: "1.0.0",
      positions: [
        {
          canonicalAsset: "XLM",
          nativeAmount: "1000",
          usdValue: "100.00",
          priceProvenance: {
            source: "example-oracle",
            timestamp: "2023-01-01T00:00:00Z",
          },
        },
      ],
    };

    const adapter = new ExampleTvlAdapter(mockResult);
    const result = await adapter.getTvl();

    assert.equal(result.status, "complete");
    assert.equal(result.protocol, "example-protocol");
    assert.equal(result.network, "stellar");
    assert.ok(result.snapshotTime);
    if (result.status === "complete") {
      assert.equal(result.methodologyVersion, "1.0.0");
      assert.equal(result.positions.length, 1);
      assert.equal(result.positions[0].canonicalAsset, "XLM");
      assert.equal(result.positions[0].priceProvenance.source, "example-oracle");
    } else {
      assert.fail("Result status is not complete");
    }
  });

  it("validates a partial outcome", async () => {
    const mockResult: TvlAdapterResult = {
      protocol: "example-protocol",
      network: "stellar",
      status: "partial",
      snapshotTime: "2023-01-01T00:00:00Z",
      methodologyVersion: "1.0.0",
      positions: [],
      error: "Failed to fetch some positions",
    };

    const adapter = new ExampleTvlAdapter(mockResult);
    const result = await adapter.getTvl();

    assert.equal(result.status, "partial");
    if (result.status === "partial") {
      assert.ok(result.methodologyVersion);
      assert.equal(result.error, "Failed to fetch some positions");
      assert.equal(result.positions.length, 0);
    } else {
      assert.fail("Result status is not partial");
    }
  });

  it("validates a stale outcome", async () => {
    const mockResult: TvlAdapterResult = {
      protocol: "example-protocol",
      network: "stellar",
      status: "stale",
      snapshotTime: "2023-01-01T00:00:00Z",
      methodologyVersion: "1.0.0",
      positions: [],
    };

    const adapter = new ExampleTvlAdapter(mockResult);
    const result = await adapter.getTvl();

    assert.equal(result.status, "stale");
    if (result.status === "stale") {
      assert.ok(result.methodologyVersion);
      assert.ok(result.positions);
    } else {
      assert.fail("Result status is not stale");
    }
  });

  it("validates an unsupported outcome", async () => {
    const mockResult: TvlAdapterResult = {
      protocol: "example-protocol",
      network: "stellar",
      status: "unsupported",
      snapshotTime: "2023-01-01T00:00:00Z",
      reason: "Network not supported yet",
    };

    const adapter = new ExampleTvlAdapter(mockResult);
    const result = await adapter.getTvl();

    assert.equal(result.status, "unsupported");
    if (result.status === "unsupported") {
      assert.equal(result.reason, "Network not supported yet");
      assert.equal("positions" in result, false);
    } else {
      assert.fail("Result status is not unsupported");
    }
  });

  it("validates a failed outcome", async () => {
    const mockResult: TvlAdapterResult = {
      protocol: "example-protocol",
      network: "stellar",
      status: "failed",
      snapshotTime: "2023-01-01T00:00:00Z",
      error: "Network timeout",
    };

    const adapter = new ExampleTvlAdapter(mockResult);
    const result = await adapter.getTvl();

    assert.equal(result.status, "failed");
    if (result.status === "failed") {
      assert.equal(result.error, "Network timeout");
      assert.equal("positions" in result, false);
    } else {
      assert.fail("Result status is not failed");
    }
  });
});
