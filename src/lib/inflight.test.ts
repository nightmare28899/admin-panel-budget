import { describe, expect, it, vi } from "vitest";
import { createInflightDeduper, requestKey } from "./inflight";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("requestKey", () => {
  it("is stable for equal args and distinct for different ones", () => {
    expect(requestKey("cards", 1, { a: 1 })).toBe(requestKey("cards", 1, { a: 1 }));
    expect(requestKey("cards", 1)).not.toBe(requestKey("cards", 2));
    expect(requestKey("cards")).not.toBe(requestKey("subs"));
  });
});

describe("createInflightDeduper", () => {
  it("shares one call between concurrent callers with the same key", async () => {
    const dedupe = createInflightDeduper();
    const d = deferred<string>();
    const fn = vi.fn(() => d.promise);
    const a = dedupe("k", fn);
    const b = dedupe("k", fn);
    expect(fn).toHaveBeenCalledTimes(1);
    d.resolve("ok");
    await expect(Promise.all([a, b])).resolves.toEqual(["ok", "ok"]);
  });

  it("runs separate calls for different keys", async () => {
    const dedupe = createInflightDeduper();
    const fn = vi.fn(async () => 1);
    await Promise.all([dedupe("a", fn), dedupe("b", fn)]);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("clears the entry once settled so a later call refetches", async () => {
    const dedupe = createInflightDeduper();
    const fn = vi.fn(async () => 1);
    await dedupe("k", fn);
    await dedupe("k", fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("clears the entry after a rejection and propagates it to all waiters", async () => {
    const dedupe = createInflightDeduper();
    const d = deferred<number>();
    const fn = vi.fn(() => d.promise);
    const a = dedupe("k", fn);
    const b = dedupe("k", fn);
    d.reject(new Error("boom"));
    await expect(a).rejects.toThrow("boom");
    await expect(b).rejects.toThrow("boom");
    const next = vi.fn(async () => 2);
    await expect(dedupe("k", next)).resolves.toBe(2);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("clears the entry when fn throws synchronously", async () => {
    const dedupe = createInflightDeduper();
    expect(() =>
      dedupe("k", () => {
        throw new Error("sync");
      }),
    ).toThrow("sync");
    const fn = vi.fn(async () => 3);
    await expect(dedupe("k", fn)).resolves.toBe(3);
  });

  it("reuses the settled result within the ttl window, then refetches", async () => {
    let now = 1_000;
    const dedupe = createInflightDeduper({ now: () => now });
    const fn = vi.fn(async () => now);
    expect(await dedupe("k", fn, { ttlMs: 500 })).toBe(1_000);
    now = 1_300;
    expect(await dedupe("k", fn, { ttlMs: 500 })).toBe(1_000);
    expect(fn).toHaveBeenCalledTimes(1);
    now = 1_501;
    expect(await dedupe("k", fn, { ttlMs: 500 })).toBe(1_501);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not cache rejections within the ttl window", async () => {
    const dedupe = createInflightDeduper({ now: () => 0 });
    await expect(dedupe("k", async () => { throw new Error("x"); }, { ttlMs: 500 })).rejects.toThrow("x");
    const fn = vi.fn(async () => 1);
    await expect(dedupe("k", fn, { ttlMs: 500 })).resolves.toBe(1);
  });

  it("invalidate drops in-flight and ttl entries", async () => {
    const dedupe = createInflightDeduper({ now: () => 0 });
    const fn = vi.fn(async () => 1);
    await dedupe("k", fn, { ttlMs: 10_000 });
    dedupe.invalidate("k");
    await dedupe("k", fn, { ttlMs: 10_000 });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("collapses a StrictMode-style double invocation into one call", async () => {
    const dedupe = createInflightDeduper();
    const d = deferred<string>();
    const fn = vi.fn(() => d.promise);
    const mount = () => dedupe("getCardsAction", fn);
    const first = mount();
    const second = mount(); // effect re-run
    d.resolve("data");
    await Promise.all([first, second]);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
