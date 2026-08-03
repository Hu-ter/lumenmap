import { NextResponse } from "next/server";
import { getActivityData } from "@/lib/hubble/activity";
import { isValidPeriod } from "@/lib/periods";
import type { ApiErrorResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");
  const period = isValidPeriod(periodParam) ? periodParam : "1d";

  try {
    const data = await getActivityData(period);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch activity data";
    console.error("[activity] Failed to fetch activity data:", message, error);

    const body: ApiErrorResponse = {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred. Please try again later.",
    };

    return NextResponse.json(body, { status: 500 });
  }
}
