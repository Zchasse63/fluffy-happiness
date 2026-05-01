import { describe, it, expect } from "vitest";

import {
  transformBooking,
  transformClassInstance,
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
  it("returns a row plus the program/trainer glofox ids for caller resolution", () => {
    const out = transformClassInstance(
      {
        _id: "gx-cls-1",
        program_id: "gx-pgm-1",
        trainer_id: "gx-staff-1",
        branch_id: "branch",
        name: "Open Sauna",
        starts_at: "2026-04-29T18:00:00Z",
        ends_at: "2026-04-29T19:00:00Z",
        capacity: 12,
        booked_count: 7,
        status: "scheduled",
      } as never,
      STUDIO,
      "gx-pgm-1",
      "gx-staff-1",
    );

    expect(out.title).toBe("Open Sauna");
    expect(out.capacity).toBe(12);
    expect(out.booked_count).toBe(7);
    expect(out.status).toBe("scheduled");
    expect(out.programGlofoxId).toBe("gx-pgm-1");
    expect(out.trainerGlofoxId).toBe("gx-staff-1");
  });

  it("falls back to 'Class' for missing names and 'scheduled' status", () => {
    const out = transformClassInstance(
      {
        _id: "gx-cls-2",
        branch_id: "b",
        starts_at: "2026-04-29T18:00:00Z",
        ends_at: "2026-04-29T19:00:00Z",
        capacity: 8,
      } as never,
      STUDIO,
      undefined,
      undefined,
    );

    expect(out.title).toBe("Class");
    expect(out.status).toBe("scheduled");
    expect(out.booked_count).toBe(0);
  });
});

describe("transformBooking", () => {
  it("maps each Glofox status to the canonical Meridian status", () => {
    const cases = [
      ["booked", "booked"],
      ["checked_in", "checked_in"],
      ["cancelled", "cancelled"],
      ["no_show", "no_show"],
      ["waitlisted", "waitlisted"],
    ] as const;

    for (const [input, expected] of cases) {
      const out = transformBooking(
        {
          _id: `gx-bk-${input}`,
          class_id: "cls",
          user_id: "usr",
          status: input,
          created_at: "2026-04-28T18:00:00Z",
        } as never,
        STUDIO,
      );
      expect(out.row.status).toBe(expected);
    }
  });

  it("flags classpass source explicitly", () => {
    const out = transformBooking(
      {
        _id: "gx-bk-cp",
        class_id: "cls",
        user_id: "usr",
        status: "booked",
        source: "classpass",
        created_at: "2026-04-28T18:00:00Z",
      } as never,
      STUDIO,
    );
    expect(out.row.source).toBe("classpass");
  });

  it("defaults non-classpass sources to glofox", () => {
    const out = transformBooking(
      {
        _id: "gx-bk-2",
        class_id: "cls",
        user_id: "usr",
        status: "booked",
        source: "web",
        created_at: "2026-04-28T18:00:00Z",
      } as never,
      STUDIO,
    );
    expect(out.row.source).toBe("glofox");
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
