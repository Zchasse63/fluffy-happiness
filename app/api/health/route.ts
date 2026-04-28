/*
 * Health check — used by Netlify, status pages, and ⌘K's "Is the system
 * up?" question. Reports config presence (does NOT validate creds).
 */

import { GlofoxClient } from "@/lib/glofox";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    version: process.env.npm_package_version ?? "0.1.0",
    env: process.env.NODE_ENV,
    integrations: {
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      glofox: GlofoxClient.isConfigured(),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
      resend: Boolean(process.env.RESEND_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      inngest: Boolean(process.env.INNGEST_SIGNING_KEY),
    },
    timestamp: new Date().toISOString(),
  });
}
