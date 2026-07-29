import type { ActivityResponse, FreshnessMetadata } from "@/lib/types";

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

export const freshFreshness: FreshnessMetadata = {
  dataThrough: minutesAgo(5),
  lastRefreshed: minutesAgo(5),
};

export const delayedFreshness: FreshnessMetadata = {
  dataThrough: minutesAgo(185),
  lastRefreshed: minutesAgo(185),
};

export const cachedFreshness: FreshnessMetadata = {
  dataThrough: minutesAgo(185),
  lastRefreshed: minutesAgo(185),
};

export const freshResponse: Partial<ActivityResponse> = {
  freshness: freshFreshness,
};

export const delayedResponse: Partial<ActivityResponse> = {
  freshness: delayedFreshness,
};

export const cachedResponse: Partial<ActivityResponse> = {
  freshness: cachedFreshness,
};

export const unavailableResponse: Partial<ActivityResponse> = {};
