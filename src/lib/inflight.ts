/**
 * Shares one promise between callers that ask for the same thing at the same
 * time (React StrictMode double effects, several components mounting together).
 * The entry is dropped as soon as the call settles, so later calls refetch and
 * mutations never see stale data. An optional short `ttlMs` also reuses a
 * successful result for a brief window (rejections are never reused).
 */
export type InflightOptions = { ttlMs?: number };

type Entry = { promise: Promise<unknown>; settledAt?: number; ttlMs: number };

export function requestKey(name: string, ...args: unknown[]): string {
  return args.length === 0 ? name : `${name}:${JSON.stringify(args)}`;
}

export function createInflightDeduper({ now = Date.now }: { now?: () => number } = {}) {
  const entries = new Map<string, Entry>();

  function dedupe<T>(key: string, fn: () => Promise<T>, { ttlMs = 0 }: InflightOptions = {}): Promise<T> {
    const existing = entries.get(key);
    if (existing) {
      const fresh = existing.settledAt === undefined || now() - existing.settledAt <= existing.ttlMs;
      if (fresh) return existing.promise as Promise<T>;
      entries.delete(key);
    }

    const promise = fn();
    const entry: Entry = { promise, ttlMs };
    entries.set(key, entry);

    const settle = (ok: boolean) => {
      if (entries.get(key) !== entry) return;
      if (ok && ttlMs > 0) entry.settledAt = now();
      else entries.delete(key);
    };
    promise.then(
      () => settle(true),
      () => settle(false),
    );
    return promise;
  }

  dedupe.invalidate = (key?: string) => {
    if (key === undefined) entries.clear();
    else entries.delete(key);
  };

  return dedupe;
}

/** Process-wide instance for client code. */
export const dedupeInflight = createInflightDeduper();
