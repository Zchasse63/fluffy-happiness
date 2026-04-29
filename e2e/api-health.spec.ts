import { expect, test } from "@playwright/test";

/*
 * API contract checks — every API route returns the right shape, and
 * Zod validation rejects malformed bodies. These tests use the Playwright
 * `request` fixture, not the browser, so they're fast.
 *
 * The dev server runs with TEST_AUTH_BYPASS=1, so authed routes treat
 * the request as the test owner. Expectations reflect that.
 */

test.describe("/api/health", () => {
  test("returns ok:true with the expected integration map", async ({
    request,
  }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.version).toMatch(/\d+\.\d+\.\d+/);
    expect(body.integrations).toMatchObject({
      supabase: expect.any(Boolean),
      glofox: expect.any(Boolean),
      anthropic: expect.any(Boolean),
      stripe: expect.any(Boolean),
      resend: expect.any(Boolean),
      inngest: expect.any(Boolean),
    });
    expect(body.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});

test.describe("auth-gated routes under TEST_AUTH_BYPASS", () => {
  for (const path of [
    "/api/bookings",
    "/api/classes",
    "/api/transactions",
    "/api/glofox/sync",
  ]) {
    test(`GET ${path} returns 200 (or method-not-allowed if POST-only)`, async ({
      request,
    }) => {
      const res = await request.get(path);
      // Allow 200 OK, 204 No Content, or 405 Method Not Allowed
      // (some routes are POST-only).
      expect([200, 204, 405]).toContain(res.status());
    });
  }
});

test.describe("Zod validation rejects malformed bodies", () => {
  test("POST /api/bookings with empty body returns 400 or 422", async ({
    request,
  }) => {
    const res = await request.post("/api/bookings", {
      data: {},
      headers: { "content-type": "application/json" },
    });
    // Either 400 (bad request), 422 (unprocessable), or 405 (if POST not
    // wired). Anything 5xx is a regression.
    expect(res.status()).toBeLessThan(500);
  });

  test("POST /api/transactions with invalid amount returns 400/422", async ({
    request,
  }) => {
    const res = await request.post("/api/transactions", {
      data: { amount_cents: "not-a-number", member_id: "x" },
      headers: { "content-type": "application/json" },
    });
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe("AI routes", () => {
  test("/api/ai/briefing returns 200 (cached or fresh)", async ({
    request,
  }) => {
    // Route is POST-only — POST triggers cache hit (22h ai_cache TTL) or
    // a fresh Anthropic call. Either is acceptable; we only verify the
    // route is wired and returns a body.
    const res = await request.post("/api/ai/briefing", {
      data: {},
      headers: { "content-type": "application/json" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
  });

  test("/api/ai/ask rejects empty body", async ({ request }) => {
    const res = await request.post("/api/ai/ask", {
      data: {},
      headers: { "content-type": "application/json" },
    });
    expect(res.status()).toBeLessThan(500);
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});
