import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  parseCacheTtl,
  setCache,
  getCached,
  clearCache,
  setClock,
  pruneCache,
  DEFAULT_CACHE_TTL_SECONDS,
  MIN_CACHE_TTL_SECONDS,
  MAX_CACHE_TTL_SECONDS,
} from "./cache";

describe("parseCacheTtl", () => {
  test("missing or empty configuration uses default TTL (900s)", () => {
    assert.equal(parseCacheTtl(undefined), DEFAULT_CACHE_TTL_SECONDS);
    assert.equal(parseCacheTtl(null), DEFAULT_CACHE_TTL_SECONDS);
    assert.equal(parseCacheTtl(""), DEFAULT_CACHE_TTL_SECONDS);
    assert.equal(parseCacheTtl("   "), DEFAULT_CACHE_TTL_SECONDS);
  });

  test("valid numeric and string values within [1, 86400] range are accepted", () => {
    assert.equal(parseCacheTtl(MIN_CACHE_TTL_SECONDS), 1);
    assert.equal(parseCacheTtl(60), 60);
    assert.equal(parseCacheTtl("300"), 300);
    assert.equal(parseCacheTtl(900), 900);
    assert.equal(parseCacheTtl(3600), 3600);
    assert.equal(parseCacheTtl(MAX_CACHE_TTL_SECONDS), 86400);
    assert.equal(parseCacheTtl("86400"), 86400);
  });

  test("floats within valid range are floored to whole seconds", () => {
    assert.equal(parseCacheTtl(300.7), 300);
    assert.equal(parseCacheTtl("150.9"), 150);
  });

  test("non-numeric inputs fall back to default TTL", () => {
    assert.equal(parseCacheTtl("invalid"), DEFAULT_CACHE_TTL_SECONDS);
    assert.equal(parseCacheTtl("abc"), DEFAULT_CACHE_TTL_SECONDS);
    assert.equal(parseCacheTtl({}), DEFAULT_CACHE_TTL_SECONDS);
    assert.equal(parseCacheTtl([]), DEFAULT_CACHE_TTL_SECONDS);
  });

  test("non-finite inputs (NaN, Infinity, -Infinity) fall back to default TTL", () => {
    assert.equal(parseCacheTtl(NaN), DEFAULT_CACHE_TTL_SECONDS);
    assert.equal(parseCacheTtl(Infinity), DEFAULT_CACHE_TTL_SECONDS);
    assert.equal(parseCacheTtl(-Infinity), DEFAULT_CACHE_TTL_SECONDS);
  });

  test("zero falls back to default TTL", () => {
    assert.equal(parseCacheTtl(0), DEFAULT_CACHE_TTL_SECONDS);
    assert.equal(parseCacheTtl("0"), DEFAULT_CACHE_TTL_SECONDS);
  });

  test("negative values fall back to default TTL", () => {
    assert.equal(parseCacheTtl(-1), DEFAULT_CACHE_TTL_SECONDS);
    assert.equal(parseCacheTtl(-900), DEFAULT_CACHE_TTL_SECONDS);
    assert.equal(parseCacheTtl("-60"), DEFAULT_CACHE_TTL_SECONDS);
  });

  test("over-limit values (> 86400) fall back to default TTL", () => {
    assert.equal(parseCacheTtl(MAX_CACHE_TTL_SECONDS + 1), DEFAULT_CACHE_TTL_SECONDS);
    assert.equal(parseCacheTtl(100_000), DEFAULT_CACHE_TTL_SECONDS);
    assert.equal(parseCacheTtl("9999999"), DEFAULT_CACHE_TTL_SECONDS);
  });
});

describe("in-memory cache behavior", () => {
  beforeEach(() => {
    clearCache();
  });

  test("setCache and getCached store and retrieve data with valid TTL", () => {
    setCache("testKey", { foo: "bar" }, 60);
    const cached = getCached<{ foo: string }>("testKey");
    assert.deepEqual(cached, { foo: "bar" });
  });

  test("setCache with invalid TTL parameters safely falls back to default TTL", () => {
    setCache("invalidTtlKey", "value", -500);
    assert.equal(getCached<string>("invalidTtlKey"), "value");

    setCache("nanTtlKey", "value2", NaN);
    assert.equal(getCached<string>("nanTtlKey"), "value2");
  });

  test("setCache using process.env.CACHE_TTL_SECONDS handles valid and invalid env vars", () => {
    const originalEnv = process.env.CACHE_TTL_SECONDS;
    try {
      process.env.CACHE_TTL_SECONDS = "600";
      setCache("envValid", "data1");
      assert.equal(getCached<string>("envValid"), "data1");

      process.env.CACHE_TTL_SECONDS = "-999";
      setCache("envInvalid", "data2");
      assert.equal(getCached<string>("envInvalid"), "data2");

      delete process.env.CACHE_TTL_SECONDS;
      setCache("envMissing", "data3");
      assert.equal(getCached<string>("envMissing"), "data3");
    } finally {
      process.env.CACHE_TTL_SECONDS = originalEnv;
    }
  });

  test("getCached returns null for non-existent keys", () => {
    assert.equal(getCached("nonexistent"), null);
  });
});


describe("proactive expired-entry pruning", () => {
  beforeEach(() => {
    clearCache();
    setClock(() => Date.now());
  });

  test("setCache prunes expired entries from previous writes", () => {
    setClock(() => 0);
    setCache("a", 1, 10);
    setCache("b", 2, 100);

    setClock(() => 20_000);
    setCache("c", 3, 100);

    assert.equal(getCached("a"), null);
    assert.equal(getCached<number>("b"), 2);
    assert.equal(getCached<number>("c"), 3);
  });

  test("pruneCache removes only expired entries", () => {
    setClock(() => 0);
    setCache("a", 1, 10);
    setCache("b", 2, 20);
    setCache("c", 3, 30);

    setClock(() => 15_000);
    pruneCache();

    assert.equal(getCached("a"), null);
    assert.equal(getCached<number>("b"), 2);
    assert.equal(getCached<number>("c"), 3);
  });

  test("pruneCache removes nothing when all entries are fresh", () => {
    setClock(() => 0);
    setCache("a", 1, 100);
    setCache("b", 2, 200);

    pruneCache();

    assert.equal(getCached<number>("a"), 1);
    assert.equal(getCached<number>("b"), 2);
  });

  test("pruneCache handles an empty cache", () => {
    assert.doesNotThrow(() => pruneCache());
  });

  test("unexpired entries survive pruning after controlled clock advance", () => {
    setClock(() => 0);
    setCache("fresh", "ok", 60);
    setCache("stale", "bye", 5);

    setClock(() => 10_000);
    pruneCache();

    assert.equal(getCached("stale"), null);
    assert.equal(getCached<string>("fresh"), "ok");
  });
});
