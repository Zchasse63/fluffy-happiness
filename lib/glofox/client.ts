/*
 * Glofox REST client — verified against the official OpenAPI 2.2 spec
 * + the project's Glofox API guide (docs/glofox-api-guide.md).
 *
 * Auth: 3 headers — x-api-key, x-glofox-api-token, x-glofox-branch-id.
 * Live: 10 req/sec · Sandbox: 3 req/sec · Burst: 1000/300s.
 *
 * Per rebuild-handoff §4.3 patterns A + B + C — keep retryable
 * (network/429/5xx) separate from non-retryable (4xx) failures, and
 * use the project's Paged<T> contract.
 *
 * Without GLOFOX_API_KEY/GLOFOX_API_TOKEN every method throws
 * `GlofoxNotConfigured` so callers can fall back to fixtures.
 */

import type { Paged } from "./types";

export class GlofoxNotConfigured extends Error {
  constructor() {
    super(
      "Glofox API credentials missing — set GLOFOX_API_KEY + GLOFOX_API_TOKEN.",
    );
    this.name = "GlofoxNotConfigured";
  }
}

export class GlofoxApiError extends Error {
  constructor(
    public status: number,
    public path: string,
    message: string,
  ) {
    super(`[${status}] ${path} — ${message}`);
    this.name = "GlofoxApiError";
  }
}

type RequestOptions = {
  params?: Record<string, unknown>;
  body?: unknown;
};

const DEFAULT_BASE = "https://gf-api.aws.glofox.com/prod";
const SAFETY_PAGE_CAP = 200;
const PAGE_SIZE = 100;

export type GlofoxConfig = {
  apiKey: string;
  apiToken: string;
  branchId: string;
  baseUrl?: string;
};

export class GlofoxClient {
  constructor(private cfg: GlofoxConfig) {}

  static fromEnv(): GlofoxClient {
    const apiKey = process.env.GLOFOX_API_KEY;
    const apiToken = process.env.GLOFOX_API_TOKEN;
    const branchId = process.env.GLOFOX_BRANCH_ID;
    if (!apiKey || !apiToken || !branchId) {
      throw new GlofoxNotConfigured();
    }
    return new GlofoxClient({ apiKey, apiToken, branchId });
  }

  static isConfigured(): boolean {
    // GLOFOX_NAMESPACE is required by the transactions endpoint —
    // missing it produces empty TransactionsList responses silently
    // (audit LOW-6). Treat it as load-bearing.
    return Boolean(
      process.env.GLOFOX_API_KEY &&
        process.env.GLOFOX_API_TOKEN &&
        process.env.GLOFOX_BRANCH_ID &&
        process.env.GLOFOX_NAMESPACE,
    );
  }

  /**
   * Some Glofox endpoints return `200 OK` with `{success:false}` on
   * routing errors. We treat that as a 4xx so the caller doesn't
   * silently swallow misconfiguration.
   */
  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const base = this.cfg.baseUrl ?? DEFAULT_BASE;
    const url = new URL(`${base}${path}`);
    if (options.params) {
      for (const [k, v] of Object.entries(options.params)) {
        if (v == null) continue;
        url.searchParams.set(k, String(v));
      }
    }
    const headers: Record<string, string> = {
      "x-glofox-api-token": this.cfg.apiToken,
      "x-api-key": this.cfg.apiKey,
      "x-glofox-branch-id": this.cfg.branchId,
      "Content-Type": "application/json",
    };

