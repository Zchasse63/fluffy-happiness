import { describe, it, expect } from "vitest";

import {
  parseGlofoxDate,
  transformBooking,
  transformClassInstance,
  transformCredit,
  transformLead,
  transformMember,
  transformProgram,
  transformStaff,
  transformTransaction,
} from "@/lib/glofox/transformers";

const STUDIO = "11111111-1111-1111-1111-111111111111";

describe("transformMember", () => {
  it("flattens first/last name and surfaces a UUID-shaped profile + member pair", () => {
    const out = transformMember(
      {
        _id: "gx-mem-1",
        first_name: "Alex",
        last_name: "Park",
        email: "alex@example.com",
        phone: "+15551112222",
        membership_status: "active",
        membership_name: "Monthly Unlimited",
      } as never,
      STUDIO,
    );

    expect(out.profile.glofox_id).toBe("gx-mem-1");
    expect(out.profile.full_name).toBe("Alex Park");
    expect(out.profile.email).toBe("alex@example.com");
    expect(out.profile.phone).toBe("+15551112222");
    expect(out.member.studio_id).toBe(STUDIO);
    expect(out.member.glofox_id).toBe("gx-mem-1");
    expect(out.member.membership_status).toBe("active");
    expect(out.member.membership_tier).toBe("Monthly Unlimited");
    expect(out.profileGlofoxId).toBe("gx-mem-1");
  });

  it("defaults missing membership_status to active and tier to null", () => {
    const out = transformMember(
      {
        _id: "gx-mem-2",
        first_name: "Maya",
        last_name: "Chen",
      } as never,
      STUDIO,
    );

    expect(out.member.membership_status).toBe("active");
    expect(out.member.membership_tier).toBe(null);
    expect(out.profile.email).toBe(null);
    expect(out.profile.phone).toBe(null);
  });
});

describe("transformStaff", () => {
  it("marks trainers with role array", () => {
    const out = transformStaff(
      {
        _id: "gx-staff-1",
        first_name: "Whitney",
        last_name: "Abrams",
        email: "whitney@thesaunaguys.com",
        is_trainer: true,
      } as never,
      STUDIO,
    );

    expect(out.profile.roles).toEqual(["trainer"]);
    expect(out.isTrainer).toBe(true);
  });

  it("falls back to staff role when not flagged as trainer", () => {
    const out = transformStaff(
      {
        _id: "gx-staff-2",
        first_name: "Front",
        last_name: "Desk",
        is_trainer: false,
      } as never,
      STUDIO,
    );

    expect(out.profile.roles).toEqual(["staff"]);
    expect(out.isTrainer).toBe(false);
  });
});

describe("transformProgram", () => {
  it("preserves name, optional description, and active flag", () => {
    expect(
      transformProgram(
        {
          _id: "gx-pgm-1",
          name: "Open Sauna",
          description: "Drop-in",
          active: true,
        } as never,
        STUDIO,
      ),
    ).toEqual({
      studio_id: STUDIO,
      glofox_id: "gx-pgm-1",
      name: "Open Sauna",
      description: "Drop-in",
      category: null,
      is_active: true,
    });
  });
});

