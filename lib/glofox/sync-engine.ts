/*
 * Glofox sync engine — pure server-side logic shared by:
 *   • POST /api/glofox/sync (NDJSON-streaming, manual + cron-secret triggers)
 *   • Inngest hourly sync function (no streaming, step.run for observability)
 *
 * Caller passes an authenticated Supabase client + a configured Glofox
 * client. `onProgress` is optional and used by the route to stream
 * progress events to the browser.
 *
 * Sync order respects FK dependencies — see app/api/glofox/sync/route.ts
 * for the dependency tree.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  GlofoxClient,
  transformBooking,
  transformClassInstance,
  transformLead,
  transformMember,
  transformProgram,
  transformStaff,
  transformTransaction,
} from "@/lib/glofox";
import type { Database } from "@/lib/supabase/database.types";

export type SyncProgress =
  | { stage: "start"; at: string }
  | { stage: "staff"; count: number }
  | { stage: "members"; count: number }
  | { stage: "programs"; count: number }
  | { stage: "classes"; count: number }
  | { stage: "bookings"; count: number }
  | { stage: "transactions"; count: number }
  | { stage: "leads"; count: number }
  | { stage: "done"; at: string }
  | { stage: "error"; message: string };

export type SyncCounts = {
  staff: number;
  members: number;
  programs: number;
  classes: number;
  bookings: number;
  transactions: number;
  leads: number;
};

export type RunGlofoxSyncOptions = {
  supabase: SupabaseClient<Database>;
  studioId: string;
  glofox: GlofoxClient;
  onProgress?: (event: SyncProgress) => void | Promise<void>;
};

const CHUNK_SIZE = 500;
const CLASS_WINDOW_SEC = 90 * 24 * 60 * 60;

export async function runGlofoxSync(
  opts: RunGlofoxSyncOptions,
): Promise<SyncCounts> {
  const { supabase, studioId, glofox, onProgress } = opts;
  const emit = async (event: SyncProgress) => {
    if (onProgress) await onProgress(event);
  };

  await emit({ stage: "start", at: new Date().toISOString() });

  // 1. Staff → profiles + trainers
  const staff = await glofox.staff();
  await emit({ stage: "staff", count: staff.length });
  const staffProfiles = staff.map((s) => transformStaff(s, studioId));
  if (staffProfiles.length) {
    const { error } = await supabase
      .from("profiles")
      .upsert(
        staffProfiles.map((s) => s.profile),
        { onConflict: "studio_id,glofox_id" },
      );
    if (error) throw new Error(`Staff profiles upsert failed: ${error.message}`);

    const trainerStaff = staffProfiles.filter((s) => s.isTrainer);
    if (trainerStaff.length) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, glofox_id")
        .eq("studio_id", studioId)
        .in("glofox_id", trainerStaff.map((s) => s.profileGlofoxId));
      const profileMap = buildIdMap(profileRows);
      const trainerRows = trainerStaff
        .map((s) => {
          const profile_id = profileMap.get(s.profileGlofoxId);
          if (!profile_id) return null;
          return {
            studio_id: studioId,
            glofox_id: s.profileGlofoxId,
            profile_id,
            is_active: true,
          };
        })
        .filter((r): r is NonNullable<typeof r> => Boolean(r));
      if (trainerRows.length) {
        const { error: trainerErr } = await supabase
          .from("trainers")
          .upsert(trainerRows, { onConflict: "studio_id,glofox_id" });
        if (trainerErr)
          throw new Error(`Trainer upsert failed: ${trainerErr.message}`);
      }
    }

    const exTrainerGlofoxIds = staffProfiles
      .filter((s) => !s.isTrainer)
      .map((s) => s.profileGlofoxId);
    if (exTrainerGlofoxIds.length) {
      await supabase
        .from("trainers")
        .update({ is_active: false })
        .eq("studio_id", studioId)
        .in("glofox_id", exTrainerGlofoxIds)
        .eq("is_active", true);
    }
  }

  // 2. Members → profiles + members
  const members = await glofox.members();
  await emit({ stage: "members", count: members.length });
  const transformed = members.map((m) => transformMember(m, studioId));
  if (transformed.length) {
    const { error } = await supabase
      .from("profiles")
      .upsert(
        transformed.map((t) => t.profile),
        { onConflict: "studio_id,glofox_id" },
      );
    if (error) throw new Error(`Member profiles upsert failed: ${error.message}`);

    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, glofox_id")
      .eq("studio_id", studioId)
      .in("glofox_id", transformed.map((t) => t.profileGlofoxId));
    const profileMap = buildIdMap(profileRows);

    const memberRows = transformed
      .map((t) => ({
        ...t.member,
        profile_id: profileMap.get(t.profileGlofoxId),
      }))
      .filter((m): m is typeof m & { profile_id: string } => Boolean(m.profile_id));
    if (memberRows.length) {
      const { error: memberErr } = await supabase
        .from("members")
        .upsert(memberRows, { onConflict: "studio_id,glofox_id" });
      if (memberErr) throw new Error(`Members upsert failed: ${memberErr.message}`);
    }

    // Link members to plans by membership_tier text → membership_plans.name.
    // Glofox doesn't return a plan FK, just the membership name as text;
    // we maintain membership_plans separately (hand-curated prices) and
    // join here so MRR / active counts compute correctly. Members whose
    // tier doesn't match any plan name (trial flags, legacy categories,
    // private events) keep plan_id = null.
    const { error: linkErr } = await supabase.rpc("link_members_to_plans", {
      p_studio_id: studioId,
    });
    // Ignore "function does not exist" errors so this is forward-compatible
    // with deployments that haven't applied migration 0018 yet.
    if (linkErr && !linkErr.message.includes("does not exist")) {
      // eslint-disable-next-line no-console
      console.error("[sync] link_members_to_plans failed", linkErr);
    }
  }

  // 3. Programs
  const programs = await glofox.programs();
  await emit({ stage: "programs", count: programs.length });
  if (programs.length) {
    const { error } = await supabase
      .from("programs")
      .upsert(
        programs.map((p) => transformProgram(p, studioId)),
        { onConflict: "studio_id,glofox_id" },
      );
    if (error) throw new Error(`Programs upsert failed: ${error.message}`);
  }

  // 4. Class instances (events) — must precede bookings.
  const nowSec = Math.floor(Date.now() / 1000);
  const classes = await glofox.classes({
    start: String(nowSec - CLASS_WINDOW_SEC),
    end: String(nowSec + CLASS_WINDOW_SEC),
  });
  await emit({ stage: "classes", count: classes.length });
  let classesWritten = 0;
  if (classes.length) {
    const programGlofoxIds = uniqueIds(classes.map((c) => c.program_id));
    const trainerGlofoxIds = uniqueIds(classes.map((c) => c.trainer_id));

    const [programLookup, trainerLookup] = await Promise.all([
      programGlofoxIds.length
        ? supabase
            .from("programs")
            .select("id, glofox_id")
            .eq("studio_id", studioId)
            .in("glofox_id", programGlofoxIds)
        : Promise.resolve({ data: [] }),
      trainerGlofoxIds.length
        ? supabase
            .from("trainers")
            .select("id, glofox_id")
            .eq("studio_id", studioId)
            .in("glofox_id", trainerGlofoxIds)
        : Promise.resolve({ data: [] }),
    ]);
    const programMap = buildIdMap(programLookup.data);
    const trainerMap = buildIdMap(trainerLookup.data);

    const classRows = classes
      .map((c) => {
        const t = transformClassInstance(c, studioId, c.program_id, c.trainer_id);
        return {
          studio_id: t.studio_id,
          glofox_id: t.glofox_id,
          title: t.title,
          starts_at: t.starts_at,
          ends_at: t.ends_at,
          capacity: t.capacity,
          booked_count: t.booked_count,
          status: t.status,
          is_one_off: t.is_one_off,
          program_id: t.programGlofoxId
            ? programMap.get(t.programGlofoxId) ?? null
            : null,
          trainer_id: t.trainerGlofoxId
            ? trainerMap.get(t.trainerGlofoxId) ?? null
            : null,
        };
      })
      // Glofox occasionally returns event records without a starts_at —
      // template stubs, drafts, recurring-rule rows. The class_instances
      // schema requires starts_at NOT NULL, so we drop these rather
      // than failing the entire sync. They'll be re-synced once Glofox
      // assigns them an actual time.
      .filter((row) => row.starts_at != null);

    for (let i = 0; i < classRows.length; i += CHUNK_SIZE) {
      const chunk = classRows.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from("class_instances")
        .upsert(chunk, { onConflict: "studio_id,glofox_id" });
      if (error)
        throw new Error(`class_instances upsert failed: ${error.message}`);
      classesWritten += chunk.length;
    }
  }

  // 5. Bookings
  const bookings = await glofox.bookings();
  await emit({ stage: "bookings", count: bookings.length });
  let bookingsWritten = 0;
  if (bookings.length) {
    const transformedBookings = bookings.map((b) => transformBooking(b, studioId));
    const classGlofoxIds = uniqueIds(transformedBookings.map((b) => b.classGlofoxId));
    const memberGlofoxIds = uniqueIds(transformedBookings.map((b) => b.memberGlofoxId));

    const [{ data: classRows }, { data: memberRows }] = await Promise.all([
      supabase
        .from("class_instances")
        .select("id, glofox_id")
        .eq("studio_id", studioId)
        .in("glofox_id", classGlofoxIds),
      supabase
        .from("members")
        .select("id, glofox_id")
        .eq("studio_id", studioId)
        .in("glofox_id", memberGlofoxIds),
    ]);
    const classMap = buildIdMap(classRows);
    const memberMap = buildIdMap(memberRows);

    const bookingRows = transformedBookings
      .map((b) => {
        const class_instance_id = classMap.get(b.classGlofoxId);
        const member_id = memberMap.get(b.memberGlofoxId);
        if (!class_instance_id || !member_id) return null;
        return { ...b.row, class_instance_id, member_id };
      })
      .filter((r): r is NonNullable<typeof r> => Boolean(r));

    for (let i = 0; i < bookingRows.length; i += CHUNK_SIZE) {
      const chunk = bookingRows.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from("bookings")
        .upsert(chunk, { onConflict: "studio_id,glofox_id" });
      if (error) throw new Error(`Bookings upsert failed: ${error.message}`);
      bookingsWritten += chunk.length;
    }
  }

  // 6. Transactions
  const oneYearAgo = nowSec - 365 * 24 * 60 * 60;
  const txns = await glofox.transactions({
    startUnix: String(oneYearAgo),
    endUnix: String(nowSec),
  });
  await emit({ stage: "transactions", count: txns.length });
  let txnsWritten = 0;
  if (txns.length) {
    const transformedTxns = txns.map((t) => transformTransaction(t, studioId));
    const memberGlofoxIds = uniqueIds(transformedTxns.map((t) => t.memberGlofoxId));

    let memberMap = new Map<string, string>();
    if (memberGlofoxIds.length) {
      const { data: memberRows } = await supabase
        .from("members")
        .select("id, glofox_id")
        .eq("studio_id", studioId)
        .in("glofox_id", memberGlofoxIds);
      memberMap = buildIdMap(memberRows);
    }

    const txnRows = transformedTxns
      .map((t) => ({
        ...t.row,
        member_id: t.memberGlofoxId ? memberMap.get(t.memberGlofoxId) ?? null : null,
      }))
      // Glofox occasionally returns transaction rows with status = null
      // (cancelled/draft txns or analytics-only stubs). The transactions
      // schema requires status NOT NULL, and these don't represent
      // resolved money anyway — drop them.
      .filter((row) => row.status != null && row.status !== "");

    for (let i = 0; i < txnRows.length; i += CHUNK_SIZE) {
      const chunk = txnRows.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from("transactions")
        .upsert(chunk, { onConflict: "studio_id,glofox_id" });
      if (error) throw new Error(`Transactions upsert failed: ${error.message}`);
      txnsWritten += chunk.length;
    }
  }

  // 7. Leads
  const leads = await glofox.leads();
  await emit({ stage: "leads", count: leads.length });
  if (leads.length) {
    const leadRows = leads
      .map((l) => transformLead(l, studioId))
      // Same null-field defense as classes + transactions: drop rows
      // missing required fields rather than failing the whole sync.
      .filter((row) => row.status != null && row.status !== "");
    if (leadRows.length) {
      const { error } = await supabase
        .from("leads")
        .upsert(leadRows, { onConflict: "studio_id,glofox_id" });
      if (error) throw new Error(`Leads upsert failed: ${error.message}`);
    }
  }

  const counts: SyncCounts = {
    staff: staff.length,
    members: members.length,
    programs: programs.length,
    classes: classesWritten,
    bookings: bookingsWritten,
    transactions: txnsWritten,
    leads: leads.length,
  };

  const synced = new Date().toISOString();
  for (const [entity, count] of Object.entries(counts)) {
    const { error } = await supabase.from("glofox_sync_state").upsert(
      {
        studio_id: studioId,
        entity_type: entity,
        last_synced_at: synced,
        status: "success",
        records_synced: count,
      },
      { onConflict: "studio_id,entity_type" },
    );
    if (error) {
      // Don't throw — the sync itself succeeded. Log so the dashboard
      // mismatch is visible in unattended cron logs.
      console.error(
        `glofox_sync_state upsert failed for ${entity}: ${error.message}`,
      );
    }
  }

  await emit({ stage: "done", at: new Date().toISOString() });

  return counts;
}

function uniqueIds(arr: Array<string | undefined | null>): string[] {
  return Array.from(new Set(arr.filter((id): id is string => Boolean(id))));
}

function buildIdMap(
  rows: Array<{ id: string; glofox_id: string | null }> | null | undefined,
): Map<string, string> {
  return new Map(
    (rows ?? [])
      .filter((r): r is { id: string; glofox_id: string } => Boolean(r.glofox_id))
      .map((r) => [r.glofox_id, r.id]),
  );
}
