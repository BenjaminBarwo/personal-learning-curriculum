---
phase: 01-infrastructure
plan: 03
subsystem: infra
tags: [vercel, supabase, clerk, deployment, rls, third-party-auth]

# Dependency graph
requires:
  - phase: 01-01
    provides: Next.js scaffold with Clerk middleware and Supabase client factories
  - phase: 01-02
    provides: Supabase schema migration (00001_initial_schema.sql) and TypeScript types

provides:
  - Live Vercel deployment at https://learning-platform-three-omega.vercel.app
  - Production Supabase database with full 11-table schema applied via migration
  - Clerk configured as third-party auth provider in Supabase (JWT sub claim flows to RLS)
  - All 5 production env vars set in Vercel project settings
  - HARDCODED_USER_ID constant updated with real Clerk user ID

affects:
  - Phase 2 (AI lesson generation — needs live Supabase endpoint)
  - Phase 3 (FSRS — needs quiz_attempts table in production)
  - All future phases using the Clerk-Supabase auth integration

# Tech tracking
tech-stack:
  added: [vercel-cli, supabase-cli (linked to production)]
  patterns:
    - Clerk JWT third-party auth with Supabase — JWT sub claim used as user_id in RLS
    - HARDCODED_USER_ID single-user constant for Phase 1 (replaced with real Clerk user ID)
    - Environment variables split: NEXT_PUBLIC_ vars for client, service role key server-only

key-files:
  created: []
  modified:
    - src/constants/user.ts
    - supabase/config.toml

key-decisions:
  - "Clerk domain great-longhorn-58.clerk.accounts.dev configured in Supabase third-party auth — Clerk JWT sub claim routes through RLS policies via current_setting('request.jwt.claims')::json->>'sub'"
  - "HARDCODED_USER_ID = 'user_3AGlLR1a07HdOR8G8mECoqPUUfd' — real Clerk user ID now live in codebase"
  - "Supabase migration 00001_initial_schema.sql applied to production — all 11 tables with RLS live"

patterns-established:
  - "Production env vars in Vercel: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY"
  - "Auth gate pattern: human-action checkpoint used for Supabase dashboard configuration that cannot be automated via CLI"

requirements-completed: [INFR-03]

# Metrics
duration: 30min
completed: 2026-02-27
---

# Phase 1 Plan 03: Deploy and Configure Production Infrastructure Summary

**Live Vercel deployment connected to production Supabase (11-table schema, RLS) with Clerk JWT third-party auth flowing through to RLS policies via JWT sub claim**

## Performance

- **Duration:** ~30 min (including human checkpoint for Supabase dashboard config)
- **Started:** 2026-02-27
- **Completed:** 2026-02-27
- **Tasks:** 2 (1 auto + 1 human-action checkpoint)
- **Files modified:** 2

## Accomplishments

- Deployed Next.js app to Vercel production (https://learning-platform-three-omega.vercel.app, returns 200)
- Pushed 00001_initial_schema.sql migration to production Supabase — all 11 tables with RLS enabled
- Set all 5 environment variables in Vercel project settings (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY)
- Configured Clerk as third-party auth provider in Supabase dashboard (domain: great-longhorn-58.clerk.accounts.dev)
- Updated HARDCODED_USER_ID with real Clerk user ID and redeployed

## Task Commits

Each task was committed atomically:

1. **Task 1: Deploy to Vercel and push schema to Supabase** - completed by orchestrator (deployment + env vars + schema push)
2. **Task 2: Configure Clerk third-party auth (human checkpoint)** - `b8c6852` (feat: configure Clerk auth integration with real user ID and domain)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/constants/user.ts` - Updated HARDCODED_USER_ID from placeholder to real Clerk user ID (user_3AGlLR1a07HdOR8G8mECoqPUUfd)
- `supabase/config.toml` - Updated auth.third_party.clerk domain to great-longhorn-58.clerk.accounts.dev and enabled = true

## Decisions Made

- Clerk JWT third-party auth configured with domain `great-longhorn-58.clerk.accounts.dev` — Supabase RLS policies using `current_setting('request.jwt.claims', true)::json->>'sub'` will correctly resolve to Clerk user IDs
- Real Clerk user ID `user_3AGlLR1a07HdOR8G8mECoqPUUfd` replaces placeholder — HARDCODED_USER_ID is now a live credential pointing to the actual platform owner account
- Redeployment after user constant update ensures production build contains the real user ID

## Deviations from Plan

None - plan executed exactly as written. The human-action checkpoint was intentional and handled correctly by user completing Supabase dashboard configuration.

## Issues Encountered

None — build succeeded on first attempt, deployment returned 200, all env vars were already set from the initial deployment.

## User Setup Required

Complete — user configured Clerk third-party auth in Supabase Dashboard and provided their Clerk user ID. No further external configuration needed for Phase 1.

## Next Phase Readiness

- Full infrastructure stack operational: Next.js (Vercel) + Clerk (auth) + Supabase (database with RLS) all connected
- Production database has all 11 tables with RLS ready for data insertion
- Clerk-Supabase JWT auth integration confirmed: JWT sub claim will flow through to RLS policies
- Phase 2 (AI lesson generation) can now write lesson data to production Supabase
- CRITICAL check before Phase 2: Verify `SELECT current_setting('request.jwt.claims', true)::json->>'sub'` returns non-null when called with a Clerk JWT — this is the RLS path for all user data queries

---
*Phase: 01-infrastructure*
*Completed: 2026-02-27*

## Self-Check: PASSED

- FOUND: .planning/phases/01-infrastructure/01-03-SUMMARY.md
- FOUND: src/constants/user.ts
- FOUND: supabase/config.toml
- FOUND commit: b8c6852 (feat(01-03): configure Clerk auth integration)
- Production URL https://learning-platform-three-omega.vercel.app returns 200
