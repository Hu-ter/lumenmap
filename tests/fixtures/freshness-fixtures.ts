import type { ActivityResponseMetadata } from "@/lib/types";

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

export const freshMetadata: Pick<
  ActivityResponseMetadata,
  "sourceTimestamp" | "isPeriodComplete"
> = {
  sourceTimestamp: minutesAgo(5),
  isPeriodComplete: true,
};

export const delayedMetadata: Pick<
  ActivityResponseMetadata,
  "sourceTimestamp" | "isPeriodComplete"
> = {
  sourceTimestamp: minutesAgo(185),
  isPeriodComplete: true,
};

export const cachedMetadata: Pick<
  ActivityResponseMetadata,
  "sourceTimestamp" | "isPeriodComplete"
> = {
  sourceTimestamp: minutesAgo(185),
  isPeriodComplete: true,
};

export const unavailableMetadata: Pick<
  ActivityResponseMetadata,
  "sourceTimestamp" | "isPeriodComplete"
> = {
  sourceTimestamp: "",
  isPeriodComplete: true,
};
