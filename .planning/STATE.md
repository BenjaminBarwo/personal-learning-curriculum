---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-02-28T01:01:00Z"
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 7
  completed_plans: 7
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** Every lesson must be so frictionless to start and so engaging to continue that the learner never talks themselves out of opening one.
**Current focus:** Phase 3 — Lesson Content Pipeline

## Current Position

Phase: 3 of 6 (Lesson Content Pipeline)
Plan: 2 of 2 in current phase (AWAITING CHECKPOINT — human-verify Task 3)
Status: Plan 03-02 complete (2 tasks) — awaiting human verification checkpoint; MDX rendering integrated, content versioning trigger deployed
Last activity: 2026-02-28 — Plan 03-02 executed: MDXRemote integrated into lesson page, LessonBody/LessonNavigation/MarkCompleteButton created, content versioning trigger deployed

Progress: [█████████░] 87%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 11 min
- Total execution time: 1.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-infrastructure | 3 | 41 min | 13.7 min |
| 02-app-shell-navigation | 2 | 15 min | 7.5 min |
| 03-lesson-content-pipeline | 2 | 6 min | 3 min |

**Recent Trend:**
- Last 5 plans: 3 min, 30 min, 4 min, 2 min
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
- [02-01]: Tailwind v4 uses @custom-variant dark (class strategy) not tailwind.config.js — integrates with next-themes attribute="class"
- [02-01]: Dark-first design: @theme block sets dark palette as default; .light class overrides — no dark: prefix needed on surface classes
- [02-01]: ThemeProvider placed inside body (not wrapping html) to avoid hydration issues with ClerkProvider
- [02-01]: Header is server component; ThemeToggle and MobileMenu are client components — minimizes client JS bundle
- [02-01]: Breadcrumbs receives pre-computed BreadcrumbItem[] from parent pages — presentational only, pages control labels resolved from DB slugs
- [Phase 02]: BreadcrumbContext over per-page Header: single Header in root layout reads from context; BreadcrumbSetter in each page pushes state; no prop-drilling through layouts
- [Phase 02]: Supabase view query type cast pattern: (data ?? []) as ActiveX[] — view queries return {}[] inference in strict TypeScript, explicit cast required
- [Phase 02]: await params in all Next.js 15/16 dynamic routes — params is a Promise; must await before accessing slug properties
- [02-02]: Sequential hierarchy fetching chosen: fetch parent by slug first to get UUID, then fetch children by parent_id — validates URL integrity at each level
- [02-02]: CSS variable --pillar-color on main element for dynamic hex accent threading — avoids Tailwind arbitrary value issues with runtime DB colors
- [02-02]: Mock lessonCount: 0 and progress: 0 on PillarCard/ProgressBar — Phase 5 replaces with real Supabase aggregation; no component changes needed
- [03-01]: react-player v3.4.0 uses src prop (not url) and VideoElementProps API — major breaking change from v2; lazy subpath does not exist in v3
- [03-01]: shiki pinned to ^3.23.0 — v4.0.0 not yet in rehype-pretty-code@0.14.1 peer range (^1||^2||^3)
- [03-01]: DeepDiveProvider and DefinitionProvider exported from component files and barrel index.ts; Plan 03-02 wraps MDX output with both providers
- [03-01]: @types/mdx required as dev dep for MDXComponents type from mdx/types module
- [03-02]: LessonBody is 'use client' wrapping MDXRemote children (not MDXRemote itself) — preserves RSC rendering while DeepDiveProvider + DefinitionProvider provide client context
- [03-02]: Content versioning trigger uses IS DISTINCT FROM + IS NOT NULL guard — prevents NOT NULL violation on first content insertion
- [03-02]: MarkCompleteButton uses local useState for completed state — Phase 5 wires real Supabase mutation without changing component interface
- [03-02]: @custom-variant light added to globals.css enabling light:not-prose-invert Tailwind class for prose light-mode override

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

Last session: 2026-02-28
Stopped at: Checkpoint 03-02 Task 3 human-verify — lesson MDX rendering pipeline awaiting visual verification in browser
Resume file: None
