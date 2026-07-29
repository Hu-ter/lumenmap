import { NextResponse } from "next/server";
import { getActivityData } from "@/lib/hubble/activity";
import { isValidPeriod } from "@/lib/periods";
import {
  classifyError,
  createCorrelationId,
  endTimer,
  logError,
  logInfo,
  startTimer,
} from "@/lib/log";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  const timer = startTimer();

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");
  const period = isValidPeriod(periodParam) ? periodParam : "1d";

  logInfo({
    event: "activity.request.start",
    correlationId,
    period,
  });

  try {
    const data = await getActivityData(period, correlationId);

    logInfo({
      event: "activity.request.complete",
      correlationId,
      period,
      durationMs: endTimer(timer),
    });

    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch activity data";
    const errorClass = classifyError(error);

    logError({
      event: "activity.request.error",
      correlationId,
      period,
      durationMs: endTimer(timer),
      errorClass,
      errorMessage: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
