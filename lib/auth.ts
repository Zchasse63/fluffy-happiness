/*
 * Server-side auth helpers. Use from API routes + server components
 * to enforce authentication and role gating consistently.
 *
 * `requireRole` returns the validated profile or throws a typed error
 * the route handler can translate into a 401/403.
 */

import { STUDIO_ID } from "@/lib/constants";
import { createSupabaseServer } from "@/lib/supabase/server";

export type AuthProfile = {
  id: string;
  studio_id: string;
  email: string | null;
  full_name: string;
  roles: string[];
};

export class AuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Hard guard: refuse to honor the test bypass in production. A bypass
 * env var leaking into a deployed environment would grant anonymous
 * owner access to the entire studio. Crashing at import time is the
 * lesser evil.
 */
if (
  process.env.TEST_AUTH_BYPASS === "1" &&
  process.env.NODE_ENV === "production"
) {
  throw new Error(
    "TEST_AUTH_BYPASS=1 is not allowed in production. Remove it from your environment immediately.",
  );
}

const TEST_PROFILE: AuthProfile = {
  id: "00000000-0000-0000-0000-000000000001",
  studio_id: STUDIO_ID,
  email: "test@meridian.local",
  full_name: "Test Owner",
  roles: ["owner"],
};

export async function getAuthProfile(): Promise<AuthProfile | null> {
  if (process.env.TEST_AUTH_BYPASS === "1") return TEST_PROFILE;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, studio_id, email, full_name, roles")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data as AuthProfile;
}

export async function requireProfile(): Promise<AuthProfile> {
  const profile = await getAuthProfile();
  if (!profile) {
    throw new AuthError(401, "Not signed in.");
  }
  return profile;
}

export async function requireRole(
  ...roles: string[]
): Promise<AuthProfile> {
  const profile = await requireProfile();
  if (!profile.roles.some((r) => roles.includes(r))) {
    throw new AuthError(403, `Forbidden — need one of: ${roles.join(", ")}.`);
  }
  return profile;
}

export function authErrorResponse(err: unknown) {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return Response.json({ error: "Internal error" }, { status: 500 });
}
