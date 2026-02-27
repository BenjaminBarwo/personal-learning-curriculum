---
phase: 01-infrastructure
plan: 01
subsystem: infra
tags: [nextjs, typescript, tailwind, supabase, clerk, auth, middleware]

# Dependency graph
requires: []
provides:
  - Next.js 15 app router project scaffold with TypeScript strict mode
  - Clerk authentication middleware (clerkMiddleware) for all routes
  - Browser Supabase client factory (createClerkSupabaseClient) using Clerk session token
  - Server Supabase client factory (createServerSupabaseClient) using Clerk auth()
  - Admin Supabase client factory (createAdminSupabaseClient) using service role key
  - HARDCODED_USER_ID constant for single-user Phase 1 scaffolding
  - Database types placeholder (src/types/database.types.ts) for pnpm gen-types
  - Supabase local config with Clerk third-party auth enabled
affects:
  - 01-02 (schema migration needs working Next.js codebase)
  - 01-03 (deployment needs this app skeleton)
  - All subsequent phases (auth layer and Supabase client pattern established here)

# Tech tracking
tech-stack:
  added:
    - next@16.1.6
    - react@19.2.3
    - @clerk/nextjs@6.39.0
    - "@supabase/supabase-js@2.98.0"
    - "@supabase/ssr@0.8.0"
    - supabase@2.76.15 (CLI, dev)
    - tailwindcss@4.2.1
    - typescript@5.9.3
  patterns:
    - Two-factory Supabase client pattern (browser factory with Clerk useSession, server factory with Clerk auth())
    - Admin client isolated to server.ts only (service role key never in client code)
    - Clerk middleware wraps all routes via Next.js middleware
    - ClerkProvider wraps app in root layout for session access

key-files:
  created:
    - src/middleware.ts
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/constants/user.ts
    - src/types/database.types.ts
    - .env.example
    - supabase/config.toml
  modified:
    - package.json
    - src/app/layout.tsx
    - src/app/page.tsx
    - .gitignore

key-decisions:
  - "Use clerkMiddleware (not authMiddleware which is deprecated) — matches current Clerk v6 API"
  - "client.ts does not include 'use client' directive — factory is called from client components, not itself a component"
  - "Service role key isolated to createAdminSupabaseClient in server.ts only — not in any NEXT_PUBLIC_ variable"
  - "HARDCODED_USER_ID = user_PLACEHOLDER — user replaces with their actual Clerk user ID after signup"
  - "supabase init run using brew-installed CLI (/opt/homebrew/bin/supabase) — pnpm binary install failed due to missing post-install scripts permission"
  - "pnpm available via corepack shim wrapper at /Users/benjaminbarwo/.local/bin/pnpm"

patterns-established:
  - "Two-factory pattern: createClerkSupabaseClient (browser, useSession) vs createServerSupabaseClient (server, auth())"
  - "Security boundary: createAdminSupabaseClient only in src/lib/supabase/server.ts, never imported client-side"
  - "env management: .env.example committed (variable names only), .env.local gitignored (real secrets)"

requirements-completed: [INFR-03]

# Metrics
duration: 8min
completed: 2026-02-27
---

# Phase 1 Plan 01: Infrastructure Scaffold Summary

**Next.js 15 app with Clerk auth middleware, two-factory Supabase client pattern (browser+server+admin), and service role key isolated to server-only code**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-27T19:58:12Z
- **Completed:** 2026-02-27T20:06:21Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- Scaffolded Next.js 15 with TypeScript strict mode, Tailwind v4, ESLint, app router, pnpm
- Installed all 4 required dependencies: @supabase/supabase-js, @supabase/ssr, @clerk/nextjs, supabase (dev)
- Clerk middleware active via clerkMiddleware with correct Next.js route matchers
- Two-factory Supabase client pattern: browser client (Clerk useSession accessToken), server client (Clerk auth() getToken), admin client (service role — server only)
- Security verified: SUPABASE_SERVICE_ROLE_KEY not in any NEXT_PUBLIC_ variable, not in client.ts
- HARDCODED_USER_ID constant ready for single-user schema seeding
- supabase/config.toml initialized with [auth.third_party.clerk] enabled

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js project and install all dependencies** - `d537be2` (feat)
2. **Task 2: Create Clerk middleware and Supabase client factories** - `a46acf1` (feat)

## Files Created/Modified

