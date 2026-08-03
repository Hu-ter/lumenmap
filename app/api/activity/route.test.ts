import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { handleActivityRequest, parseActivityPeriod } from "./route";
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
      events: { name: "Events" },
      actors: { name: "Actors" },
      xlm_events: { name: "XLM Events" },
      xlm_actors: { name: "XLM Actors" },
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

describe("GET /api/activity", () => {
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
});
