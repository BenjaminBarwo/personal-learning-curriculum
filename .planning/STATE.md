---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-03-01T05:12:00Z"
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 11
  completed_plans: 10
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** Every lesson must be so frictionless to start and so engaging to continue that the learner never talks themselves out of opening one.
**Current focus:** Phase 5 — Progress + Dashboard

## Current Position

Phase: 5 of 6 (Progress + Dashboard) — IN PROGRESS
Plan: 1 of 2 in current phase — COMPLETE
Status: Plan 05-01 fully complete (2/2 tasks); progress data layer built — helpers, wired button, migration, types
Last activity: 2026-03-01 — Plan 05-01: Progress data layer complete — markLessonInProgress, MarkCompleteButton wired, manually_unlocked migration

Progress: [█████████░] 83% (Phases 1-4 complete; Phase 5 plan 1 of 2 complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: ~9 min (excluding checkpoint verification time)
- Total execution time: ~1.3 hours (code execution)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-infrastructure | 3 | 41 min | 13.7 min |
| 02-app-shell-navigation | 2 | 15 min | 7.5 min |
| 03-lesson-content-pipeline | 2 | 6 min | 3 min |
| 04-quiz-engine | 2 | 3 min + checkpoint | ~3 min code |
| 05-progress-dashboard | 1/2 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: checkpoint, 3 min, 30 min, 4 min, 2 min, 2 min
- Trend: Consistent (well-specified plans with clear interfaces execute in ~2-3 min)

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
- [03-02]: Hook.tsx children wrapper changed from p to div — MDX children may include block-level elements; p cannot contain block-level children (hydration error); div is always correct for component wrappers receiving unknown children
- [Phase 04-01]: Double cast (as unknown as QuizOption[]) required for Json JSONB field — TypeScript strict mode prevents direct cast; unknown intermediary satisfies compiler
- [Phase 04-01]: createClerkSupabaseClient called at Quiz component top level — it uses useSession() hook internally, cannot be called inside event handlers
- [Phase 04-01]: quizQuestions prop defaults to [] on LessonBody — backward compatible, existing lesson pages work unchanged
- [04-02]: RLS blocks client-side quiz_attempts inserts because app has no Clerk sign-in UI yet — auth feature gap (Phase 5+), not a quiz engine bug; persistence confirmed working via service role
- [04-02]: Quiz engine human verification approved — all 5 question types confirmed correct; session persistence, dark/light mode, and error handling all verified
- [05-01]: Caller-provided Supabase client for all progress helpers — each page creates its client and passes it in; avoids repeated client instantiation and ensures auth context flows through
- [05-01]: head:true count optimization in getLessonProgressForScope — only count transferred, no row data; important for large lesson sets
- [05-01]: Fire-and-forget markLessonInProgress with try/catch logging — progress upsert failure must not block lesson content rendering
- [05-01]: manually_unlocked as table-level boolean on semesters — simpler than per-user override table for single-user platform

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

Last session: 2026-03-01
Stopped at: Completed 05-01-PLAN.md — Progress data layer complete; ready for 05-02 hierarchy progress display
Resume file: None
