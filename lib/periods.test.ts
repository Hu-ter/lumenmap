import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isValidPeriod, resolvePeriod } from "./periods";

function utcDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

describe("isValidPeriod", () => {
  test("accepts supported periods and rejects unsupported values", () => {
    assert.equal(isValidPeriod("1d"), true);
    assert.equal(isValidPeriod("7d"), true);
    assert.equal(isValidPeriod("30d"), true);
    assert.equal(isValidPeriod("month"), true);
    assert.equal(isValidPeriod("1y"), false);
    assert.equal(isValidPeriod(null), false);
  });
});

describe("resolvePeriod half-open convention", () => {
  test("1d range starts at UTC midnight and ends at next UTC midnight", () => {
    const range = resolvePeriod("1d", utcDate(2026, 6, 29));
    assert.equal(range.start.toISOString(), "2026-07-29T00:00:00.000Z");
    assert.equal(range.end.toISOString(), "2026-07-30T00:00:00.000Z");
  });

  test("includes an event exactly at start and excludes end", () => {
    const range = resolvePeriod("1d", utcDate(2026, 6, 29));
    const start = range.start.getTime();
    const end = range.end.getTime();
    assert.equal(start >= range.start.getTime() && start < range.end.getTime(), true);
    assert.equal(end >= range.start.getTime() && end < range.end.getTime(), false);
  });

  test("adjacent days do not overlap and abut at the boundary", () => {
    const day1 = resolvePeriod("1d", utcDate(2026, 6, 29));
    const day2 = resolvePeriod("1d", utcDate(2026, 6, 30));
    assert.equal(day1.end.getTime(), day2.start.getTime());
    const boundary = utcDate(2026, 6, 30).getTime();
    assert.equal(boundary < day1.end.getTime(), false);
    assert.equal(boundary >= day2.start.getTime(), true);
  });

  test("month ranges are half-open and abut cleanly", () => {
    const jul = resolvePeriod("month", utcDate(2026, 6, 15));
    const aug = resolvePeriod("month", utcDate(2026, 7, 15));
    assert.equal(jul.start.toISOString(), "2026-07-01T00:00:00.000Z");
    assert.equal(jul.end.toISOString(), "2026-08-01T00:00:00.000Z");
    assert.equal(aug.start.toISOString(), "2026-08-01T00:00:00.000Z");
    assert.equal(aug.end.toISOString(), "2026-09-01T00:00:00.000Z");
    assert.equal(jul.end.getTime(), aug.start.getTime());
  });

  test("1d covers exactly 24 hours; 7d and 30d cover exact day counts", () => {
    const d1 = resolvePeriod("1d", utcDate(2026, 6, 29));
    const d7 = resolvePeriod("7d", utcDate(2026, 6, 29));
    const d30 = resolvePeriod("30d", utcDate(2026, 6, 29));
    assert.equal(d1.end.getTime() - d1.start.getTime(), 86_400_000);
    assert.equal(d7.end.getTime() - d7.start.getTime(), 7 * 86_400_000);
    assert.equal(d30.end.getTime() - d30.start.getTime(), 30 * 86_400_000);
  });

  test("cache key stability uses clean midnight ISO strings", () => {
    const a = resolvePeriod("1d", new Date(Date.UTC(2026, 6, 29, 15, 30, 0)));
    const b = resolvePeriod("1d", new Date(Date.UTC(2026, 6, 29, 3, 0, 0)));
    assert.equal(a.start.toISOString(), b.start.toISOString());
    assert.equal(a.end.toISOString(), b.end.toISOString());
    assert.match(a.start.toISOString(), /T00:00:00\.000Z$/);
    assert.match(a.end.toISOString(), /T00:00:00\.000Z$/);
  });
});
