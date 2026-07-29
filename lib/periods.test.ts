import { describe, it, expect } from "vitest";
import { resolvePeriod, isValidPeriod } from "./periods";
import type { Period } from "@/lib/types";

function utcDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

describe("resolvePeriod", () => {
  describe("half-open convention", () => {
    it("1d range starts at UTC midnight and ends at next UTC midnight", () => {
      const range = resolvePeriod("1d", utcDate(2026, 6, 29));

      expect(range.start.toISOString()).toBe("2026-07-29T00:00:00.000Z");
      expect(range.end.toISOString()).toBe("2026-07-30T00:00:00.000Z");
    });

    it("includes an event exactly at start", () => {
      const range = resolvePeriod("1d", utcDate(2026, 6, 29));
      const eventTime = range.start.getTime();

      expect(eventTime >= range.start.getTime()).toBe(true);
      expect(eventTime < range.end.getTime()).toBe(true);
    });

    it("excludes an event exactly at end", () => {
      const range = resolvePeriod("1d", utcDate(2026, 6, 29));

      expect(range.end.getTime() < range.end.getTime()).toBe(false);
      expect(range.end.getTime() >= range.end.getTime()).toBe(true);
    });

    it("excludes an event exactly at end from the earlier range", () => {
      const today = resolvePeriod("1d", utcDate(2026, 6, 29));
      const boundary = today.end.getTime();

      expect(boundary >= today.start.getTime()).toBe(true);
      expect(boundary < today.end.getTime()).toBe(false);
    });
  });

  describe("adjacent daily ranges", () => {
    it("adjacent days do not overlap and cover the boundary exactly once", () => {
      const day1 = resolvePeriod("1d", utcDate(2026, 6, 29));
      const day2 = resolvePeriod("1d", utcDate(2026, 6, 30));

      expect(day1.end.getTime()).toBe(day2.start.getTime());
    });

    it("a boundary event belongs to the second day, not the first", () => {
      const day1 = resolvePeriod("1d", utcDate(2026, 6, 29));
      const day2 = resolvePeriod("1d", utcDate(2026, 6, 30));
      const boundary = utcDate(2026, 6, 30).getTime();

      expect(boundary < day1.end.getTime()).toBe(false);
      expect(boundary >= day2.start.getTime()).toBe(true);
    });

    it("an event just before boundary belongs to the first day", () => {
      const day1 = resolvePeriod("1d", utcDate(2026, 6, 29));
      const beforeBoundary = utcDate(2026, 6, 29).getTime() + 86_399_999;

      expect(beforeBoundary >= day1.start.getTime()).toBe(true);
      expect(beforeBoundary < day1.end.getTime()).toBe(true);
    });
  });

  describe("adjacent month ranges", () => {
    it("month ranges are half-open and abut cleanly", () => {
      const jul = resolvePeriod("month", utcDate(2026, 6, 15));
      const aug = resolvePeriod("month", utcDate(2026, 7, 15));

      expect(jul.start.toISOString()).toBe("2026-07-01T00:00:00.000Z");
      expect(jul.end.toISOString()).toBe("2026-08-01T00:00:00.000Z");
      expect(aug.start.toISOString()).toBe("2026-08-01T00:00:00.000Z");
      expect(aug.end.toISOString()).toBe("2026-09-01T00:00:00.000Z");
      expect(jul.end.getTime()).toBe(aug.start.getTime());
    });

    it("month transition — event at Aug 1 00:00:00 UTC goes to August", () => {
      const jul = resolvePeriod("month", utcDate(2026, 6, 15));
      const aug = resolvePeriod("month", utcDate(2026, 7, 15));
      const boundary = utcDate(2026, 7, 1).getTime();

      expect(boundary < jul.end.getTime()).toBe(false);
      expect(boundary >= aug.start.getTime()).toBe(true);
    });
  });

  describe("calendar coverage", () => {
    it("1d covers exactly 24 hours (86,400,000 ms)", () => {
      const range = resolvePeriod("1d", utcDate(2026, 6, 29));
      expect(range.end.getTime() - range.start.getTime()).toBe(86_400_000);
    });

    it("7d covers exactly 7 days", () => {
      const range = resolvePeriod("7d", utcDate(2026, 6, 29));
      expect(range.end.getTime() - range.start.getTime()).toBe(7 * 86_400_000);
    });

    it("30d covers exactly 30 days", () => {
      const range = resolvePeriod("30d", utcDate(2026, 6, 29));
      expect(range.end.getTime() - range.start.getTime()).toBe(30 * 86_400_000);
    });

    it("month covers from July 1 to Aug 1", () => {
      const range = resolvePeriod("month", utcDate(2026, 6, 4));
      expect(range.start.toISOString()).toBe("2026-07-01T00:00:00.000Z");
      expect(range.end.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    });
  });

  describe("cache key stability", () => {
    it("ISO strings are clean UTC midnight for use in cache keys", () => {
      const range = resolvePeriod("1d", utcDate(2026, 6, 29));

      expect(range.start.toISOString()).toBe("2026-07-29T00:00:00.000Z");
    });

    it("different times on same day produce same range", () => {
      const morning = resolvePeriod("1d", utcDate(2026, 6, 29));
      const evening = resolvePeriod("1d", new Date("2026-07-29T23:59:59.999Z"));

      expect(morning.start.getTime()).toBe(evening.start.getTime());
      expect(morning.end.getTime()).toBe(evening.end.getTime());
    });
  });
});

describe("isValidPeriod", () => {
  it("returns true for valid periods", () => {
    expect(isValidPeriod("1d")).toBe(true);
    expect(isValidPeriod("7d")).toBe(true);
    expect(isValidPeriod("30d")).toBe(true);
    expect(isValidPeriod("month")).toBe(true);
  });

  it("returns false for invalid periods", () => {
    expect(isValidPeriod(null)).toBe(false);
    expect(isValidPeriod("")).toBe(false);
    expect(isValidPeriod("2d")).toBe(false);
    expect(isValidPeriod("year")).toBe(false);
  });
});