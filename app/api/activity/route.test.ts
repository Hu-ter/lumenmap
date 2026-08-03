import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { GET as legacyGET } from "./route";
import {
  GET as sharedGET,
  handleActivityRequest,
  parseActivityPeriod,
} from "./_handler";
import { GET as v1GET } from "../v1/activity/route";
import type { ActivityResponse, Period } from "@/lib/types";

const supportedPeriods: Period[] = ["1d", "7d", "30d", "month"];

function mockActivityResponse(period: Period): ActivityResponse {
  return {
    period,
    start: "2026-08-03T00:00:00.000Z",
    end: "2026-08-03T23:59:59.999Z",
    source: "hubble",
    sourceTimestamp: "2026-08-03T12:00:00.000Z",
    isPeriodComplete: false,
    categories: [],
    contracts: [],
    accounts: [],
    sorobanFunctions: [],
    sorobanFunctionContracts: [],
    kpis: {
      totalOps: 0,
      sorobanShare: 0,
      topCategory: "none",
      activeContracts: 0,
    },
    treemaps: {
      events: {
        name: "Events",
        metric: "operation_count",
        unit: { kind: "count", subject: "operation" },
      },
      actors: {
        name: "Actors",
        metric: "operation_count",
        unit: { kind: "count", subject: "operation" },
      },
      xlm_events: {
        name: "XLM Events",
        metric: "asset_volume",
        unit: {
          kind: "asset",
          asset: { type: "native", code: "XLM" },
        },
      },
      xlm_actors: {
        name: "XLM Actors",
        metric: "asset_volume",
        unit: {
          kind: "asset",
          asset: { type: "native", code: "XLM" },
        },
      },
    },
  };
}

describe("parseActivityPeriod", () => {
  test("defaults to 1d only when the period parameter is absent", () => {
    assert.deepEqual(parseActivityPeriod(null), { ok: true, period: "1d" });
  });

  test("accepts documented periods", () => {
    for (const period of supportedPeriods) {
      assert.deepEqual(parseActivityPeriod(period), { ok: true, period });
    }
  });

  test("rejects empty and unsupported explicit periods", () => {
    for (const period of ["", "1y"]) {
      assert.deepEqual(parseActivityPeriod(period), {
        ok: false,
        status: 400,
        body: {
          code: "INVALID_PERIOD",
          message: "Unsupported activity period.",
          supported: supportedPeriods,
        },
      });
    }
  });
});

describe("GET /api/activity and /api/v1/activity", () => {
  test("legacy and v1 routes share the same handler", () => {
    assert.equal(legacyGET, sharedGET);
    assert.equal(v1GET, sharedGET);
  });

  test("returns 200 and defaults to 1d when period is missing", async () => {
    const calls: Period[] = [];
    const response = await handleActivityRequest(
      new Request("http://localhost/api/activity"),
      async (period) => {
        calls.push(period);
        return mockActivityResponse(period);
      },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(calls, ["1d"]);
    assert.equal((await response.json()).period, "1d");
  });

  test("returns 200 for each supported period", async () => {
    const calls: Period[] = [];

    for (const period of supportedPeriods) {
      const response = await handleActivityRequest(
        new Request(`http://localhost/api/activity?period=${period}`),
        async (requestedPeriod) => {
          calls.push(requestedPeriod);
          return mockActivityResponse(requestedPeriod);
        },
      );

      assert.equal(response.status, 200);
      assert.equal((await response.json()).period, period);
    }

    assert.deepEqual(calls, supportedPeriods);
  });

  test("returns 400 for invalid explicit periods without invoking the provider", async () => {
    for (const period of ["", "1y"]) {
      let callCount = 0;
      const response = await handleActivityRequest(
        new Request(`http://localhost/api/activity?period=${period}`),
        async () => {
          callCount += 1;
          return mockActivityResponse("1d");
        },
      );

      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        code: "INVALID_PERIOD",
        message: "Unsupported activity period.",
        supported: supportedPeriods,
      });
      assert.equal(callCount, 0);
    }
  });

  test("returns identical successful responses for legacy and v1 paths", async () => {
    const fetchActivityData = async (period: Period) => mockActivityResponse(period);
    const injectedLegacy = await handleActivityRequest(
      new Request("http://localhost/api/activity?period=7d"),
      fetchActivityData,
    );
    const injectedV1 = await handleActivityRequest(
      new Request("http://localhost/api/v1/activity?period=7d"),
      fetchActivityData,
    );

    assert.equal(legacyGET, v1GET);
    assert.equal(injectedLegacy.status, 200);
    assert.equal(injectedV1.status, 200);
    assert.deepEqual(await injectedLegacy.json(), await injectedV1.json());
  });

  test("returns a safe provider error response", async () => {
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
      const response = await handleActivityRequest(
        new Request("http://localhost/api/v1/activity?period=30d"),
        async () => {
          throw new Error("BigQuery query failed with backend detail");
        },
      );

      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again later.",
      });
    } finally {
      console.error = originalConsoleError;
    }
  });
});
