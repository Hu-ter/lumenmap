#!/usr/bin/env node
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import legacyRoute from "@/app/api/activity/route";
import v1Route from "@/app/api/v1/activity/route";

const { GET: sharedGet, setActivityFetcher } = legacyRoute;

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function makeRequest(url) {
  return new Request(url);
}

async function readJson(response) {
  const body = await response.json();
  return { status: response.status, headers: response.headers, body };
}

function makeActivityPayload(period) {
  return {
    period,
    start: "2026-07-29T00:00:00.000Z",
    end: "2026-07-29T23:59:59.999Z",
    source: "hubble",
    categories: [],
    contracts: [],
    accounts: [],
    sorobanFunctions: [],
    sorobanFunctionContracts: [],
    kpis: {
      totalOps: 0,
      sorobanShare: 0,
      topCategory: "",
      activeContracts: 0,
    },
    treemaps: {
      events: { name: "Network Activity", children: [] },
      actors: { name: "Accounts & Contracts", children: [] },
    },
  };
}

const SUPPORTED_PERIODS = ["1d", "7d", "30d", "month"];

test.afterEach(() => {
  setActivityFetcher(null);
});

test("/api/v1/activity accepts every supported period", async () => {
  for (const period of SUPPORTED_PERIODS) {
    setActivityFetcher(async (p) => makeActivityPayload(p));
    const response = await sharedGet(
      makeRequest(`http://localhost/api/v1/activity?period=${period}`),
    );
    const { status, body } = await readJson(response);
    assert.equal(status, 200, `expected 200 for period=${period}`);
    assert.equal(body.period, period);
    assert.equal(body.source, "hubble");
    assert.deepEqual(Object.keys(body).sort(), [
      "accounts",
      "categories",
      "contracts",
      "end",
      "kpis",
      "period",
      "sorobanFunctionContracts",
      "sorobanFunctions",
      "source",
      "start",
      "treemaps",
    ]);
  }
});

test("/api/v1/activity defaults to 1d when period is omitted", async () => {
  let seenPeriod = null;
  setActivityFetcher(async (p) => {
    seenPeriod = p;
    return makeActivityPayload(p);
  });
  const response = await sharedGet(
    makeRequest("http://localhost/api/v1/activity"),
  );
  const { status, body } = await readJson(response);
  assert.equal(status, 200);
  assert.equal(seenPeriod, "1d");
  assert.equal(body.period, "1d");
});

test("/api/v1/activity returns 400 for an invalid period", async () => {
  let called = false;
  setActivityFetcher(async () => {
    called = true;
    return makeActivityPayload("1d");
  });
  const response = await sharedGet(
    makeRequest("http://localhost/api/v1/activity?period=foo"),
  );
  const { status, body } = await readJson(response);
  assert.equal(status, 400);
  assert.equal(body.error, "Unsupported period: foo");
  assert.equal(called, false, "fetcher must not be invoked for invalid periods");
});

test("/api/v1/activity returns 400 for an empty period string", async () => {
  const response = await sharedGet(
    makeRequest("http://localhost/api/v1/activity?period="),
  );
  const { status, body } = await readJson(response);
  assert.equal(status, 400);
  assert.equal(body.error, "Unsupported period: ");
});

test("/api/v1/activity returns 503 when the provider is not configured", async () => {
  setActivityFetcher(async () => {
    throw new Error("BigQuery credentials are required");
  });
  const response = await sharedGet(
    makeRequest("http://localhost/api/v1/activity?period=7d"),
  );
  const { status, body } = await readJson(response);
  assert.equal(status, 503);
  assert.equal(body.error, "Activity provider is not configured");
});

test("/api/v1/activity returns 500 with a safe message on provider failure", async () => {
  setActivityFetcher(async () => {
    throw new Error("BigQuery query failed: 7 INTERNAL: streaming chunk error");
  });
  const response = await sharedGet(
    makeRequest("http://localhost/api/v1/activity?period=30d"),
  );
  const { status, body } = await readJson(response);
  assert.equal(status, 500);
  assert.equal(body.error, "Failed to fetch activity data");
  assert.ok(
    !JSON.stringify(body).includes("streaming chunk"),
    "raw provider error must not leak to the response",
  );
});

test("/api/v1/activity returns 500 when fetcher throws a non-Error value", async () => {
  setActivityFetcher(async () => {
    throw "boom";
  });
  const response = await sharedGet(
    makeRequest("http://localhost/api/v1/activity?period=month"),
  );
  const { status, body } = await readJson(response);
  assert.equal(status, 500);
  assert.equal(body.error, "Failed to fetch activity data");
});

test("legacy and v1 route files re-export the shared handler", async () => {
  assert.equal(legacyRoute.GET, sharedGet, "legacy GET must equal shared GET");
  assert.equal(v1Route.GET, sharedGet, "v1 GET must equal shared GET");
  assert.equal(
    legacyRoute.dynamic,
    sharedGet.dynamic ?? legacyRoute.dynamic,
    "dynamic export is preserved",
  );
});

test("legacy and v1 routes return identical payloads for the same period", async () => {
  setActivityFetcher(async (p) => makeActivityPayload(p));
  const url = "http://localhost/api/activity?period=7d";
  const legacy = await readJson(await legacyRoute.GET(makeRequest(url)));
  const v1 = await readJson(
    await v1Route.GET(makeRequest("http://localhost/api/v1/activity?period=7d")),
  );
  assert.equal(legacy.status, 200);
  assert.equal(v1.status, 200);
  assert.deepEqual(legacy.body, v1.body);
});

test("legacy route also enforces 400 for invalid periods", async () => {
  const response = await legacyRoute.GET(
    makeRequest("http://localhost/api/activity?period=foo"),
  );
  const { status, body } = await readJson(response);
  assert.equal(status, 400);
  assert.equal(body.error, "Unsupported period: foo");
});

test("v1 route also returns 503 for missing provider configuration", async () => {
  setActivityFetcher(async () => {
    throw new Error("BigQuery client is not configured");
  });
  const response = await v1Route.GET(
    makeRequest("http://localhost/api/v1/activity?period=1d"),
  );
  const { status, body } = await readJson(response);
  assert.equal(status, 503);
  assert.equal(body.error, "Activity provider is not configured");
});

test("v1 route sets a Cache-Control header on successful responses", async () => {
  setActivityFetcher(async (p) => makeActivityPayload(p));
  const response = await v1Route.GET(
    makeRequest("http://localhost/api/v1/activity?period=1d"),
  );
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("cache-control") || "",
    /max-age=900/,
    "expected Cache-Control: max-age=900",
  );
});

test("README documents /api/v1/activity and marks /api/activity as deprecated", () => {
  const readme = readFileSync(`${repoRoot}README.md`, "utf8");
  assert.match(readme, /###\s+`GET \/api\/v1\/activity`/);
  assert.match(readme, /`GET \/api\/activity`.*deprecated/is);
  assert.match(readme, /`400`/);
  assert.match(readme, /`503`/);
});
