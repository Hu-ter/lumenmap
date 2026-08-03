import { NextResponse } from "next/server";
import { getActivityData } from "@/lib/hubble/activity";
import { isValidPeriod, PERIOD_OPTIONS } from "@/lib/periods";
import type { ActivityResponse, ApiErrorResponse, Period } from "@/lib/types";

export const dynamic = "force-dynamic";

const SUPPORTED_PERIODS = PERIOD_OPTIONS.map((period) => period.value);

export function parseActivityPeriod(periodParam: string | null):
  | { ok: true; period: Period }
  | { ok: false; body: ApiErrorResponse; status: 400 } {
  if (periodParam === null) {
    return { ok: true, period: "1d" };
  }

  if (!isValidPeriod(periodParam)) {
    return {
      ok: false,
      body: {
        code: "INVALID_PERIOD",
        message: "Unsupported activity period.",
        supported: SUPPORTED_PERIODS,
      },
      status: 400,
    };
  }

  return { ok: true, period: periodParam };
}

export async function handleActivityRequest(
  request: Request,
  fetchActivityData: (period: Period) => Promise<ActivityResponse> = getActivityData,
) {
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");
  const parsed = parseActivityPeriod(periodParam);

  if (!parsed.ok) {
    return NextResponse.json(parsed.body, { status: parsed.status });
  }

  try {
    const data = await fetchActivityData(parsed.period);
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

export async function GET(request: Request) {
  return handleActivityRequest(request);
}