    const maxAttempts = 3;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(url, {
          method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
        });
        if (res.status === 429) {
          const retryAfter = Number(res.headers.get("retry-after") ?? "1");
          await sleep(retryAfter * 1000);
          continue;
        }
        if (res.status >= 500) {
          await sleep(250 * 2 ** (attempt - 1));
          continue;
        }
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new GlofoxApiError(
            res.status,
            path,
            (json && JSON.stringify(json)) || res.statusText,
          );
        }
        // Glofox quirk: 200 with success=false
        if (
          json &&
          typeof json === "object" &&
          "success" in json &&
          (json as Record<string, unknown>).success === false
        ) {
          throw new GlofoxApiError(
            400,
            path,
            JSON.stringify(json),
          );
        }
        return json as T;
      } catch (err) {
        lastErr = err;
        if (err instanceof GlofoxApiError) throw err; // 4xx
        await sleep(250 * 2 ** (attempt - 1));
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error("Glofox request failed after retries");
  }

  /** Loop pages until has_more=false or page-cap reached. */
  async fetchAll<T>(
    path: string,
    params: Record<string, unknown> = {},
    opts: { dataKey?: string } = {},
  ): Promise<T[]> {
    const all: T[] = [];
    let page = 1;
    while (page <= SAFETY_PAGE_CAP) {
      const result = await this.request<
        Paged<T> & Record<string, unknown>
      >("GET", path, {
        params: { ...params, limit: PAGE_SIZE, page },
      });
      const data =
        (opts.dataKey
          ? (result[opts.dataKey] as T[])
          : result.data) ?? [];
      all.push(...data);
      const hasMore =
        result.has_more === true ||
        (typeof result.total_count === "number"
          ? all.length < result.total_count
          : data.length === PAGE_SIZE);
      if (!hasMore) break;
      page++;
      await sleep(120); // gentle pace, well under 10 req/sec
    }
    return all;
  }

  // ── Endpoint shortcuts (paths verified against guide v2.2.0) ────────

  /** Members (a.k.a. clients) for the configured branch. */
  members(params?: { utc_modified_start_date?: string }) {
    return this.fetchAll<import("./types").GlofoxMember>(
      `/2.0/members`,
      params ?? {},
    );
  }

  member(id: string) {
    return this.request<import("./types").GlofoxMember>(
      "GET",
      `/2.0/members/${id}`,
    );
  }

  /** Staff (admins, trainers, reception). */
  staff(params?: { type?: "ADMIN" | "MEMBER" | "RECEPTION" | "TRAINER" }) {
    return this.fetchAll<import("./types").GlofoxStaff>(
      `/2.0/staff`,
      params ?? {},
    );
  }

  /** Membership plans configured for the studio. */
  membershipPlans() {
    return this.fetchAll<{
      _id: string;
      branch_id: string;
      namespace: string;
      active: boolean;
      name: string;
      description?: string;
      buy_just_once?: boolean;
      plans?: Array<{
        code: string;
        type: string;
        duration_time_unit?: string;
        duration_time_unit_count?: number;
        price?: number;
        upfront_fee?: number;
      }>;
    }>(`/2.0/memberships`);
  }

  /**
   * Programs / categories — POST search endpoint scoped by location.
   * In Glofox, branch_id == location_id for single-location studios.
   */
  async programs() {
    return this.request<{
      data: Array<{ _id: string; name: string; description?: string; active?: boolean }>;
    }>("POST", `/v3.0/locations/${this.cfg.branchId}/search-programs`, {
      body: { active: true },
    }).then((r) => r.data ?? []);
  }

  /** Class instances ("events"). Use `start`/`end` (unix string seconds) to scope. */
  classes(params?: {
    start?: string;
    end?: string;
    utc_modified_start_date?: string;
  }) {
    return this.fetchAll<import("./types").GlofoxClass>(
      `/2.0/events`,
      params ?? {},
    );
  }

  /** Studio-wide bookings. ISO 8601 date range supported. */
  bookings(params?: {
    start_date?: string;
    end_date?: string;
    modified_start_date?: string;
    modified_end_date?: string;
    status?: string;
  }) {
    return this.fetchAll<import("./types").GlofoxBooking>(
      `/2.2/branches/${this.cfg.branchId}/bookings`,
      params ?? {},
    );
  }

  /**
   * Transactions report — POST with required model:"TransactionsList".
   * Response wraps in `TransactionsList.details[]`, not `data[]`.
   * `start`/`end` are STRING unix-second timestamps.
   */
  async transactions(params: { startUnix: string; endUnix: string }) {
    const res = await this.request<{
      TransactionsList?: { details?: import("./types").GlofoxTransaction[] };
    }>("POST", `/Analytics/report`, {
      body: {
        model: "TransactionsList",
        branch_id: this.cfg.branchId,
        namespace: process.env.GLOFOX_NAMESPACE,
        start: params.startUnix,
        end: params.endUnix,
        filter: {
          ReportByMembers: false,
          CompareToRanges: false,
          PaymentMethods: [
            { id: "cash" },
            { id: "credit_card" },
            { id: "bank_transfer" },
            { id: "paypal" },
            { id: "direct_debit" },
            { id: "complimentary" },
            { id: "wallet" },
          ],
        },
      },
    });
    return res.TransactionsList?.details ?? [];
  }

  /** Leads — POST filter endpoint. */
  async leads(params?: { lead_status?: string[] }) {
    return this.request<{
      data?: import("./types").GlofoxLead[];
      total_count?: number;
    }>("POST", `/2.1/branches/${this.cfg.branchId}/leads/filter`, {
      body: params ?? {},
    }).then((r) => r.data ?? []);
  }

  /** Per-member credit packs. */
  credits(userId: string) {
    return this.request<{
      data?: Array<{
        _id: string;
        branch_id: string;
        user_id: string;
        model: string;
        num_sessions: number;
        active: boolean;
        start_date?: string;
        end_date?: string;
        membership_id?: string;
        membership_name?: string;
      }>;
    }>("GET", `/2.0/credits`, { params: { user_id: userId } }).then(
      (r) => r.data ?? [],
    );
  }
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/** Glofox wraps each transaction in a payment-provider key (legacy). */
export function unwrapTransactionRow(
  row: import("./types").GlofoxTransactionRow,
): import("./types").GlofoxTransaction | null {
  const keys = Object.keys(row);
  if (!keys.length) return null;
  const first = keys[0];
  return row[first] ?? null;
}
