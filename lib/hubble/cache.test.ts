import { describe, it, expect, beforeEach } from "vitest";
import { getCached, setCache, setClock, pruneCache } from "./cache";

beforeEach(() => {
  setClock(() => Date.now());
});

describe("getCached", () => {
  it("returns null for a missing key", () => {
    expect(getCached("nope")).toBeNull();
  });

  it("returns typed data for a valid entry", () => {
    setCache("str", "hello");
    expect(getCached<string>("str")).toBe("hello");
  });

  it("returns null for an expired entry and deletes it", () => {
    setClock(() => 0);
    setCache("k", "v", 10);

    setClock(() => 15_000);
    expect(getCached("k")).toBeNull();
  });
});

describe("setCache", () => {
  it("stores an entry with the default TTL", () => {
    setClock(() => 1000);
    setCache("k", 42);
    expect(getCached<number>("k")).toBe(42);
  });

  it("accepts a custom TTL in seconds", () => {
    setClock(() => 0);
    setCache("k", "v", 60);
    setClock(() => 59_000);
    expect(getCached("k")).toBe("v");
    setClock(() => 61_000);
    expect(getCached("k")).toBeNull();
  });

  it("triggers pruning so expired entries from previous writes are removed", () => {
    setClock(() => 0);
    setCache("a", 1, 10);
    setCache("b", 2, 100);

    setClock(() => 20_000);
    setCache("c", 3);

    expect(getCached("a")).toBeNull();
    expect(getCached("b")).toBe(2);
    expect(getCached("c")).toBe(3);
  });
});

describe("pruneCache", () => {
  it("removes only expired entries", () => {
    setClock(() => 0);
    setCache("a", 1, 10);
    setCache("b", 2, 20);
    setCache("c", 3, 30);

    setClock(() => 15_000);
    pruneCache();

    expect(getCached("a")).toBeNull();
    expect(getCached("b")).toBe(2);
    expect(getCached("c")).toBe(3);
  });

  it("removes nothing when all entries are fresh", () => {
    setClock(() => 0);
    setCache("a", 1, 100);
    setCache("b", 2, 200);

    pruneCache();

    expect(getCached("a")).toBe(1);
    expect(getCached("b")).toBe(2);
  });

  it("handles an empty cache", () => {
    expect(() => pruneCache()).not.toThrow();
  });
});
