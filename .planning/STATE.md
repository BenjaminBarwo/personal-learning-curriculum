# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** Every lesson must be so frictionless to start and so engaging to continue that the learner never talks themselves out of opening one.
**Current focus:** Phase 1 — Infrastructure

## Current Position

Phase: 1 of 6 (Infrastructure)
Plan: 3 of 3 in current phase (COMPLETE)
Status: Phase 1 complete — ready for Phase 2
Last activity: 2026-02-27 — Plan 03 executed: Deploy to Vercel, push schema to Supabase, configure Clerk third-party auth

Progress: [███░░░░░░░] 17%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 14 min
- Total execution time: 0.7 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-infrastructure | 3 | 41 min | 13.7 min |

**Recent Trend:**
- Last 5 plans: 8 min, 3 min, 30 min
- Trend: Variable (30 min includes human-action checkpoint)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-Phase 1]: Clerk JWT template for Supabase must be configured in Clerk dashboard BEFORE any RLS policy is written — Day 0 task; verify with `SELECT auth.uid()` returning non-null
- [Pre-Phase 1]: Use raw MDX string in `lessons.mdx_content` (not JSON AST) — simpler, sufficient for current scope; decide before schema is finalized
- [Pre-Phase 1]: No `users` table in Supabase for Phase 1 — bare Clerk user ID string on all tables avoids webhook complexity for single-user case
- [01-01]: Used clerkMiddleware (Clerk v6 current API, not deprecated authMiddleware)
- [01-01]: Two-factory Supabase client pattern: browser (useSession+accessToken) vs server (auth()+getToken); admin client isolated to server.ts
- [01-01]: HARDCODED_USER_ID placeholder = 'user_PLACEHOLDER' — user replaces with actual Clerk user ID after signup
- [01-01]: pnpm available via wrapper at /Users/benjaminbarwo/.local/bin/pnpm (corepack shim, /usr/local/bin needs sudo)
- [01-02]: RLS uses current_setting('request.jwt.claims', true)::json->>'sub' — never auth.uid() (returns NULL with Clerk JWTs)
- [01-02]: user_id is TEXT type everywhere — Clerk user IDs are strings (user_2abc...), not UUIDs
- [01-02]: Manual TypeScript types used (Option C) — Docker daemon not running, replaced placeholder; regenerate once Supabase project linked
- [01-02]: quiz_attempts and lesson_versions both in Phase 1 schema — FSRS needs early data, AI generation needs rollback from day one
- [01-03]: Clerk JWT third-party auth configured in Supabase with domain great-longhorn-58.clerk.accounts.dev — RLS uses JWT sub claim via current_setting
- [01-03]: HARDCODED_USER_ID updated to real Clerk user ID user_3AGlLR1a07HdOR8G8mECoqPUUfd — single-user Phase 1 credential live in production
- [01-03]: Production Vercel URL https://learning-platform-three-omega.vercel.app — all 5 env vars set, schema migration applied

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Clerk JWT + Supabase RLS integration is CRITICAL — if `auth.uid()` returns null, all user data queries silently return zero rows. Must be resolved before any data access code is written.
- [Phase 1]: Service role key must NEVER appear in a `NEXT_PUBLIC_` variable or any `"use client"` file. Establish two Supabase client factories from the start.
- [Phase 3]: `quiz_attempts` table schema must exist in Phase 1 schema (not Phase 4) — FSRS in Phase 3 requires accumulated attempt history; retrofitting loses early data.
- [Phase 3]: `lesson_content_versions` table must exist in Phase 1 schema — AI generation in Phase 2 can overwrite hand-written content without rollback otherwise. [RESOLVED by 01-02: lesson_versions table created]
- [Phase 1 RESOLVED]: Docker daemon not running — `supabase start` fails; manual TypeScript types used as fallback. Start Docker to use local Supabase for type generation and migration testing.
- [Phase 2]: Before writing any data access code, verify `SELECT current_setting('request.jwt.claims', true)::json->>'sub'` returns non-null with a Clerk JWT — this is the RLS path for all user data.

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed 01-03-PLAN.md — Deploy to Vercel, push schema to Supabase, configure Clerk third-party auth. Phase 1 complete.
Resume file: None
