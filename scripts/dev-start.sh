#!/usr/bin/env bash
#
# Starts the whole local stack: Postgres + Redis (docker), the FastAPI API,
# and the Next.js dev server. Safe to run repeatedly — every step is
# idempotent, and anything already running is left alone.
#
# Used by the "▶ Start App" VSCode action button (.vscode/settings.json),
# but works standalone too: ./scripts/dev-start.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

LOG_DIR="$REPO_ROOT/.dev-logs"
mkdir -p "$LOG_DIR"

API_PORT=8000
WEB_PORT=3000

# Toolchain locations, prepended only when they exist — keeps this working
# on machines that install node/poetry somewhere else.
for candidate in \
  "/opt/homebrew/opt/node@22/bin" \
  "$HOME/.local/bin" \
  "$HOME/Library/Python/3.11/bin"; do
  [ -d "$candidate" ] && PATH="$candidate:$PATH"
done
export PATH

die() {
  echo "✗ $1" >&2
  exit 1
}

port_pids() {
  lsof -ti:"$1" -sTCP:LISTEN 2>/dev/null || true
}

wait_for() {
  # wait_for <label> <seconds> <command...>
  local label="$1" limit="$2"
  shift 2
  local i=0
  while [ "$i" -lt "$limit" ]; do
    if "$@" >/dev/null 2>&1; then
      return 0
    fi
    i=$((i + 1))
    sleep 1
  done
  echo "✗ timed out after ${limit}s waiting for $label" >&2
  return 1
}

command -v docker >/dev/null || die "docker not found — install Docker Desktop and start it."
command -v poetry >/dev/null || die "poetry not found — see apps/api/README.md."
command -v pnpm >/dev/null || die "pnpm not found — run: corepack enable && corepack prepare pnpm@9 --activate"

# ---------------------------------------------------------------- infra ----
echo "==> Postgres + Redis"
docker compose -f infra/docker-compose.yml up -d >/dev/null
wait_for "Postgres" 60 docker compose -f infra/docker-compose.yml exec -T postgres pg_isready -U apm ||
  die "Postgres never became ready. Check: docker compose -f infra/docker-compose.yml logs postgres"
wait_for "Redis" 30 docker compose -f infra/docker-compose.yml exec -T redis redis-cli ping ||
  die "Redis never became ready. Check: docker compose -f infra/docker-compose.yml logs redis"
echo "    ready (postgres :5433, redis :6380)"

# ------------------------------------------------------------- env files ----
if [ ! -f apps/api/.env ]; then
  cp apps/api/.env.example apps/api/.env
  echo "==> Created apps/api/.env from .env.example"
fi
if [ ! -f apps/web/.env.local ]; then
  cp apps/web/.env.example apps/web/.env.local
  echo "==> Created apps/web/.env.local from .env.example"
fi

# ------------------------------------------------------------------ deps ----
if [ ! -d node_modules ] || [ ! -d apps/web/node_modules ]; then
  echo "==> Installing JS dependencies (first run)"
  pnpm install
fi

# --------------------------------------------------------------- backend ----
if [ -n "$(port_pids $API_PORT)" ]; then
  echo "==> API already running on :$API_PORT — leaving it alone"
else
  echo "==> Applying database migrations"
  (cd apps/api && poetry install --quiet && poetry run alembic upgrade head >/dev/null) ||
    die "Migrations failed. Run manually: cd apps/api && poetry run alembic upgrade head"

  echo "==> Starting API on :$API_PORT"
  (
    cd apps/api
    nohup poetry run uvicorn app.main:app --port "$API_PORT" --reload \
      >"$LOG_DIR/api.log" 2>&1 &
  )
  wait_for "the API" 45 curl -sf "http://localhost:$API_PORT/health" ||
    die "API failed to start. Logs: $LOG_DIR/api.log"
fi

# -------------------------------------------------------------- frontend ----
if [ -n "$(port_pids $WEB_PORT)" ]; then
  echo "==> Web already running on :$WEB_PORT — leaving it alone"
else
  echo "==> Starting web on :$WEB_PORT"
  nohup pnpm --filter web dev >"$LOG_DIR/web.log" 2>&1 &
  wait_for "the web app" 60 curl -sf "http://localhost:$WEB_PORT" ||
    die "Web app failed to start. Logs: $LOG_DIR/web.log"
fi

cat <<EOF

✓ Running.

  Landlord dashboard   http://localhost:$WEB_PORT
  Tenant portal        http://localhost:$WEB_PORT/portal
  API docs             http://localhost:$API_PORT/docs

  Logs                 tail -f .dev-logs/api.log
                       tail -f .dev-logs/web.log
  Stop                 ./scripts/dev-stop.sh  (or the "■ Stop App" button)
EOF
