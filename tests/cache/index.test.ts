import { describe, it, expect, beforeEach } from "vitest";

import {
  dateKey,
  readAiCache,
  readKpiCache,
  withKpiCache,
  writeAiCache,
  writeKpiCache,
} from "@/lib/cache";

/*
 * Cache module unit tests. We don't connect to Supabase — instead we
 * provide a fake client that records calls and returns canned data.
 * This verifies the contract:
 *
 *   • read returns null on cache miss / expired entries
 *   • write upserts with the right keys + onConflict shape
 *   • withKpiCache short-circuits on hit, computes + writes on miss
 *   • dateKey is YYYY-MM-DD and reflects offsetDays
 */

const STUDIO = "11111111-1111-1111-1111-111111111111";

type Row = Record<string, unknown>;
type FakeRecord = { from: string; method: string; args: unknown[] };

function makeFakeSupabase(state: { rows?: Row[]; throwOnRead?: boolean }) {
  const calls: FakeRecord[] = [];
  const recordCall = (record: FakeRecord) => calls.push(record);

  const queryBuilder = (from: string) => {
    let chain: Row[] = state.rows ?? [];
    const builder: Record<string, unknown> = {
      select() {
        recordCall({ from, method: "select", args: [...arguments] });
        return builder;
      },
      eq() {
        recordCall({ from, method: "eq", args: [...arguments] });
        return builder;
      },
      maybeSingle: async () => {
        if (state.throwOnRead) throw new Error("read failure");
        return { data: chain[0] ?? null, error: null };
      },
      upsert(payload: Row | Row[], opts?: { onConflict?: string }) {
        recordCall({ from, method: "upsert", args: [payload, opts] });
        chain = Array.isArray(payload) ? payload : [payload];
        return Promise.resolve({ data: null, error: null });
      },
    };
    return builder;
  };

  return {
    client: { from: (table: string) => queryBuilder(table) },
    calls,
  };
}

describe("kpi_cache", () => {
  let fake: ReturnType<typeof makeFakeSupabase>;
  const key = {
    bucket: "directory_kpis" as const,
    periodStart: "2026-04-29",
    periodEnd: "2026-04-29",
  };

  beforeEach(() => {
    fake = makeFakeSupabase({ rows: [] });
  });

  it("readKpiCache returns null on empty result", async () => {
    const out = await readKpiCache(fake.client as never, STUDIO, key);
    expect(out).toBeNull();
  });

  it("readKpiCache returns null for expired entries (>5 min)", async () => {
    const stale = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    fake = makeFakeSupabase({
      rows: [{ metrics: { foo: 1 }, computed_at: stale }],
    });
    const out = await readKpiCache(fake.client as never, STUDIO, key);
    expect(out).toBeNull();
  });

  it("readKpiCache returns metrics within the 5-min TTL", async () => {
    const fresh = new Date(Date.now() - 60 * 1000).toISOString();
    fake = makeFakeSupabase({
      rows: [{ metrics: { foo: 42 }, computed_at: fresh }],
    });
    const out = await readKpiCache<{ foo: number }>(
      fake.client as never,
      STUDIO,
      key,
    );
    expect(out).toEqual({ foo: 42 });
  });

  it("readKpiCache swallows errors and returns null", async () => {
    fake = makeFakeSupabase({ throwOnRead: true });
    const out = await readKpiCache(fake.client as never, STUDIO, key);
    expect(out).toBeNull();
  });

  it("writeKpiCache upserts with the composite onConflict", async () => {
    await writeKpiCache(fake.client as never, STUDIO, key, { foo: 1 });
    const upsert = fake.calls.find((c) => c.method === "upsert");
    expect(upsert).toBeTruthy();
    const [payload, opts] = upsert!.args as [Row, { onConflict: string }];
    expect(payload).toMatchObject({
      studio_id: STUDIO,
      bucket: "directory_kpis",
      period_start: "2026-04-29",
      period_end: "2026-04-29",
      metrics: { foo: 1 },
    });
    expect(opts.onConflict).toBe("studio_id,bucket,period_start,period_end");
  });

  it("withKpiCache short-circuits on a fresh hit", async () => {
    const fresh = new Date(Date.now() - 60 * 1000).toISOString();
    fake = makeFakeSupabase({
      rows: [{ metrics: { hit: true }, computed_at: fresh }],
    });
    let computed = false;
    const out = await withKpiCache(
      fake.client as never,
      STUDIO,
      key,
      async () => {
        computed = true;
        return { hit: false };
      },
    );
    expect(out).toEqual({ hit: true });
    expect(computed).toBe(false);
    // No upsert should have been issued
    expect(fake.calls.find((c) => c.method === "upsert")).toBeUndefined();
  });

  it("withKpiCache computes + writes on miss", async () => {
    fake = makeFakeSupabase({ rows: [] });
    const out = await withKpiCache(
      fake.client as never,
      STUDIO,
      key,
      async () => ({ hit: false, computed: true }),
    );
    expect(out).toEqual({ hit: false, computed: true });
    const upsert = fake.calls.find((c) => c.method === "upsert");
    expect(upsert).toBeTruthy();
    expect((upsert!.args[0] as Row).metrics).toEqual({
      hit: false,
      computed: true,
    });
  });
});

describe("ai_cache", () => {
  it("readAiCache honors expires_at", async () => {
    const expired = new Date(Date.now() - 1000).toISOString();
    const fake = makeFakeSupabase({
      rows: [{ payload: { foo: 1 }, expires_at: expired }],
    });
    const out = await readAiCache(fake.client as never, "key");
    expect(out).toBeNull();
  });

  it("readAiCache returns payload before expires_at", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const fake = makeFakeSupabase({
      rows: [{ payload: { foo: 99 }, expires_at: future }],
    });
    const out = await readAiCache<{ foo: number }>(fake.client as never, "k");
    expect(out).toEqual({ foo: 99 });
  });

  it("writeAiCache upserts with cache_key onConflict + expires_at in the future", async () => {
    const fake = makeFakeSupabase({});
    await writeAiCache(fake.client as never, STUDIO, "ai-key-1", { x: 1 }, 60);
    const upsert = fake.calls.find((c) => c.method === "upsert");
    expect(upsert).toBeTruthy();
    const [payload, opts] = upsert!.args as [Row, { onConflict: string }];
    expect(payload).toMatchObject({
      cache_key: "ai-key-1",
      studio_id: STUDIO,
      payload: { x: 1 },
    });
    expect(opts.onConflict).toBe("cache_key");
    const expires = new Date(payload.expires_at as string).getTime();
    expect(expires).toBeGreaterThan(Date.now());
  });
});

describe("dateKey", () => {
  it("returns YYYY-MM-DD for today", () => {
    const d = dateKey();
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("respects positive offset", () => {
    const today = new Date();
    const expected = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(dateKey(1)).toBe(expected);
  });

  it("respects negative offset", () => {
    const today = new Date();
    const expected = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(dateKey(-1)).toBe(expected);
  });
});