describe("transformClassInstance", () => {
  // Wire-shape fixtures captured 2026-05-08 from live `/2.0/events`.
  it("returns a row plus the program/trainer glofox ids for caller resolution", () => {
    const out = transformClassInstance(
      {
        _id: "gx-cls-1",
        program_id: "gx-pgm-1",
        trainers: ["gx-staff-1"],
        branch_id: "branch",
        name: "Open Sauna",
        // Mon 2026-04-29 18:00 UTC
        time_start: 1777903200,
        duration: 60,
        size: 12,
        booked: 7,
        waiting: 2,
        status: "BOOKING_OPEN",
      } as never,
      STUDIO,
      "gx-pgm-1",
      "gx-staff-1",
    );

    expect(out.title).toBe("Open Sauna");
    expect(out.capacity).toBe(12);
    expect(out.booked_count).toBe(7);
    expect(out.waitlist_count).toBe(2);
    expect(out.status).toBe("scheduled");
    // 2026-04-29T18:00:00.000Z → 2026-04-29T19:00:00.000Z
    expect(out.starts_at).toBe(new Date(1777903200 * 1000).toISOString());
    expect(out.ends_at).toBe(new Date((1777903200 + 60 * 60) * 1000).toISOString());
    expect(out.programGlofoxId).toBe("gx-pgm-1");
    expect(out.trainerGlofoxId).toBe("gx-staff-1");
  });

  it("falls back to 'Class' for missing names and 'scheduled' status", () => {
    const out = transformClassInstance(
      {
        _id: "gx-cls-2",
        branch_id: "b",
        time_start: 1777903200,
        duration: 60,
        size: 8,
      } as never,
      STUDIO,
      undefined,
      undefined,
    );

    expect(out.title).toBe("Class");
    expect(out.status).toBe("scheduled");
    expect(out.booked_count).toBe(0);
    expect(out.waitlist_count).toBe(0);
  });

  it("collapses Glofox status enum onto the four-state Meridian enum", () => {
    const cases: Array<[string, "scheduled" | "live" | "completed" | "cancelled"]> = [
      ["BOOKING_OPEN", "scheduled"],
      ["BOOKING_WINDOW_PASSED", "scheduled"],
      ["BOOKING_WINDOW_NOT_OPEN", "scheduled"],
      ["SCHEDULED", "scheduled"],
      ["IN_PROGRESS", "live"],
      ["LIVE", "live"],
      ["COMPLETED", "completed"],
      ["FINISHED", "completed"],
      ["CANCELED", "cancelled"],
      ["CANCELLED", "cancelled"],
    ];
    for (const [input, expected] of cases) {
      const out = transformClassInstance(
        {
          _id: "gx-cls-status",
          branch_id: "b",
          time_start: 1777903200,
          duration: 60,
          size: 12,
          status: input,
        } as never,
        STUDIO,
        undefined,
        undefined,
      );
      expect(out.status).toBe(expected);
    }
  });

  it("returns null starts_at when Glofox omits time_start (template stub)", () => {
    const out = transformClassInstance(
      {
        _id: "gx-cls-stub",
        branch_id: "b",
        size: 12,
      } as never,
      STUDIO,
      undefined,
      undefined,
    );
    // sync-engine.ts then drops these via the .filter(starts_at != null) step.
    expect(out.starts_at).toBeNull();
    expect(out.ends_at).toBeNull();
  });
});

describe("transformBooking", () => {
  // Wire-shape fixtures captured 2026-05-08 from live
  // `/2.2/branches/{branchId}/bookings`.
  it("maps each Glofox status (uppercase) onto the canonical Meridian status", () => {
    const cases = [
      ["BOOKED", "booked"],
      ["CONFIRMED", "booked"],
      ["CHECKED_IN", "checked_in"],
      ["ATTENDED", "checked_in"],
      ["CANCELED", "cancelled"], // American spelling per Glofox
      ["CANCELLED", "cancelled"],
      ["NO_SHOW", "no_show"],
      ["DID_NOT_ATTEND", "no_show"],
      ["WAITLIST", "waitlisted"],
      ["ON_WAITLIST", "waitlisted"],
      ["WAITING", "waitlisted"],
      ["unknown_value", "booked"], // unknown enums fall back to booked
    ] as const;

    for (const [input, expected] of cases) {
      const out = transformBooking(
        {
          _id: `gx-bk-${input}`,
          event_id: "cls",
          user_id: "usr",
          status: input,
          created: "2026-04-28 18:00:00",
        } as never,
        STUDIO,
      );
      expect(out.row.status).toBe(expected);
    }
  });

  it("reads event_id (not class_id) for FK resolution", () => {
    const out = transformBooking(
      {
        _id: "gx-bk-1",
        event_id: "real-event-id",
        user_id: "usr",
        status: "BOOKED",
        created: "2026-04-28 18:00:00",
      } as never,
      STUDIO,
    );
    expect(out.classGlofoxId).toBe("real-event-id");
    expect(out.memberGlofoxId).toBe("usr");
  });

  it("parses Glofox 'YYYY-MM-DD HH:mm:ss' canceled_at into ISO and uses British column name", () => {
    const out = transformBooking(
      {
        _id: "gx-bk-canc",
        event_id: "cls",
        user_id: "usr",
        status: "CANCELED",
        created: "2026-04-28 18:00:00",
        canceled_at: "2026-04-29 09:30:00",
      } as never,
      STUDIO,
    );
    expect(out.row.cancelled_at).toBe("2026-04-29T09:30:00.000Z");
  });

  it("captures is_from_waiting_list when the booking was promoted from the waitlist", () => {
    const out = transformBooking(
      {
        _id: "gx-bk-promo",
        event_id: "cls",
        user_id: "usr",
        status: "BOOKED",
        created: "2026-04-28 18:00:00",
        is_from_waiting_list: true,
      } as never,
      STUDIO,
    );
    expect(out.row.is_from_waiting_list).toBe(true);
  });

  it("flags classpass source explicitly", () => {
    const out = transformBooking(
      {
        _id: "gx-bk-cp",
        event_id: "cls",
        user_id: "usr",
        status: "BOOKED",
        source: "classpass",
        created: "2026-04-28 18:00:00",
      } as never,
      STUDIO,
    );
    expect(out.row.source).toBe("classpass");
  });

  it("defaults non-classpass sources to glofox", () => {
    const out = transformBooking(
      {
        _id: "gx-bk-2",
        event_id: "cls",
        user_id: "usr",
        status: "BOOKED",
        source: "web",
        created: "2026-04-28 18:00:00",
      } as never,
      STUDIO,
    );
    expect(out.row.source).toBe("glofox");
  });
});

