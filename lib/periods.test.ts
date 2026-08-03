import { describe, expect, it } from "vitest";

import { isValidPeriod } from "./periods";

describe("isValidPeriod", () => {
  it("accepts supported periods and rejects unsupported values", () => {
    expect(isValidPeriod("1d")).toBe(true);
    expect(isValidPeriod("7d")).toBe(true);
    expect(isValidPeriod("30d")).toBe(true);
    expect(isValidPeriod("month")).toBe(true);
    expect(isValidPeriod("1y")).toBe(false);
    expect(isValidPeriod(null)).toBe(false);
  });
});
