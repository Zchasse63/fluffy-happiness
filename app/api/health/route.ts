/*
 * Health check. The public response only confirms the app is running;
 * the integration credential map is gated behind an authed session so
 * unauthenticated callers can't enumerate which integrations are wired
 * (audit M-06). Authed dev/prod sessions still see the full map for
 * the settings UI + the e2e suite (which runs under TEST_AUTH_BYPASS).
 */

import { getAuthProfile } from "@/lib/auth";
import { GlofoxClient } from "@/lib/glofox";

export const dynamic = "force-dynamic";

export async function GET() {
  // getAuthProfile is fast under TEST_AUTH_BYPASS (synthetic profile,
  // no DB) and short-circuits to null for unauthenticated callers.
  const profile = await getAuthProfile().catch(() => null);
  const integrations =
    profile != null
      ? {
          supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
          glofox: GlofoxClient.isConfigured(),
          stripe: Boolean(process.env.STRIPE_SECRET_KEY),
          resend: Boolean(process.env.RESEND_API_KEY),
          anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
          inngest: Boolean(process.env.INNGEST_SIGNING_KEY),
        }
      : undefined;

  return Response.json({
    ok: true,
    version: process.env.npm_package_version ?? "0.1.0",
    env: process.env.NODE_ENV,
    ...(integrations ? { integrations } : {}),
    timestamp: new Date().toISOString(),
  });
}
