const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Separate storage keys for the two personas so a landlord and a tenant
// session can coexist in the same browser (e.g. a landlord testing the
// tenant portal) without clobbering each other.
export const TOKEN_STORAGE_KEY = "apm_token";
export const TENANT_TOKEN_STORAGE_KEY = "apm_tenant_token";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isUnauthorized(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 401;
}

function getStoredToken(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

function setStoredToken(key: string, token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(key, token);
  } else {
    window.localStorage.removeItem(key);
  }
}

export function setToken(token: string | null): void {
  setStoredToken(TOKEN_STORAGE_KEY, token);
}

export function setTenantToken(token: string | null): void {
  setStoredToken(TENANT_TOKEN_STORAGE_KEY, token);
}

interface ApiFetchOptions {
  method?: string;
  json?: unknown;
  formData?: FormData;
  auth?: boolean; // default true
  tokenKey?: string; // default TOKEN_STORAGE_KEY (landlord)
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", json, formData, auth = true, tokenKey = TOKEN_STORAGE_KEY } = options;
  const headers: Record<string, string> = {};

  if (auth) {
    const token = getStoredToken(tokenKey);
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (formData) {
    body = formData;
  } else if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }

  const response = await fetch(`${API_URL}${path}`, { method, headers, body });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail: unknown }).detail)
        : null) ?? `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as T;
}

/** For binary responses (e.g. submission photos) that need the
 * Authorization header — a plain <img src> can't send custom headers, so
 * callers fetch the blob and turn it into an object URL themselves. */
export async function apiFetchBlob(path: string, tokenKey = TOKEN_STORAGE_KEY): Promise<Blob> {
  const token = getStoredToken(tokenKey);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { headers });
  if (!response.ok) {
    throw new ApiError(response.status, `Request failed with status ${response.status}`);
  }
  return response.blob();
}
