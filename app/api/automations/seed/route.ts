/*
 * POST /api/automations/seed — seed the four default flows
 * (welcome, win-back, credit expiry, failed-payment recovery).
 * Idempotent — only inserts flows whose `name` is not yet present.
 */

import { authErrorResponse, requireRole } from "@/lib/auth";
import { seedDefaultAutomations } from "@/lib/data/automations";

export async function POST() {
  try {
    const profile = await requireRole("owner", "manager");
    const result = await seedDefaultAutomations(profile.studio_id, profile.id);
    return Response.json(result);
  } catch (err) {
    return authErrorResponse(err);
  }
}
