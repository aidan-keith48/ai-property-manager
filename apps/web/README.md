# Web

Next.js (App Router) landlord dashboard for AI Property Manager. Next.js 16,
React 19, TypeScript, Tailwind CSS 4, pnpm.

## Setup

```
cd apps/api && poetry run uvicorn app.main:app --port 8000   # backend must be running
cd apps/web
cp .env.example .env.local
pnpm install
pnpm dev
```

Dashboard: http://localhost:3000

## Structure

- `app/login`, `app/signup` — landlord auth pages
- `app/(dashboard)` — protected route group (redirects to `/login` if not
  authenticated); layout renders the nav bar and enforces the auth guard
  - `properties/`, `properties/[propertyId]` — property + unit management
  - `units/[unitId]` — lease creation/ending, lease document upload
  - `tenants/`, `tenants/[tenantId]` — tenant CRUD
- `lib/auth-context.tsx` — client-side auth state (JWT in `localStorage`,
  `useAuth()` hook)
- `lib/api.ts` — fetch wrapper: attaches the JWT, base URL from
  `NEXT_PUBLIC_API_URL`, throws `ApiError` with the API's `detail` message
- `lib/types.ts` — hand-written TS types mirroring `apps/api/app/schemas/`
  (no OpenAPI codegen pipeline yet — `packages/shared-types` stays a
  placeholder until that's worth setting up)

## Notes

- Auth: the JWT lives in `localStorage`, sent as `Authorization: Bearer`
  on every API call — there's no cookie/session on the Next.js side. This
  matches the API's own design (it returns tokens, not cookies) and keeps
  Phase 1 simple; revisit if SSR-authenticated pages are ever needed.
- Data fetching is plain `useEffect` + `fetch`, no SWR/React Query yet —
  acceptable per the PRD's architecture section, which allows "polling ...
  as a simpler v1" ahead of real-time updates.
- Client Components use React's `use()` to unwrap the now-async `params`
  prop on dynamic routes (Next.js 16 behavior — see
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`
  if this project ever upgrades further and something here breaks).
