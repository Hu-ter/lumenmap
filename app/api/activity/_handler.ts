import { NextResponse } from "next/server";
import { getActivityData as defaultGetActivityData } from "@/lib/hubble/activity";
import { isValidPeriod } from "@/lib/periods";
import type { ActivityResponse, Period } from "@/lib/types";

export const dynamic = "force-dynamic";

export type ActivityFetcher = (period: Period) => Promise<ActivityResponse>;

let activityFetcher: ActivityFetcher = defaultGetActivityData;

export function setActivityFetcher(
  fetcher: ActivityFetcher | null,
): ActivityFetcher {
  const previous = activityFetcher;
  activityFetcher = fetcher ?? defaultGetActivityData;
  return previous;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");

  if (periodParam !== null && !isValidPeriod(periodParam)) {
    return NextResponse.json(
      { error: `Unsupported period: ${periodParam}` },
      { status: 400 },
    );
  }

  const period = isValidPeriod(periodParam) ? periodParam : "1d";

  try {
    const data = await activityFetcher(period);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=900, s-maxage=900" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    const isProviderConfigError =
      message.includes("BigQuery credentials are required") ||
      message.includes("BigQuery client is not configured");

    if (isProviderConfigError) {
      return NextResponse.json(
        { error: "Activity provider is not configured" },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch activity data" },
      { status: 500 },
    );
  }
}
