import { defineConfig } from "@playwright/test";

/**
 * e2e tests assume the API (+ Postgres + Redis) is already running locally
 * — same precondition as `pnpm dev` in normal development (see README.md).
 * Playwright only manages the Next.js dev server itself.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false, // tests share the same dev DB; avoid cross-test interference
  workers: 1, // fullyParallel:false only serializes within a file — cap workers
  // to 1 too, so separate spec files don't run concurrently against the
  // same dev server/DB either.
  retries: 0,
  reporter: "list",
  // Generous: multi-step flows (signup -> property -> unit -> tenant ->
  // lease) under dev-mode Turbopack's lazy per-route compilation can
  // legitimately take longer than Playwright's 30s default.
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
