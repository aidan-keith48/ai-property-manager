import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  apiFetch,
  setTenantToken,
  setToken,
  TENANT_TOKEN_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
} from "./api";

function mockFetchOnce(response: {
  ok: boolean;
  status: number;
  json?: unknown;
  contentType?: string;
}) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? (response.contentType ?? "application/json") : null,
    },
    json: async () => response.json,
  } as unknown as Response);
}

describe("apiFetch", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches the landlord Authorization header when a token is stored", async () => {
    setToken("landlord-jwt-123");
    mockFetchOnce({ ok: true, status: 200, json: { ok: true } });

    await apiFetch("/properties");

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer landlord-jwt-123");
  });

  it("sends no Authorization header when auth: false is passed", async () => {
    setToken("landlord-jwt-123");
    mockFetchOnce({ ok: true, status: 200, json: { ok: true } });

    await apiFetch("/auth/landlord/login", { method: "POST", json: {}, auth: false });

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers["Authorization"]).toBeUndefined();
  });

  it("uses the tenant token when tokenKey is TENANT_TOKEN_STORAGE_KEY", async () => {
    setToken("landlord-jwt");
    setTenantToken("tenant-jwt");
    mockFetchOnce({ ok: true, status: 200, json: {} });

    await apiFetch("/submissions", { tokenKey: TENANT_TOKEN_STORAGE_KEY });

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer tenant-jwt");
  });

  it("landlord and tenant tokens are stored independently", () => {
    setToken("landlord-jwt");
    setTenantToken("tenant-jwt");
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("landlord-jwt");
    expect(window.localStorage.getItem(TENANT_TOKEN_STORAGE_KEY)).toBe("tenant-jwt");
  });

  it("returns undefined for a 204 No Content response", async () => {
    mockFetchOnce({ ok: true, status: 204, contentType: "" });
    const result = await apiFetch("/tenants/1");
    expect(result).toBeUndefined();
  });

  it("throws ApiError with the API's detail message on failure", async () => {
    mockFetchOnce({ ok: false, status: 409, json: { detail: "Email already registered" } });

    await expect(apiFetch("/auth/landlord/signup")).rejects.toMatchObject({
      status: 409,
      message: "Email already registered",
    });
  });

  it("ApiError is an instance of Error and carries the status code", async () => {
    mockFetchOnce({ ok: false, status: 403, json: { detail: "Not authorized" } });

    try {
      await apiFetch("/inbox/1");
      expect.unreachable("apiFetch should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err).toBeInstanceOf(Error);
      expect((err as ApiError).status).toBe(403);
    }
  });

  it("falls back to a generic message when the error body has no detail field", async () => {
    mockFetchOnce({ ok: false, status: 500, json: {} });

    await expect(apiFetch("/properties")).rejects.toMatchObject({
      status: 500,
      message: "Request failed with status 500",
    });
  });

  it("sends a JSON body with Content-Type when json is provided", async () => {
    mockFetchOnce({ ok: true, status: 201, json: { id: 1 } });

    await apiFetch("/properties", { method: "POST", json: { name: "Test" } });

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.body).toBe(JSON.stringify({ name: "Test" }));
  });

  it("sends FormData as-is without setting Content-Type (browser sets the boundary)", async () => {
    mockFetchOnce({ ok: true, status: 201, json: {} });
    const formData = new FormData();
    formData.append("description", "test issue");

    await apiFetch("/submissions", { method: "POST", formData });

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers["Content-Type"]).toBeUndefined();
    expect(options.body).toBe(formData);
  });
});
