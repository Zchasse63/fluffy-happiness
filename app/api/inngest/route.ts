/*
 * Inngest registration handler. Inngest hits this endpoint with PUT to
 * register the app's functions and with POST to invoke individual runs.
 *
 * Public route — proxy.ts already excludes /api/webhooks; we'd need
 * /api/inngest in PUBLIC_PREFIXES too if we leave it auth-gated. Inngest
 * verifies its own requests via the signing key, so cookie-auth is the
 * wrong layer here.
 */

import { serve } from "inngest/next";

import { inngest, inngestFunctions } from "@/lib/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});
