import { execSync } from "child_process";

/**
 * Flushes rate-limit counters before the e2e suite runs. Without this,
 * repeated local test runs against the same dev Redis instance
 * (infra-redis-1, per infra/docker-compose.yml) accumulate real request
 * counts and eventually trip app/ratelimit.py's real limits — which is
 * correct production behavior, but makes local test runs non-repeatable.
 * Mirrors apps/api/tests/conftest.py's `_reset_rate_limits` fixture, which
 * does the same thing for the pytest suite against its own test DB.
 *
 * Shells out to redis-cli inside the dev container rather than using a
 * Node Redis client — simpler and avoids client-library version friction
 * for what is a one-line cleanup command.
 */
export default async function globalSetup() {
  try {
    execSync(
      `docker exec infra-redis-1 redis-cli --scan --pattern "ratelimit:*" | ` +
        `xargs -r -n1 docker exec infra-redis-1 redis-cli DEL`,
      { stdio: "pipe" },
    );
  } catch {
    // Non-fatal: if docker/the container isn't reachable, rate-limit state
    // just won't be reset — real limits will apply as normal, at worst
    // making a rerun non-repeatable rather than breaking anything.
  }
}
