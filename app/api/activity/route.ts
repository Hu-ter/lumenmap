import { NextResponse } from "next/server";
import { getActivityData } from "@/lib/hubble/activity";
import { isValidPeriod } from "@/lib/periods";
import {
  ActivityResponseValidationError,
  publicValidationErrorBody,
  validateActivityResponse,
} from "@/lib/schemas/validate-activity-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");
  const period = isValidPeriod(periodParam) ? periodParam : "1d";

  try {
    const data = await getActivityData(period);
    const validated = validateActivityResponse(data);
    return NextResponse.json(validated);
  } catch (error) {
    if (error instanceof ActivityResponseValidationError) {
      console.error(`[activity] ${error.diagnostic}`);
      return NextResponse.json(publicValidationErrorBody(), { status: 500 });
    }

    const message =
      error instanceof Error ? error.message : "Failed to fetch activity data";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
