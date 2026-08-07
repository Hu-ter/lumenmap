import type { ProtocolTvlAdapter, TvlAdapterResult } from "@/lib/tvl/adapter";
import { ExampleTvlAdapter } from "@/lib/tvl/adapter";

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function completeResult(
  protocol: string,
  usdValue: string,
  hoursSinceSnapshot: number,
): TvlAdapterResult {
  return {
    protocol,
    network: "stellar",
    status: "complete",
    methodologyVersion: "1.0.0",
    snapshotTime: hoursAgo(hoursSinceSnapshot),
    positions: [
      {
        canonicalAsset: "USD",
        nativeAmount: usdValue,
        usdValue,
        priceProvenance: {
          source: "fixture-adapter",
          timestamp: hoursAgo(hoursSinceSnapshot),
        },
      },
    ],
  };
}

function staleResult(protocol: string, usdValue: string): TvlAdapterResult {
  return {
    protocol,
    network: "stellar",
    status: "stale",
    methodologyVersion: "1.0.0",
    snapshotTime: hoursAgo(30),
    error: "Snapshot older than 24h",
    positions: [
      {
        canonicalAsset: "USD",
        nativeAmount: usdValue,
        usdValue,
        priceProvenance: {
          source: "fixture-adapter",
          timestamp: hoursAgo(30),
        },
      },
    ],
  };
}

function partialResult(protocol: string, usdValue: string): TvlAdapterResult {
  return {
    protocol,
    network: "stellar",
    status: "partial",
    methodologyVersion: "1.0.0",
    snapshotTime: hoursAgo(8),
    error: "Missing secondary venue inventory",
    positions: [
      {
        canonicalAsset: "USD",
        nativeAmount: usdValue,
        usdValue,
        priceProvenance: {
          source: "fixture-adapter",
          timestamp: hoursAgo(8),
        },
      },
    ],
  };
}

/** Fixture-backed snapshots so Protocol TVL works without live venue APIs. */
export const PROTOCOL_TVL_FIXTURE_RESULTS: TvlAdapterResult[] = [
  completeResult("Soroswap", "15000000", 1),
  completeResult("Circle", "500000000", 0.5),
  partialResult("Kraken", "100000000"),
  staleResult("LOBSTR", "50000000"),
  completeResult("MoneyGram", "75000000", 0.25),
];

export const PROTOCOL_TVL_ADAPTERS: ProtocolTvlAdapter[] =
  PROTOCOL_TVL_FIXTURE_RESULTS.map(
    (result) => new ExampleTvlAdapter(result),
  );

export async function fetchProtocolTvlResults(): Promise<TvlAdapterResult[]> {
  return Promise.all(PROTOCOL_TVL_ADAPTERS.map((adapter) => adapter.getTvl()));
}
