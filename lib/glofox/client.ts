/*
 * Glofox REST client — retry, rate-limit handling, auto-pagination.
 *
 * Live: 10 req/sec · Sandbox: 3 req/sec · Burst: 1000/300s.
 * Endpoints documented at https://apidocs-plat.aws.glofox.com/openapi.yaml
 *
 * Per rebuild-handoff §4.3 patterns A + B + C — keep separation of
 * retryable (network/429/5xx) vs non-retryable (4xx) failures.
 *
 * NOTE: live calls are gated behind GLOFOX_API_KEY/GLOFOX_API_TOKEN. With
 * those unset (the autonomous build) every method throws
 * `GlofoxNotConfigured` — callers should fall back to fixtures.
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
    return Boolean(
      process.env.GLOFOX_API_KEY &&
        process.env.GLOFOX_API_TOKEN &&
        process.env.GLOFOX_BRANCH_ID,
    );
  }

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
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new GlofoxApiError(res.status, path, text || res.statusText);
        }
        return (await res.json()) as T;
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
  ): Promise<T[]> {
    const all: T[] = [];
    let page = 0;
    while (page < SAFETY_PAGE_CAP) {
      const result = await this.request<Paged<T>>("GET", path, {
        params: { ...params, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
      });
      const data = result.data ?? [];
      all.push(...data);
      const hasMore =
        result.has_more === true ||
        (typeof result.total_count === "number"
          ? all.length < result.total_count
          : data.length === PAGE_SIZE);
      if (!hasMore) break;
      page++;
      await sleep(100); // gentle pace
    }
    return all;
  }

  // ── Endpoint shortcuts (typed wrappers around request/fetchAll) ──

  members() {
    return this.fetchAll<import("./types").GlofoxMember>(
      `/2.0/branches/${this.cfg.branchId}/members`,
    );
  }
  member(id: string) {
    return this.request<import("./types").GlofoxMember>(
      "GET",
      `/2.0/members/${id}`,
    );
  }
  staff() {
    return this.fetchAll<import("./types").GlofoxStaff>(
      `/2.0/branches/${this.cfg.branchId}/staff`,
    );
  }
  programs() {
    return this.fetchAll<import("./types").GlofoxProgram>(
      `/2.0/branches/${this.cfg.branchId}/programs`,
    );
  }
  classes(params?: { from?: string; to?: string }) {
    return this.fetchAll<import("./types").GlofoxClass>(
      `/2.0/branches/${this.cfg.branchId}/events`,
      params ?? {},
    );
  }
  bookings(params?: { from?: string; to?: string }) {
    return this.fetchAll<import("./types").GlofoxBooking>(
      `/2.2/branches/${this.cfg.branchId}/bookings`,
      params ?? {},
    );
  }
  transactionsRaw() {
    return this.fetchAll<import("./types").GlofoxTransactionRow>(
      `/2.0/branches/${this.cfg.branchId}/analytics/report`,
      { type: "transactions" },
    );
  }
  leads(params?: { status?: string }) {
    return this.fetchAll<import("./types").GlofoxLead>(
      `/2.1/branches/${this.cfg.branchId}/leads/filter`,
      params ?? {},
    );
  }
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/** Glofox wraps each transaction in a payment-provider key. Flatten it. */
export function unwrapTransactionRow(
  row: import("./types").GlofoxTransactionRow,
): import("./types").GlofoxTransaction | null {
  const keys = Object.keys(row);
  if (!keys.length) return null;
  const first = keys[0];
  return row[first] ?? null;
}
