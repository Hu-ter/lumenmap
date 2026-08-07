import { NextResponse } from "next/server";
import { getCategoryShareData } from "@/lib/hubble/category-share";
import { isValidPeriod } from "@/lib/periods";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");
  const period = isValidPeriod(periodParam) ? periodParam : "1d";

  try {
    const data = await getCategoryShareData(period);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch category share series";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