describe("parseGlofoxDate", () => {
  it("preserves valid ISO inputs", () => {
    expect(parseGlofoxDate("2026-04-28T18:00:00Z")).toBe(
      "2026-04-28T18:00:00.000Z",
    );
  });
  it("converts Glofox 'YYYY-MM-DD HH:mm:ss' (UTC implicit) to ISO", () => {
    expect(parseGlofoxDate("2026-04-28 18:00:00")).toBe(
      "2026-04-28T18:00:00.000Z",
    );
  });
  it("returns null for null/empty/malformed input", () => {
    expect(parseGlofoxDate(null)).toBeNull();
    expect(parseGlofoxDate("")).toBeNull();
    expect(parseGlofoxDate("not-a-date")).toBeNull();
  });
});

describe("transformTransaction", () => {
  it("converts dollar amounts to cents and maps subscription/credit_pack types", () => {
    expect(
      transformTransaction(
        {
          _id: "gx-txn-1",
          type: "subscription",
          status: "completed",
          amount: 199.99,
          currency: "USD",
          description: "Membership · Monthly",
          created_at: "2026-04-28T18:00:00Z",
        } as never,
        STUDIO,
      ).row,
    ).toEqual({
      studio_id: STUDIO,
      glofox_id: "gx-txn-1",
      type: "membership",
      status: "completed",
      amount_cents: 19999,
      currency: "USD",
      description: "Membership · Monthly",
      occurred_at: "2026-04-28T18:00:00Z",
    });

    expect(
      transformTransaction(
        {
          _id: "gx-txn-2",
          type: "credit_pack",
          status: "completed",
          amount: 100,
          created_at: "2026-04-28T18:00:00Z",
        } as never,
        STUDIO,
      ).row.type,
    ).toBe("class_pack");
  });

  it("falls back to walk_in for unknown types", () => {
    expect(
      transformTransaction(
        {
          _id: "gx-txn-x",
          type: "guest_pass",
          status: "completed",
          amount: 25,
          created_at: "2026-04-28T18:00:00Z",
        } as never,
        STUDIO,
      ).row.type,
    ).toBe("walk_in");
  });

  it("extracts member + class glofox ids from metadata", () => {
    const out = transformTransaction(
      {
        _id: "gx-txn-3",
        type: "membership",
        status: "completed",
        amount: 100,
        created_at: "2026-04-28T18:00:00Z",
        metadata: { user_id: "gx-mem-7", class_id: "gx-cls-9" },
      } as never,
      STUDIO,
    );
    expect(out.memberGlofoxId).toBe("gx-mem-7");
    expect(out.classGlofoxId).toBe("gx-cls-9");
  });

  // L-12 edge-case coverage — added 2026-05-01.

  it("defaults currency to USD when Glofox omits it", () => {
    const out = transformTransaction(
      {
        _id: "gx-txn-4",
        type: "subscription",
        status: "completed",
        amount: 50,
        created_at: "2026-04-28T18:00:00Z",
        // currency intentionally omitted
      } as never,
      STUDIO,
    );
    expect(out.row.currency).toBe("USD");
  });

  it("preserves non-USD currencies when provided", () => {
    const out = transformTransaction(
      {
        _id: "gx-txn-5",
        type: "subscription",
        status: "completed",
        amount: 50,
        currency: "EUR",
        created_at: "2026-04-28T18:00:00Z",
      } as never,
      STUDIO,
    );
    expect(out.row.currency).toBe("EUR");
  });

  it("returns null description when Glofox omits it", () => {
    const out = transformTransaction(
      {
        _id: "gx-txn-6",
        type: "subscription",
        status: "completed",
        amount: 50,
        created_at: "2026-04-28T18:00:00Z",
      } as never,
      STUDIO,
    );
    expect(out.row.description).toBeNull();
  });

  it("returns undefined member/class ids when metadata is missing", () => {
    const out = transformTransaction(
      {
        _id: "gx-txn-7",
        type: "subscription",
        status: "completed",
        amount: 50,
        created_at: "2026-04-28T18:00:00Z",
      } as never,
      STUDIO,
    );
    expect(out.memberGlofoxId).toBeUndefined();
    expect(out.classGlofoxId).toBeUndefined();
  });

  it("rounds fractional amounts to the nearest cent", () => {
    expect(
      transformTransaction(
        {
          _id: "gx-txn-8",
          type: "subscription",
          status: "completed",
          amount: 12.345,
          created_at: "2026-04-28T18:00:00Z",
        } as never,
        STUDIO,
      ).row.amount_cents,
    ).toBe(1235);

    expect(
      transformTransaction(
        {
          _id: "gx-txn-9",
          type: "subscription",
          status: "completed",
          amount: 0,
          created_at: "2026-04-28T18:00:00Z",
        } as never,
        STUDIO,
      ).row.amount_cents,
    ).toBe(0);
  });

  it.each([
    ["membership", "membership"],
    ["subscription", "membership"],
    ["credit_pack", "class_pack"],
    ["pack", "class_pack"],
    ["retail", "retail"],
    ["product", "retail"],
    ["gift_card", "gift_card"],
    ["refund", "refund"],
    ["corporate", "corporate"],
    ["unknown_type", "walk_in"],
    [undefined, "walk_in"],
  ])("maps Glofox type %s → meridian type %s", (input, expected) => {
    const row = transformTransaction(
      {
        _id: "gx-txn-typemap",
        type: input,
        status: "completed",
        amount: 1,
        created_at: "2026-04-28T18:00:00Z",
      } as never,
      STUDIO,
    ).row;
    expect(row.type).toBe(expected);
  });
});

