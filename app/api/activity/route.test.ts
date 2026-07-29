import { GET } from "./route";
import { getActivityData } from "@/lib/hubble/activity";
import { NextRequest } from "next/server";

// Mock the activity data fetcher
jest.mock("@/lib/hubble/activity", () => ({
  getActivityData: jest.fn(),
}));

describe("GET /api/activity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 and defaults to 1d when period is missing", async () => {
    const request = new Request("http://localhost/api/activity");
    
    (getActivityData as jest.Mock).mockResolvedValue({ data: "mock" });

    const response = await GET(request);
    
    expect(response.status).toBe(200);
    expect(getActivityData).toHaveBeenCalledTimes(1);
    expect(getActivityData).toHaveBeenCalledWith("1d");
  });

  it("returns 200 for valid periods", async () => {
    const periods = ["1d", "7d", "30d", "month"];
    
    for (const period of periods) {
      const request = new Request(`http://localhost/api/activity?period=${period}`);
      (getActivityData as jest.Mock).mockResolvedValue({ data: "mock" });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(getActivityData).toHaveBeenCalledWith(period);
    }
    expect(getActivityData).toHaveBeenCalledTimes(periods.length);
  });

  it("returns 400 for empty period", async () => {
    const request = new Request("http://localhost/api/activity?period=");
    
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid period");
    expect(data.supported).toEqual(["1d", "7d", "30d", "month"]);
    expect(getActivityData).not.toHaveBeenCalled();
  });

  it("returns 400 for unsupported period", async () => {
    const request = new Request("http://localhost/api/activity?period=1y");
    
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid period");
    expect(data.supported).toEqual(["1d", "7d", "30d", "month"]);
    expect(getActivityData).not.toHaveBeenCalled();
  });
});
