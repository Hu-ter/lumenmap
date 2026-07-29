import { NextResponse } from "next/server";
import { getActivityData } from "@/lib/hubble/activity";
import { getMockEmptyActivity, getMockLoadedActivity } from "@/lib/hubble/fixtures";
import { isValidPeriod } from "@/lib/periods";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");
  const period = isValidPeriod(periodParam) ? periodParam : "1d";
  const mockState = searchParams.get("mockState");

  if (mockState === "empty") {
    return NextResponse.json(getMockEmptyActivity(period));
  }

  if (mockState === "error") {
    return NextResponse.json(
      { error: "BigQuery connection failed: Access Denied" },
      { status: 500 },
    );
  }

  if (mockState === "loaded" || mockState === "selected") {
    return NextResponse.json(getMockLoadedActivity(period));
  }

  try {
    const data = await getActivityData(period);
    return NextResponse.json(data);
  } catch (error) {
    if (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_MOCK_DATA === "true") {
      return NextResponse.json(getMockLoadedActivity(period));
    }

    const message =
      error instanceof Error ? error.message : "Failed to fetch activity data";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
