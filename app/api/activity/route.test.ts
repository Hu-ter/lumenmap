import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import type { ActivityResponse } from "@/lib/types";

const mockGetActivityData = vi.fn();
const mockIsValidPeriod = vi.fn();

vi.mock("@/lib/hubble/activity", () => ({
  get getActivityData() {
    return mockGetActivityData;
  },
}));

vi.mock("@/lib/periods", () => ({
  get isValidPeriod() {
    return mockIsValidPeriod;
  },
}));

const successResponse: ActivityResponse = {
  period: "1d",
  start: "2026-07-29T00:00:00.000Z",
  end: "2026-07-29T23:59:59.999Z",
  source: "hubble",
  categories: [],
  contracts: [],
  accounts: [],
  sorobanFunctions: [],
  sorobanFunctionContracts: [],
  kpis: { totalOps: 0, sorobanShare: 0, topCategory: "", activeContracts: 0 },
  treemaps: {
    events: { name: "root", children: [] },
    actors: { name: "root", children: [] },
  },
};

function makeRequest(url: string): Request {
  return new Request(url);
}

async function jsonResponse(res: Response): Promise<unknown> {
  return res.headers.get("content-type")?.includes("json")
    ? res.json()
    : null;
}

async function assertStatus(res: Response, expected: number): Promise<void> {
  expect(res.status).toBe(expected);
}

describe("GET /api/activity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsValidPeriod.mockImplementation(
      (value: string | null): value is "1d" | "7d" | "30d" | "month" =>
        value === "1d" ||
        value === "7d" ||
        value === "30d" ||
        value === "month",
    );
  });

  describe("valid periods", () => {
    const periods = ["1d", "7d", "30d", "month"] as const;

    for (const period of periods) {
      it(`accepts "${period}" and returns 200 with success schema`, async () => {
        const body = { ...successResponse, period };
        mockGetActivityData.mockResolvedValue(body);

        const res = await GET(makeRequest(`http://localhost/api/activity?period=${period}`));
        const data = await jsonResponse(res);

        await assertStatus(res, 200);
        expect(data).toMatchObject({
          period,
          start: expect.any(String),
          end: expect.any(String),
          source: "hubble",
          categories: expect.any(Array),
          contracts: expect.any(Array),
          accounts: expect.any(Array),
          sorobanFunctions: expect.any(Array),
          sorobanFunctionContracts: expect.any(Array),
          kpis: expect.any(Object),
          treemaps: expect.any(Object),
        });
        expect(mockGetActivityData).toHaveBeenCalledTimes(1);
        expect(mockGetActivityData).toHaveBeenCalledWith(period);
      });
    }
  });

  describe("missing period", () => {
    it("defaults to '1d' and returns 200", async () => {
      mockGetActivityData.mockResolvedValue(successResponse);

      const res = await GET(makeRequest("http://localhost/api/activity"));
      const data = await jsonResponse(res);

      await assertStatus(res, 200);
      expect(data).toHaveProperty("period", "1d");
      expect(mockGetActivityData).toHaveBeenCalledTimes(1);
      expect(mockGetActivityData).toHaveBeenCalledWith("1d");
    });
  });

  describe("invalid period", () => {
    it("returns 400 without invoking provider", async () => {
      const res = await GET(makeRequest("http://localhost/api/activity?period=invalid"));
      const data = await jsonResponse(res);

      await assertStatus(res, 400);
      expect(data).toEqual({ error: "Invalid period" });
      expect(mockGetActivityData).not.toHaveBeenCalled();
    });

    it("returns 400 for empty string period", async () => {
      const res = await GET(makeRequest("http://localhost/api/activity?period="));
      const data = await jsonResponse(res);

      await assertStatus(res, 400);
      expect(data).toEqual({ error: "Invalid period" });
      expect(mockGetActivityData).not.toHaveBeenCalled();
    });
  });

  describe("provider failure", () => {
    it("returns 500 with safe error message for Error", async () => {
      mockGetActivityData.mockRejectedValue(new Error("BigQuery failure"));

      const res = await GET(makeRequest("http://localhost/api/activity?period=1d"));
      const data = await jsonResponse(res);

      await assertStatus(res, 500);
      expect(data).toEqual({ error: "BigQuery failure" });
      expect(mockGetActivityData).toHaveBeenCalledTimes(1);
    });

    it("returns 500 with fallback message for non-Error throw", async () => {
      mockGetActivityData.mockRejectedValue("raw string");

      const res = await GET(makeRequest("http://localhost/api/activity?period=7d"));
      const data = await jsonResponse(res);

      await assertStatus(res, 500);
      expect(data).toEqual({ error: "Failed to fetch activity data" });
      expect(mockGetActivityData).toHaveBeenCalledTimes(1);
    });
  });
});