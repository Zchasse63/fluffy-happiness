/*
 * Inngest client + typed event definitions.
 *
 * Without INNGEST_SIGNING_KEY/INNGEST_EVENT_KEY the client still
 * constructs (so the dev server can run `npx inngest-cli@latest dev`),
 * but cron deliveries from Inngest cloud require both keys.
 */

import { eventType, Inngest, staticSchema } from "inngest";

export const SyncRequestedEvent = eventType("studio/sync.requested", {
  schema: staticSchema<{ studioId: string; reason?: string }>(),
});

export const BriefingRequestedEvent = eventType("studio/briefing.requested", {
  schema: staticSchema<{ studioId: string }>(),
});

export const inngest = new Inngest({
  id: "meridian",
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
