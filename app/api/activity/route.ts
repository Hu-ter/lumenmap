import { NextResponse } from "next/server";
import { getActivityData } from "@/lib/hubble/activity";
import { isValidPeriod, PERIOD_OPTIONS } from "@/lib/periods";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");

  let period = "1d";
  
  if (periodParam !== null) {
    if (!isValidPeriod(periodParam)) {
      return NextResponse.json(
        {
          error: "Invalid period",
          supported: PERIOD_OPTIONS.map((p) => p.value),
        },
        { status: 400 }
      );
    }
    period = periodParam;
  }

  try {
    const data = await getActivityData(period);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch activity data";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
