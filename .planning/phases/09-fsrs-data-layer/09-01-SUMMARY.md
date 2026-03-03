---
phase: 09-fsrs-data-layer
plan: "01"
subsystem: database
tags: [fsrs, spaced-repetition, supabase, postgresql, typescript, ts-fsrs, rls, migrations]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: initial_schema with quiz_questions and lessons tables (referenced by FSRS foreign keys)
  - phase: 08-clerk-auth-wiring
    provides: Clerk JWT auth pattern using current_setting JWT sub claim for RLS
provides:
  - ts-fsrs v5.2.3 production dependency installed
  - fsrs_cards table with full FSRS card state fields including learning_steps
  - fsrs_review_logs append-only audit log table
  - FsrsCardState and FsrsRating TypeScript union types
  - FsrsCard and FsrsReviewLog convenience type aliases
  - 5 RLS policies using Clerk-compatible JWT sub claim pattern
affects: [10-review-ui, 09-02-server-actions]

# Tech tracking
tech-stack:
  added: [ts-fsrs@5.2.3]
  patterns:
    - "INTEGER columns for FSRS state/rating enums (not Postgres ENUM — matches ts-fsrs numeric enums)"
    - "Append-only table pattern (no UPDATE trigger, Update: never in TypeScript)"
    - "Denormalized lesson_id on fsrs_cards for batch query performance"
    - "FsrsCardState and FsrsRating as TypeScript numeric union types for type-safe FSRS integration"

key-files:
  created:
    - supabase/migrations/00004_fsrs_tables.sql
  modified:
    - package.json
    - pnpm-lock.yaml
    - src/types/database.types.ts

key-decisions:
  - "learning_steps field included in fsrs_cards — ts-fsrs v5.2.3 Card interface includes it (tracks step index within learning/relearning phase)"
  - "FsrsRating typed as 1|2|3|4 (not 0|1|2|3|4) — Manual=0 is excluded from review ratings per ts-fsrs Grade type"
  - "fsrs_review_logs Update typed as never — append-only enforcement at TypeScript level matches SQL intent"
  - "DOUBLE PRECISION used for stability and difficulty — matches ts-fsrs number fields exactly"

patterns-established:
  - "Append-only table pattern: no updated_at trigger, Update type is never in TypeScript"
  - "Denormalized FK pattern: lesson_id on both fsrs_cards and fsrs_review_logs for query performance without joins"

requirements-completed: [FSRS-01]

# Metrics
duration: 2min
completed: "2026-03-03"
---

# Phase 09 Plan 01: FSRS Data Layer Foundation Summary

**ts-fsrs v5.2.3 installed with fsrs_cards and fsrs_review_logs SQL tables, 5 RLS policies using Clerk JWT sub claim, and TypeScript types including FsrsCardState, FsrsRating, FsrsCard, and FsrsReviewLog aliases**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-03T02:04:13Z
- **Completed:** 2026-03-03T02:06:21Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Installed ts-fsrs@5.2.3 as production dependency, confirmed Card interface shape including learning_steps field added in v5
- Created full FSRS migration (00004_fsrs_tables.sql) with fsrs_cards table, fsrs_review_logs append-only table, 5 indexes, updated_at trigger, and 5 RLS policies
- Extended database.types.ts with FsrsCardState/FsrsRating numeric union types and complete Row/Insert/Update definitions for both tables

## Task Commits

Each task was committed atomically:

1. **Task 1: Install ts-fsrs and inspect Card type** - `f007292` (chore)
2. **Task 2: Create FSRS migration and add TypeScript types** - `6bbd8ed` (feat)

**Plan metadata:** (to follow — docs commit)

## Files Created/Modified

- `supabase/migrations/00004_fsrs_tables.sql` - FSRS tables with indexes, trigger, and RLS policies (Clerk-compatible)
- `src/types/database.types.ts` - Added FsrsCardState, FsrsRating types and fsrs_cards/fsrs_review_logs definitions
- `package.json` - Added ts-fsrs@^5.2.3 to production dependencies
- `pnpm-lock.yaml` - Updated lock file with ts-fsrs resolution

## Decisions Made

- **learning_steps included**: ts-fsrs v5.2.3 Card interface includes `learning_steps: number` — added as `INTEGER NOT NULL DEFAULT 0` to fsrs_cards to match the Card interface exactly. Without it, mapping ts-fsrs Card objects to database rows would require manual field exclusion.
- **FsrsRating typed as 1|2|3|4**: The ts-fsrs `Grade` type excludes `Rating.Manual = 0` from review operations. User reviews use Again(1), Hard(2), Good(3), Easy(4) only. This keeps the type safe at the TypeScript level.
- **fsrs_review_logs Update: never**: Enforces append-only constraint at the TypeScript layer, matching the SQL intent (no UPDATE policy defined). Future code cannot accidentally issue updates.
- **DOUBLE PRECISION for stability/difficulty**: Matches ts-fsrs `number` type exactly. PostgreSQL `REAL` (single precision) would cause floating-point rounding when reading back FSRS algorithm outputs.

## Deviations from Plan

**1. [Rule 1 - Adaptation] Included learning_steps in fsrs_cards schema**

The plan explicitly anticipated this deviation with a conditional instruction: "If Task 1 found a `learning_steps` field in the ts-fsrs Card type, add this column." ts-fsrs v5.2.3 does include `learning_steps` in the Card interface. This was handled as specified — the field was added to both the SQL migration and TypeScript types.

- **Found during:** Task 1 (Card type inspection)
- **Issue:** ts-fsrs v5 added learning_steps to Card interface
- **Fix:** Added `learning_steps INTEGER NOT NULL DEFAULT 0` column to fsrs_cards and corresponding Row/Insert/Update fields to TypeScript types
- **Files modified:** supabase/migrations/00004_fsrs_tables.sql, src/types/database.types.ts
- **Committed in:** 6bbd8ed (Task 2 commit)

---

**Total deviations:** 1 (anticipated conditional adaptation, not a true deviation)
**Impact on plan:** Schema now matches ts-fsrs Card interface exactly, no manual field exclusion needed when mapping objects to database rows.

## Issues Encountered

None — plan executed cleanly. The learning_steps conditional was pre-planned and handled exactly as documented.

## User Setup Required

The migration file is ready but must be applied to Supabase. This requires running:
```bash
pnpm db:push
# or
supabase db push
```

Or applying the migration manually via the Supabase dashboard SQL editor. This is expected — plan 01 creates the migration file, not applies it.

## Next Phase Readiness

- ts-fsrs is installed and importable
- Migration file 00004_fsrs_tables.sql is ready to apply to the Supabase database
- TypeScript types are complete and compile without errors
- Plan 02 (server actions) can now use FsrsCard, FsrsReviewLog, FsrsCardState, and FsrsRating types directly

---
*Phase: 09-fsrs-data-layer*
*Completed: 2026-03-03*