describe("transformCredit", () => {
  // Wire-shape fixture captured 2026-05-12 from live
  // `/2.0/credits?user_id=…` (Alonso Martinez's 4-pack).
  it("maps a real Glofox credit pack onto the credit_packs row shape", () => {
    const out = transformCredit(
      {
        _id: "68c0e4c3046138482e0be24e",
        user_id: "66b7f022e78b94509d0bfc71",
        membership_id: "661dc87a22e9f2bf4a030c18",
        membership_name: "(Legacy) No Commitment Class Packs",
        num_sessions: 4,
        available: 3,
        active: true,
        model: "programs",
        bookings: ["68c0e4d949899b5edc0d486e"],
        start_date: 1757390400,
        created: 1757471939,
      } as never,
      STUDIO,
    );
    expect(out.row.studio_id).toBe(STUDIO);
    expect(out.row.glofox_id).toBe("68c0e4c3046138482e0be24e");
    expect(out.row.pack_type).toBe("(Legacy) No Commitment Class Packs");
    expect(out.row.credits_total).toBe(4);
    expect(out.row.credits_remaining).toBe(3);
    // 1757471939 unix = 2025-09-10T03:58:59Z
    expect(out.row.purchased_at).toBe(
      new Date(1757471939 * 1000).toISOString(),
    );
    expect(out.memberGlofoxId).toBe("66b7f022e78b94509d0bfc71");
    expect(out.isActive).toBe(true);
    expect(out.membershipName).toBe("(Legacy) No Commitment Class Packs");
  });

  it("falls back across created → start_date → now() when timestamps are missing", () => {
    // The transformer reduces to unix-seconds precision, so an exact
    // ms-precision comparison against Date.now() can be off by ≤1s.
    const beforeSec = Math.floor(Date.now() / 1000);
    const out = transformCredit(
      {
        _id: "p1",
        user_id: "u1",
        membership_id: "m1",
        membership_name: "Pack",
        num_sessions: 10,
        available: 10,
        active: false,
        model: "programs",
      } as never,
      STUDIO,
    );
    const purchasedSec = Math.floor(
      new Date(out.row.purchased_at).getTime() / 1000,
    );
    expect(purchasedSec).toBeGreaterThanOrEqual(beforeSec);
    expect(out.isActive).toBe(false);
  });

  it("defaults pack_type to 'Class Pack' when Glofox omits membership_name", () => {
    const out = transformCredit(
      {
        _id: "p2",
        user_id: "u1",
        membership_id: "m1",
        num_sessions: 4,
        available: 4,
        active: true,
        model: "programs",
      } as never,
      STUDIO,
    );
    expect(out.row.pack_type).toBe("Class Pack");
  });
});

describe("transformLead", () => {
  it("composes a fallback full_name from email when first/last missing", () => {
    expect(
      transformLead(
        {
          _id: "gx-ld-1",
          email: "lead@example.com",
          source: "Instagram",
          status: "contacted",
        } as never,
        STUDIO,
      ),
    ).toEqual({
      studio_id: STUDIO,
      glofox_id: "gx-ld-1",
      email: "lead@example.com",
      phone: null,
      full_name: "lead@example.com",
      source: "Instagram",
      status: "contacted",
      score: 0,
    });
  });

  it("normalizes 'new' status verbatim and preserves other statuses", () => {
    expect(
      transformLead(
        { _id: "x", first_name: "X", last_name: "Y", status: "new" } as never,
        STUDIO,
      ).status,
    ).toBe("new");
  });
});
