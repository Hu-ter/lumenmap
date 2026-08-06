#!/usr/bin/env node
/**
 * Automated test suite for the freshness classification logic.
 *
 * Mirrors lib/freshness.ts inline (no TS import) so this script runs
 * with plain Node without a transpile step.
 *
 * Run via: npm run test:freshness
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

// ── Inline the logic from lib/freshness.ts ────────────────────────────────────

const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * @param {string | undefined} sourceTimestamp
 * @param {Date} [now]
 * @returns {"fresh" | "stale" | "unknown"}
 */
function classifyFreshness(sourceTimestamp, now = new Date()) {
  if (!sourceTimestamp) return "unknown";
  const dataThrough = new Date(sourceTimestamp).getTime();
  if (Number.isNaN(dataThrough)) return "unknown";
  const lagMs = now.getTime() - dataThrough;
  return lagMs >= STALE_THRESHOLD_MS ? "stale" : "fresh";
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

describe("classifyFreshness", () => {
  it("returns 'fresh' when lag is zero (data end = now)", () => {
    const now = new Date(1_000_000_000_000);
    assert.strictEqual(classifyFreshness(now.toISOString(), now), "fresh");
  });

  it("returns 'fresh' when lag is 1ms under threshold", () => {
    const now = new Date(1_000_000_000_000);
    const end = new Date(now.getTime() - (STALE_THRESHOLD_MS - 1));
    assert.strictEqual(classifyFreshness(end.toISOString(), now), "fresh");
  });

  it("returns 'stale' when lag equals threshold exactly (>= boundary)", () => {
    const now = new Date(1_000_000_000_000);
    const end = new Date(now.getTime() - STALE_THRESHOLD_MS);
    assert.strictEqual(classifyFreshness(end.toISOString(), now), "stale");
  });

  it("returns 'stale' when lag is 1ms over threshold", () => {
    const now = new Date(1_000_000_000_000);
    const end = new Date(now.getTime() - (STALE_THRESHOLD_MS + 1));
    assert.strictEqual(classifyFreshness(end.toISOString(), now), "stale");
  });

  it("returns 'stale' when lag is 24h (far over threshold)", () => {
    const now = new Date(1_000_000_000_000);
    const end = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    assert.strictEqual(classifyFreshness(end.toISOString(), now), "stale");
  });

  it("returns 'fresh' when end is in the future (clock skew / test)", () => {
    const now = new Date(1_000_000_000_000);
    const end = new Date(now.getTime() + 60_000);
    assert.strictEqual(classifyFreshness(end.toISOString(), now), "fresh");
  });

  it("returns 'unknown' when sourceTimestamp is undefined", () => {
    assert.strictEqual(classifyFreshness(undefined), "unknown");
  });

  it("returns 'unknown' when sourceTimestamp is empty string", () => {
    assert.strictEqual(classifyFreshness("", new Date()), "unknown");
  });

  it("returns 'unknown' when sourceTimestamp is not a valid date string", () => {
    assert.strictEqual(classifyFreshness("not-a-date", new Date()), "unknown");
  });

  it("STALE_THRESHOLD_MS is 4 hours", () => {
    assert.strictEqual(STALE_THRESHOLD_MS, 4 * 60 * 60 * 1000);
  });
});
