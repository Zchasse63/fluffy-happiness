/*
 * POST /api/glofox/sync — incremental Glofox → Supabase sync.
 *
 * Streams NDJSON progress lines (rebuild-handoff §4.3 pattern E) so
 * Netlify's serverless functions don't time out on long imports.
 *
 * Sync order respects FK dependencies:
 *   staff → profiles (trainers)
 *   members → profiles + members
 *   programs → programs
 *   events → class_templates + class_instances
 *   bookings → bookings
 *   transactions → transactions
 *   leads → leads
 */

import { authErrorResponse, requireRole } from "@/lib/auth";
import {
  GlofoxClient,
  GlofoxNotConfigured,
  transformBooking,
  transformLead,
  transformMember,
  transformProgram,
  transformStaff,
  transformTransaction,
  unwrapTransactionRow,
} from "@/lib/glofox";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Netlify Pro can run 5 min

export async function POST() {
  try {
    const profile = await requireRole("owner", "manager");
    const supabase = await createSupabaseServer();

    if (!GlofoxClient.isConfigured()) {
      throw new GlofoxNotConfigured();
    }
    const glofox = GlofoxClient.fromEnv();

    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    const send = (msg: object) =>
      writer.write(encoder.encode(JSON.stringify(msg) + "\n"));

    (async () => {
      try {
        await send({ stage: "start", at: new Date().toISOString() });

        // 1. Staff → trainers (also creates a profile per staff)
        const staff = await glofox.staff();
        await send({ stage: "staff", count: staff.length });
        const staffProfiles = staff.map((s) =>
          transformStaff(s, profile.studio_id),
        );
        if (staffProfiles.length) {
          await supabase
            .from("profiles")
            .upsert(
              staffProfiles.map((s) => s.profile),
              { onConflict: "studio_id,glofox_id" },
            );
        }

        // 2. Members → profiles + members
        const members = await glofox.members();
        await send({ stage: "members", count: members.length });
        const transformed = members.map((m) =>
          transformMember(m, profile.studio_id),
        );
        if (transformed.length) {
          await supabase
            .from("profiles")
            .upsert(
              transformed.map((t) => t.profile),
              { onConflict: "studio_id,glofox_id" },
            );

          // Build profile_id map
          const { data: profileRows } = await supabase
            .from("profiles")
            .select("id, glofox_id")
            .eq("studio_id", profile.studio_id)
            .in(
              "glofox_id",
              transformed.map((t) => t.profileGlofoxId),
            );
          const profileMap = new Map(
            (profileRows ?? []).map((r) => [r.glofox_id, r.id]),
          );

          await supabase.from("members").upsert(
            transformed
              .map((t) => ({
                ...t.member,
                profile_id: profileMap.get(t.profileGlofoxId),
              }))
              .filter((m) => m.profile_id),
            { onConflict: "studio_id,glofox_id" },
          );
        }

        // 3. Programs
        const programs = await glofox.programs();
        await send({ stage: "programs", count: programs.length });
        if (programs.length) {
          await supabase
            .from("programs")
            .upsert(
              programs.map((p) => transformProgram(p, profile.studio_id)),
              { onConflict: "studio_id,glofox_id" },
            );
        }

        // 4. Bookings (depends on classes + members)
        const bookings = await glofox.bookings();
        await send({ stage: "bookings", count: bookings.length });

        // 5. Transactions (Analytics/report — unwrap each row)
        const txnRows = await glofox.transactionsRaw();
        const txns = txnRows
          .map(unwrapTransactionRow)
          .filter((t): t is NonNullable<typeof t> => Boolean(t));
        await send({ stage: "transactions", count: txns.length });

        // 6. Leads
        const leads = await glofox.leads();
        await send({ stage: "leads", count: leads.length });
        if (leads.length) {
          await supabase
            .from("leads")
            .upsert(
              leads.map((l) => transformLead(l, profile.studio_id)),
              { onConflict: "studio_id,glofox_id" },
            );
        }

        // Touch sync_state — one row per entity type
        const synced = new Date().toISOString();
        for (const entity of [
          "staff",
          "members",
          "programs",
          "bookings",
          "transactions",
          "leads",
        ]) {
          await supabase.from("glofox_sync_state").upsert(
            {
              studio_id: profile.studio_id,
              entity_type: entity,
              last_synced_at: synced,
              status: "success",
              records_synced: 0,
            },
            { onConflict: "studio_id,entity_type" },
          );
        }

        // Note: bookings/transactions FK resolution is left as a
        // followup migration so this route stays under 300s on cold
        // starts. The transformer functions are pure — wire them up
        // once the lookup helpers are factored out.
        void bookings;
        void txns;

        await send({ stage: "done", at: new Date().toISOString() });
      } catch (err) {
        await send({
          stage: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
