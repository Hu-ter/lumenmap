type Clock = () => number;

const cache = new Map<string, { data: unknown; expires: number }>();
let now: Clock = () => Date.now();

export function setClock(clock: Clock): void {
  now = clock;
}

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  if (now() > entry.expires) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCache(
  key: string,
  data: unknown,
  ttlSeconds = Number(process.env.CACHE_TTL_SECONDS ?? 900),
): void {
  cache.set(key, {
    data,
    expires: now() + ttlSeconds * 1000,
  });
  pruneCache();
}

export function pruneCache(): void {
  const currentTime = now();
  for (const [key, entry] of cache) {
    if (currentTime > entry.expires) {
      cache.delete(key);
    }
  }
}
