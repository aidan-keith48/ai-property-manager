#!/usr/bin/env bash
#
# Stops everything dev-start.sh started: the Next.js dev server, the API,
# and the Postgres/Redis containers.
#
# Containers are stopped, not removed — the database volume survives, so
# restarting is fast and your local data is still there. To wipe the
# database too: docker compose -f infra/docker-compose.yml down -v
#
# Used by the "■ Stop App" VSCode action button (.vscode/settings.json).
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

port_pids() {
  lsof -ti:"$1" -sTCP:LISTEN 2>/dev/null || true
}

stop_port() {
  local label="$1" port="$2"
  local pids
  pids="$(port_pids "$port")"

  if [ -z "$pids" ]; then
    echo "==> $label (:$port) not running"
    return 0
  fi

  echo "==> Stopping $label (:$port)"
  # shellcheck disable=SC2086 -- word splitting is intended; $pids may be several
  kill $pids 2>/dev/null

  local i=0
  while [ "$i" -lt 10 ]; do
    [ -z "$(port_pids "$port")" ] && return 0
    i=$((i + 1))
    sleep 1
  done

  # Didn't go down politely — escalate.
  pids="$(port_pids "$port")"
  if [ -n "$pids" ]; then
    echo "    still up after 10s, forcing"
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null
    sleep 1
  fi

  [ -z "$(port_pids "$port")" ] || echo "    ⚠ :$port is still bound — check manually: lsof -i:$port"
}

stop_port "web" 3000
stop_port "API" 8000

if command -v docker >/dev/null; then
  echo "==> Stopping Postgres + Redis"
  docker compose -f infra/docker-compose.yml stop >/dev/null 2>&1 ||
    echo "    ⚠ could not stop containers (is Docker running?)"
fi

echo ""
echo "✓ Stopped. Database data is preserved — ./scripts/dev-start.sh brings it all back."
