import { getBigQueryClient } from "./client";

export class HubError extends Error {
  constructor(
    message: string,
    public readonly code: "TIMEOUT" | "CANCELLATION" | "PROVIDER" | "VALIDATION",
  ) {
    super(message);
    this.name = "HubError";
  }
}

type ClientProvider = () => ReturnType<typeof getBigQueryClient>;
let provider: ClientProvider = getBigQueryClient;

export function setClientProvider(p: ClientProvider): void {
  provider = p;
}

interface QueryJob {
  cancel(): Promise<unknown>;
  getQueryResults(): Promise<[unknown[], unknown]>;
}

export const DEFAULT_QUERY_TIMEOUT_MS = 30_000;

export async function executeQuery<T>(
  query: string,
  params: Record<string, unknown>,
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT_MS,
): Promise<T[]> {
  const client = provider();
  if (!client) {
    throw new HubError("BigQuery client is not configured", "VALIDATION");
  }

  let job: QueryJob | null;
  try {
    const result = await client.createQueryJob({ query, params });
    job = (result[0] as unknown as QueryJob | undefined) ?? null;
  } catch (err) {
    throw new HubError(
      err instanceof Error ? err.message : "Failed to create query job",
      "PROVIDER",
    );
  }

  return new Promise<T[]>((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;

      if (job) {
        job.cancel().catch(() => {});
      }

      reject(new HubError("Query timed out", "TIMEOUT"));
    }, timeoutMs);

    if (!job) {
      return;
    }

    job.getQueryResults()
      .then(
        ([rows]) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(rows as T[]);
        },
      )
      .catch((err: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new HubError(err.message, "PROVIDER"));
      });
  });
}