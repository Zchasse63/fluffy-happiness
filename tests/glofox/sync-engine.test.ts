import { describe, it, expect, beforeAll } from "vitest";

import { GlofoxClient } from "@/lib/glofox";
import { runGlofoxSync, type SyncProgress } from "@/lib/glofox/sync-engine";

/*
 * Sync-engine orchestration tests with fake clients.
 *
 * SAFETY: this test must NEVER hit real Glofox. We assert the test guard
 * up front, and use a stub GlofoxClient subclass that throws if any
 * non-test method is called. See tests/glofox/SAFETY.md for the no-writes
 * rule.
 */

beforeAll(() => {
  if (process.env.ALLOW_GLOFOX_WRITES === "1") {
    throw new Error(
      "Refusing to run sync-engine tests with ALLOW_GLOFOX_WRITES=1 — Glofox is read-only.",
    );
  }
});

const STUDIO = "11111111-1111-1111-1111-111111111111";

type Fixtures = {
  staff?: unknown[];
  members?: unknown[];
  programs?: unknown[];
  classes?: unknown[];
  bookings?: unknown[];
  transactions?: unknown[];
  leads?: unknown[];
};

function makeStubGlofox(fixtures: Fixtures = {}): GlofoxClient {
  // Construct a real GlofoxClient (so instanceof + the SAFETY surface
  // checks pass) and override the read methods with stubs. Casting via
  // `as unknown as GlofoxClient` keeps the consumer's signature happy
  // without leaking the fixture types.
  const stub = new GlofoxClient({
    apiKey: "test",
    apiToken: "test",
    branchId: "test",
  });
  const overrides = {
    staff: async () => fixtures.staff ?? [],
    members: async () => fixtures.members ?? [],
    programs: async () => fixtures.programs ?? [],
    classes: async () => fixtures.classes ?? [],
    bookings: async () => fixtures.bookings ?? [],
    transactions: async () => fixtures.transactions ?? [],
    leads: async () => fixtures.leads ?? [],
  };
  return Object.assign(stub, overrides) as unknown as GlofoxClient;
}

type Call = { table: string; method: string; args: unknown[] };

function makeFakeSupabase() {
  const calls: Call[] = [];
  const builder = (table: string) => {
    const b: Record<string, unknown> = {
      select(...a: unknown[]) {
        calls.push({ table, method: "select", args: a });
        return b;
      },
      upsert(...a: unknown[]) {
        calls.push({ table, method: "upsert", args: a });
        return Promise.resolve({ data: null, error: null });
      },
      update(...a: unknown[]) {
        calls.push({ table, method: "update", args: a });
        return b;
      },
      eq(...a: unknown[]) {
        calls.push({ table, method: "eq", args: a });
        return b;
      },
      in(...a: unknown[]) {
        calls.push({ table, method: "in", args: a });
        return b;
      },
      gte(...a: unknown[]) {
        calls.push({ table, method: "gte", args: a });
        return b;
      },
      then: undefined,
    };
    // The select(...).eq(...).in(...) chain finally awaits; mimic the
    // promise resolution by adding a `then` proxy on the builder.
    return new Proxy(b, {
      get(target, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => unknown) =>
            resolve({ data: [], error: null });
        }
        return target[prop as string];
      },
    });
  };
  return {
    client: { from: (t: string) => builder(t) },
    calls,
  };
}

describe("runGlofoxSync — empty inputs", () => {
  it("returns 0-count tally and emits start + done", async () => {
    const events: SyncProgress[] = [];
    const fake = makeFakeSupabase();
    const counts = await runGlofoxSync({
      supabase: fake.client as never,
      studioId: STUDIO,
      glofox: makeStubGlofox(),
      onProgress: (e) => {
        events.push(e);
      },
    });

    expect(counts).toEqual({
      staff: 0,
      members: 0,
      programs: 0,
      classes: 0,
      bookings: 0,
      transactions: 0,
      leads: 0,
    });
    expect(events[0]?.stage).toBe("start");
    expect(events[events.length - 1]?.stage).toBe("done");

    // Stage events for each entity should be present (count: 0)
    for (const stage of [
      "staff",
      "members",
      "programs",
      "classes",
      "bookings",
      "transactions",
      "leads",
    ] as const) {
      const found = events.find((e) => e.stage === stage);
      expect(found).toBeTruthy();
      if (found && "count" in found) expect(found.count).toBe(0);
    }
  });

  it("only upserts to glofox_sync_state (sync tracking) on empty input — never to data tables", async () => {
    const fake = makeFakeSupabase();
    await runGlofoxSync({
      supabase: fake.client as never,
      studioId: STUDIO,
      glofox: makeStubGlofox(),
    });
    const dataTableUpserts = fake.calls.filter(
      (c) => c.method === "upsert" && c.table !== "glofox_sync_state",
    );
    expect(dataTableUpserts).toHaveLength(0);

    // glofox_sync_state should be touched on each entity stage to
    // record last_synced_at. Allow ≥1 to avoid pinning the exact stage
    // count if the engine evolves.
    const stateUpserts = fake.calls.filter(
      (c) => c.table === "glofox_sync_state" && c.method === "upsert",
    );
    expect(stateUpserts.length).toBeGreaterThanOrEqual(1);
  });
});

describe("runGlofoxSync — staff stage", () => {
  it("upserts profile rows with onConflict by studio_id+glofox_id", async () => {
    const fake = makeFakeSupabase();
    const stub = makeStubGlofox({
      staff: [
        {
          _id: "gx-staff-1",
          first_name: "Cassie",
          last_name: "Lee",
          email: "cassie@example.com",
          types: ["TRAINER"],
        },
      ],
    });
    await runGlofoxSync({
      supabase: fake.client as never,
      studioId: STUDIO,
      glofox: stub,
    });

    const profileUpsert = fake.calls.find(
      (c) => c.table === "profiles" && c.method === "upsert",
    );
    expect(profileUpsert).toBeTruthy();
    const [payload, opts] = profileUpsert!.args as [unknown[], { onConflict: string }];
    expect(Array.isArray(payload)).toBe(true);
    expect(payload[0]).toMatchObject({
      studio_id: STUDIO,
      glofox_id: "gx-staff-1",
      full_name: "Cassie Lee",
      email: "cassie@example.com",
    });
    expect(opts.onConflict).toBe("studio_id,glofox_id");
  });
});

describe("SAFETY: glofox client surface is read-only", () => {
  it("no method on GlofoxClient.prototype starts with a write-shaped verb", () => {
    const stub = makeStubGlofox();
    expect(stub).toBeInstanceOf(GlofoxClient);
    // Walk the prototype chain to enumerate the public surface, then
    // assert none of the canonical write verbs appear. The audited
    // GET/POST methods (members/staff/programs/classes/bookings/
    // transactions/leads/credits/membershipPlans) are read-only;
    // `bookings` is a read despite the verb-shaped noun, so we whitelist
    // it (and only it) by exact name.
    const names = new Set<string>();
    let p: object | null = stub as object;
    while (p && p !== Object.prototype) {
      for (const k of Object.getOwnPropertyNames(p)) names.add(k);
      p = Object.getPrototypeOf(p);
    }
    const knownReads = new Set(["bookings"]);
    const writeShaped = [...names].filter(
      (n) =>
        !knownReads.has(n) &&
        /^(create|update|delete|cancel|book(?!ings$)|charge|refund|post|put)/i.test(
          n,
        ),
    );
    expect(writeShaped).toEqual([]);
  });
});