- `src/middleware.ts` - Clerk middleware with Next.js route matchers
- `src/lib/supabase/client.ts` - Browser client factory using Clerk useSession + accessToken callback
- `src/lib/supabase/server.ts` - Server client factory (Clerk auth) + admin client (service role)
- `src/constants/user.ts` - HARDCODED_USER_ID = 'user_PLACEHOLDER'
- `src/types/database.types.ts` - Placeholder type (Database = Record<string, never>) for gen-types
- `src/app/layout.tsx` - Root layout with ClerkProvider wrapping, Inter font
- `src/app/page.tsx` - Smoke-test page: Learning Platform / Infrastructure ready
- `src/app/globals.css` - Tailwind v4 global styles
- `.env.example` - Environment variable template (committed, no values)
- `supabase/config.toml` - Supabase local config with Clerk third-party auth enabled
- `package.json` - Project renamed to learning-platform, db:reset/db:push/gen-types scripts added
- `.gitignore` - .env.local excluded, .env.example explicitly allowed
- `tsconfig.json` - TypeScript strict mode confirmed enabled
- `pnpm-lock.yaml` - Lockfile with all dependencies

## Decisions Made

- Used clerkMiddleware (Clerk v6 current API, not deprecated authMiddleware)
- client.ts has no 'use client' directive — it's a factory that callers must invoke from Client Components inside ClerkProvider
- Service role key strictly isolated: only `createAdminSupabaseClient` in `server.ts` references it
- `supabase init` used Homebrew-installed CLI (`/opt/homebrew/bin/supabase`) since pnpm binary install failed (post-install scripts blocked without `pnpm approve-builds`)
- `HARDCODED_USER_ID` placeholder — user must replace with their actual Clerk user ID after account creation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] pnpm not on PATH for create-next-app**
- **Found during:** Task 1 (Scaffold Next.js project)
- **Issue:** pnpm is installed via corepack shim but not symlinked to /usr/local/bin (permission denied). create-next-app requires `pnpm` on PATH to install dependencies.
- **Fix:** Created wrapper script at /Users/benjaminbarwo/.local/bin/pnpm that exec's the corepack shim. Used `export PATH="/Users/benjaminbarwo/.local/bin:$PATH"` per-command.
- **Files modified:** None in project (system path workaround)
- **Verification:** pnpm --version returns 10.30.3; all dependencies installed
- **Committed in:** d537be2 (Task 1 commit)

**2. [Rule 3 - Blocking] Supabase pnpm binary install failed**
- **Found during:** Task 1 (pnpm add -D supabase)
- **Issue:** supabase npm package requires post-install scripts to download platform binary; pnpm blocked these with "Ignored build scripts" warning. Binary not created.
- **Fix:** Used Homebrew-installed supabase CLI (`/opt/homebrew/bin/supabase`) for `supabase init`. The npm package remains in devDependencies for CI compatibility but local init used the system CLI.
- **Files modified:** package.json (supabase in devDependencies preserved)
- **Verification:** supabase/config.toml created successfully
- **Committed in:** d537be2 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - Blocking)
**Impact on plan:** Both auto-fixes necessary to complete task. No scope creep. All plan requirements met.

## Issues Encountered

- pnpm not on PATH: resolved via wrapper script (see deviations)
- supabase CLI binary blocked by pnpm: resolved via Homebrew supabase (see deviations)

## User Setup Required

External services require manual configuration before the app is fully functional:

**Clerk:**
1. Create account at https://clerk.com
2. Create application
3. Copy Publishable key to `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env.local`
4. Copy Secret key to `CLERK_SECRET_KEY` in `.env.local`
5. Create JWT template named "supabase" in Clerk Dashboard -> JWT Templates

**Supabase:**
1. Create project at https://supabase.com
2. Copy Project URL to `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
3. Copy anon/public key to `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
4. Copy service_role key to `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
5. Update `supabase/config.toml` domain: replace `example.clerk.accounts.dev` with your actual Clerk domain

**Verification after setup:**
```bash
pnpm dev
# Visit http://localhost:3000 — should show "Learning Platform / Infrastructure ready."
```

## Next Phase Readiness

- Next.js app runs locally (`pnpm dev` starts, responds HTTP 200)
- Auth layer active — Clerk middleware wraps all routes
- Supabase client factories ready — waiting for real env vars to connect
- Plan 02 (schema migration) can proceed once Supabase env vars are configured
- Blocker: Clerk JWT template for Supabase must be configured before RLS policies work (Phase 1 known blocker from STATE.md)

---
*Phase: 01-infrastructure*
*Completed: 2026-02-27*
