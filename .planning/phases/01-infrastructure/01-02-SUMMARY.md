---
phase: 01-infrastructure
plan: 02
subsystem: database
tags: [supabase, postgres, sql, rls, migrations, typescript, clerk, jwt]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Next.js scaffold with Supabase client factories importing Database type from @/types/database.types"
provides:
  - Complete Postgres schema with all 11 tables deployed as migration 00001_initial_schema.sql
  - RLS enabled on every table with Clerk JWT sub claim policies (not auth.uid())
  - Soft-delete pattern (deleted_at + 6 active-record views) for all content tables
  - updated_at auto-trigger on 7 tables
  - Performance indexes on all user_id and foreign key columns
  - TypeScript Database interface (manual, replaces placeholder) with Row/Insert/Update for all 11 tables and 6 views
  - Convenience type aliases (Tables<T>, Views<T>, Pillar, Lesson, Progress, etc.)
affects:
  - 01-03 (deployment needs schema to push to remote Supabase)
  - 02 (content management reads/writes all 11 tables using Database types)
  - 03 (FSRS spaced repetition uses quiz_attempts history accumulated from Phase 1)
  - 04 (quiz system reads quiz_questions, writes quiz_attempts — both present in Phase 1)
  - All subsequent phases (schema is foundation for all data access)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SQL migration file pattern: single 00001_initial_schema.sql with all tables, indexes, RLS, triggers, views in one atomic migration"
    - "RLS with Clerk JWT: current_setting('request.jwt.claims', true)::json->>'sub' (NOT auth.uid() which returns NULL with Clerk)"
    - "Soft-delete pattern: deleted_at TIMESTAMPTZ NULL column + CREATE VIEW active_{table} WHERE deleted_at IS NULL"
    - "Append-only tables: quiz_attempts and lesson_vocabulary have no updated_at or deleted_at — immutable audit records"
    - "user_id as TEXT: Clerk user IDs are strings (user_2abc...), never UUID type"
    - "Content table RLS: SELECT for authenticated users; no INSERT/UPDATE/DELETE policies — admin/service-role bypasses RLS"
    - "user_id RLS wrapped in SELECT subquery for Postgres query plan caching"

key-files:
  created:
    - supabase/migrations/00001_initial_schema.sql
    - src/types/database.types.ts (replaced placeholder with full type definition)
  modified: []

key-decisions:
  - "Used manual TypeScript types (Option C) — Docker daemon not running, no remote project configured; types will be replaced with generated types once Supabase project is linked"
  - "quiz_attempts included in Phase 1 schema (not deferred to Phase 4) — FSRS needs accumulated attempt history from day one; retrofitting loses early data"
  - "lesson_versions included in Phase 1 schema (not deferred to Phase 3) — AI content generation in Phase 2 needs rollback capability from the start"
  - "junction tables (lesson_vocabulary, lesson_connections) have RLS enabled but no soft-delete — they are structural metadata, not content"
  - "Indexed all user_id AND foreign key columns — RLS performance-critical (100x+ impact on large tables)"

patterns-established:
  - "RLS pattern: content tables use SELECT-only policy with JWT sub check; user tables use separate SELECT/INSERT/UPDATE policies"
  - "Soft-delete consistency: all 6 content tables with deleted_at get corresponding active_{table} view"
  - "TypeScript type structure: Database > public > Tables > {table} > Row/Insert/Update + Views > {view} > Row"

requirements-completed: [INFR-01, INFR-02]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 1 Plan 02: Database Schema Summary

**11-table Postgres schema with Clerk JWT RLS, soft-delete views, updated_at triggers, and TypeScript types covering all tables and active-record views**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T20:09:55Z
- **Completed:** 2026-02-27T20:13:21Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Migration file `supabase/migrations/00001_initial_schema.sql` with all 11 tables, 14 RLS policies, 7 updated_at triggers, 13 performance indexes, and 6 active-record views
- RLS uses `current_setting('request.jwt.claims', true)::json->>'sub'` everywhere — never `auth.uid()` which returns NULL with Clerk JWTs
- `quiz_attempts` and `lesson_versions` both present in Phase 1 (not deferred) — prevents data loss and costly retrofitting
- TypeScript `Database` interface with Row/Insert/Update types for all 11 tables + 6 views; compiles cleanly with `npx tsc --noEmit`
- Supabase client factories (`client.ts`, `server.ts`) already import `Database` generically — no changes needed

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the complete initial schema migration** - `3298dbd` (feat)
2. **Task 2: Generate TypeScript types from schema** - `82f4e7d` (feat)

## Files Created/Modified

- `supabase/migrations/00001_initial_schema.sql` - Complete database schema: all 11 tables, indexes, RLS policies, triggers, views
- `src/types/database.types.ts` - Full TypeScript Database interface (replaced placeholder Record<string, never>)

## Decisions Made

- **Manual TypeScript types used (Option C):** Docker daemon was not running and no remote Supabase project is configured yet. The manual types accurately mirror the schema. These should be replaced with `pnpm supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID"` once a remote project is linked.
- **quiz_attempts not deferred:** FSRS spaced repetition in Phase 3 requires early attempt history. Creating the table in Phase 1 ensures no early data is lost.
- **lesson_versions not deferred:** AI content generation in Phase 2 can overwrite hand-written content without rollback; having lesson_versions from the start prevents irreversible overwrites.
- **No FOR ALL policy:** Used separate SELECT/INSERT/UPDATE/DELETE policies as required — the plan anti-pattern is avoided.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written. Docker unavailability was anticipated by the plan (Option C fallback), not a deviation.

---

**Total deviations:** 0
**Impact on plan:** None — all options were pre-planned. Option C (manual types) followed as documented.

## Issues Encountered

- **Docker daemon not running:** `supabase start` for local type generation failed. Used Option C (manual types) as specified in the plan. This is a known configuration state — Docker is installed but the daemon is not started. Types are accurate and will be replaced with generated types once Supabase project is configured.
- **auth.uid() false positive in verification:** The plan's grep command `grep -q "auth.uid()" migration.sql` matches comments containing the anti-pattern warning. Verified no actual SQL code uses `auth.uid()` — only comment warnings referencing it.

## User Setup Required

Once a Supabase project is created (required before any data can be stored), run:

```bash
# Replace manual types with auto-generated types
pnpm supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > src/types/database.types.ts

# Push schema to remote
pnpm supabase db push
```

For local development with Docker running:
```bash
pnpm supabase start
pnpm supabase db reset   # Applies 00001_initial_schema.sql
pnpm supabase gen types typescript --local > src/types/database.types.ts
```

## Next Phase Readiness

- Schema migration ready to push to remote or local Supabase (`supabase db push` / `supabase db reset`)
- TypeScript types compile cleanly — all Supabase queries will have full type safety
- All 11 tables present including Phase 3 (lesson_versions) and Phase 4 (quiz_attempts) tables
- RLS policies use Clerk JWT sub claim — ready for actual Clerk users once JWT template is configured
- Plan 03 (deployment) can proceed: needs `.env.local` filled with real Supabase project credentials

---
*Phase: 01-infrastructure*
*Completed: 2026-02-27*
