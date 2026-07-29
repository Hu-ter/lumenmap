import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  executeQuery,
  HubError,
  setClientProvider,
  DEFAULT_QUERY_TIMEOUT_MS,
} from "./executor";

interface FakeJob {
  cancel(): Promise<unknown>;
  getQueryResults(): Promise<[unknown[], unknown]>;
}

interface FakeClient {
  createQueryJob(
    opts: { query: string; params: Record<string, unknown> },
  ): Promise<[FakeJob | null, unknown]>;
}

function createFakeClient(options?: {
  delayMs?: number;
  cancelFails?: boolean;
  noJob?: boolean;
}): { client: FakeClient; cancelCalled(): boolean } {
  const { delayMs = 0, cancelFails = false, noJob = false } = options ?? {};

  let cancelCalled = false;

  const job: FakeJob = {
    cancel: async () => {
      cancelCalled = true;
      if (cancelFails) {
        throw new Error("Simulated cancel failure");
      }
    },
    getQueryResults: async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      return [[{ id: 1 }], {}];
    },
  };

  const client: FakeClient = {
    createQueryJob: async () => {
      if (noJob) {
        return [null, {}];
      }
      return [job, {}];
    },
  };

  return {
    client,
    cancelCalled: () => cancelCalled,
  };
}

beforeEach(() => {
  setClientProvider(() => null);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("executeQuery", () => {
  it("returns rows when query completes before deadline", async () => {
    const { client } = createFakeClient({ delayMs: 1 });
    setClientProvider(() => client as never);

    const result = await executeQuery<{ id: number }>("SELECT 1", {});

    expect(result).toEqual([{ id: 1 }]);
  });

  it("rejects with TIMEOUT when query exceeds deadline and cancels the job", async () => {
    const { client, cancelCalled } = createFakeClient({ delayMs: 200 });
    setClientProvider(() => client as never);

    const promise = executeQuery("SELECT 1", {}, 20);

    await expect(promise).rejects.toThrow(HubError);
    await expect(promise).rejects.toMatchObject({ code: "TIMEOUT" });
    expect(cancelCalled()).toBe(true);
  });

  it("rejects with TIMEOUT when there is no job identity", async () => {
    const { client } = createFakeClient({ noJob: true });
    setClientProvider(() => client as never);

    const promise = executeQuery("SELECT 1", {}, 10);

    await expect(promise).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("rejects with TIMEOUT even when cancellation fails", async () => {
    const { client, cancelCalled } = createFakeClient({
      delayMs: 200,
      cancelFails: true,
    });
    setClientProvider(() => client as never);

    const promise = executeQuery("SELECT 1", {}, 20);

    await expect(promise).rejects.toMatchObject({ code: "TIMEOUT" });
    expect(cancelCalled()).toBe(true);
  });

  it("discards late completion after timeout", async () => {
    const { client, cancelCalled } = createFakeClient({ delayMs: 100 });
    setClientProvider(() => client as never);

    const promise = executeQuery("SELECT 1", {}, 10);

    await expect(promise).rejects.toMatchObject({ code: "TIMEOUT" });
    expect(cancelCalled()).toBe(true);

    // Wait for the late query to finish — it should be discarded
    await new Promise<void>((resolve) => setTimeout(resolve, 200));

    // Promise state is unchanged
    await expect(promise).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("rejects with VALIDATION when no client is configured", async () => {
    const promise = executeQuery("SELECT 1", {});
    await expect(promise).rejects.toThrow(HubError);
    await expect(promise).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("rejects with PROVIDER when createQueryJob fails", async () => {
    const failingClient = {
      createQueryJob: async () => {
        throw new Error("Network error");
      },
    };
    setClientProvider(() => failingClient as never);

    const promise = executeQuery("SELECT 1", {});
    await expect(promise).rejects.toMatchObject({ code: "PROVIDER" });
  });

  it("uses the default timeout constant", () => {
    expect(DEFAULT_QUERY_TIMEOUT_MS).toBe(30_000);
  });
});