/*
 * Rate-limiting helper backed by the `rate_limits` table + check_rate_limit
 * RPC (migration 0016). Used to cap Anthropic spend on cost-sensitive
 * routes — Ask Meridian + briefing regeneration — and to slow down any
 * compromised owner account before damage compounds.
 *
 * Returns a typed result instead of throwing so route handlers can surface
 * a 429 with a `Retry-After` header.
 */

import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type RateLimitResult = {
  allowed: boolean;
  /** Milliseconds until the bucket resets. 0 when allowed. */
  retryAfterMs: number;
  /** Current count in the bucket after this call. */
  current: number;
};

export type RateLimitOptions = {
  studioId: string;
  /** Stable bucket key — combine purpose + actor, e.g. `ai:ask:<profile_id>`. */
  key: string;
  /** Maximum allowed events per window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

/** Atomic check + increment. Falls open on RPC error so a database blip
 *  doesn't take down a critical path. */
export async function checkRateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_studio_id: opts.studioId,
      p_key: opts.key,
      p_max: opts.max,
      p_window_ms: opts.windowMs,
    });
    if (error || !data || data.length === 0) {
      // Service-role missing or RPC absent — log and fail open.
      // eslint-disable-next-line no-console
      console.error("[rate-limit] RPC failed; failing open", error);
      return { allowed: true, retryAfterMs: 0, current: 0 };
    }
    const row = data[0] as {
      allowed: boolean;
      retry_after_ms: number;
      current_count: number;
    };
    return {
      allowed: row.allowed,
      retryAfterMs: Number(row.retry_after_ms),
      current: row.current_count,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[rate-limit] unexpected error; failing open", err);
    return { allowed: true, retryAfterMs: 0, current: 0 };
  }
}

/** Convenience: build a 429 response with the correct headers when a
 *  caller is rate-limited. */
export function rateLimitedResponse(result: RateLimitResult): Response {
  const retryAfterSec = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
  return Response.json(
    {
      error: "Rate limit exceeded",
      retry_after_seconds: retryAfterSec,
      current_count: result.current,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}
