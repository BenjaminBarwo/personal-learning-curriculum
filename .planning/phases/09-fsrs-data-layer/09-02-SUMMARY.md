---
phase: 09-fsrs-data-layer
plan: "02"
subsystem: database
tags: [fsrs, spaced-repetition, supabase, typescript, ts-fsrs, server-actions, nextjs]

# Dependency graph
requires:
  - phase: 09-fsrs-data-layer
    plan: "01"
    provides: ts-fsrs installed, fsrs_cards and fsrs_review_logs tables, FsrsCard/FsrsReviewLog TypeScript types
  - phase: 08-clerk-auth-wiring
    provides: auth() pattern and createAdminSupabaseClient() established in server actions
provides:
  - markLessonComplete() extended with idempotent FSRS card seeding per quiz question
  - submitFsrsReview() server action — reads card, applies ts-fsrs scheduling, updates card row, inserts review log
  - getDueCardCount() server action — returns count of cards with due <= now for authenticated user
affects: [10-review-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Non-fatal pattern: FSRS seeding/logging failure does not surface error to user if primary operation succeeded"
    - "as unknown as T double-cast for Supabase numeric enum types (FsrsCardState, FsrsRating)"
    - "Explicit FsrsCard type cast for Supabase select-star result when TS inference returns {}"
    - "f.next(card, now, grade) returns RecordLogItem directly (not RecordLog keyed by rating)"

key-files:
  created:
    - src/lib/actions/fsrs.ts
  modified:
    - src/lib/actions/progress.ts

key-decisions:
  - "FsrsCard explicit cast (data as unknown as FsrsCard) required — Supabase select('*').single() returns {} in strict mode without it"
  - "state cast as unknown as FsrsCardState (not as number) — Supabase Insert type expects FsrsCardState union, not bare number"
  - "learning_steps included in fsrsCard reconstruction — ts-fsrs Card interface requires it for f.next() call"
  - "getDueCardCount uses select('*', { count: 'exact', head: true }) — no row data transferred, only count returned"

patterns-established:
  - "Non-fatal secondary operation pattern: log/seed failures are console.error'd but never surface to user if primary write succeeded"
  - "FSRS card seeding uses ignoreDuplicates: true — re-completing a lesson never resets existing card state"

requirements-completed: [FSRS-02]

# Metrics
duration: 3min
completed: "2026-03-03"
---

# Phase 09 Plan 02: FSRS Server Actions Summary

**markLessonComplete() extended with idempotent FSRS card seeding via upsert, plus submitFsrsReview() and getDueCardCount() server actions using ts-fsrs f.next() scheduling ready for Phase 10 review UI**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-03T02:09:00Z
- **Completed:** 2026-03-03T02:12:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Extended markLessonComplete() in progress.ts to query quiz_questions after progress upsert and seed one fsrs_cards row per active question using createEmptyCard(now) with ignoreDuplicates: true — idempotent and non-fatal
- Created src/lib/actions/fsrs.ts with submitFsrsReview() that fetches card from DB, reconstructs ts-fsrs Card object (including learning_steps), calls f.next(card, now, grade), updates fsrs_cards row, and inserts fsrs_review_logs entry (non-fatal)
- Created getDueCardCount() using select-count-head pattern for efficient due card count without row data transfer

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend markLessonComplete() to seed FSRS cards from quiz questions** - `8788e66` (feat)
2. **Task 2: Create fsrs.ts with submitFsrsReview() and getDueCardCount() server actions** - `a1e9f6a` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src/lib/actions/progress.ts` - Added createEmptyCard import + FsrsCardState type import, card seeding logic after progress upsert, non-fatal error handling
- `src/lib/actions/fsrs.ts` - New file: submitFsrsReview() and getDueCardCount() server actions with auth guards and admin client

## Decisions Made

- **FsrsCard explicit cast required:** Supabase's `.select('*').single()` returns `{}` as the data type in strict TypeScript mode when type inference can't be resolved at compile time. Fixed with `data as unknown as FsrsCard` to give downstream code access to properly-typed card fields.
- **state cast as unknown as FsrsCardState:** The Supabase Insert type for `fsrs_cards.state` expects `FsrsCardState` (0|1|2|3 union) not `number`. A direct `as number` cast fails strict TS. The double cast `as unknown as FsrsCardState` is the idiomatic workaround for ts-fsrs State enum → Supabase numeric union type mismatch.
- **learning_steps included in fsrsCard reconstruction:** The ts-fsrs Card interface requires `learning_steps` for `f.next()` to work correctly in learning/relearning phases. Not including it would cause a TypeScript error since Card has it as a required field.
- **getDueCardCount uses head: true pattern:** Efficient count query transfers no row data — matches Supabase's recommended pattern for count-only queries.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed FsrsCardState type mismatch for state field in upsert**
- **Found during:** Task 1 (Extend markLessonComplete())
- **Issue:** Plan specified `emptyCard.state as number` but Supabase Insert type expects `FsrsCardState | undefined` (0|1|2|3 union), not `number`. TypeScript strict mode rejects the direct cast.
- **Fix:** Changed cast to `emptyCard.state as unknown as FsrsCardState` and added `import type { FsrsCardState }` to progress.ts
- **Files modified:** src/lib/actions/progress.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 8788e66 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed Supabase select-star type inference returning {} in fsrs.ts**
- **Found during:** Task 2 (Create fsrs.ts)
- **Issue:** `.select('*').single()` on fsrs_cards table returned `{}` as the data type in strict TypeScript, causing 9 property-not-found errors on card fields. This is a known Supabase/TypeScript inference limitation when the generic resolution chain is complex.
- **Fix:** Added `const card = data as unknown as FsrsCard` after null check, imported `FsrsCard` type from database.types.ts. Also added `learning_steps` to fsrsCard reconstruction to satisfy ts-fsrs Card interface.
- **Files modified:** src/lib/actions/fsrs.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** a1e9f6a (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — TypeScript type compatibility bugs)
**Impact on plan:** Both fixes required for correct TypeScript compilation. No scope creep — same runtime behavior as specified, only type annotations changed.

## Issues Encountered

None beyond the auto-fixed TypeScript type compatibility issues above.

## User Setup Required

None — no external service configuration required. Server actions are ready to import from Phase 10 components.

Note: The fsrs_cards and fsrs_review_logs tables must be applied to Supabase (migration 00004_fsrs_tables.sql from Plan 01) before these server actions can execute successfully at runtime.

## Next Phase Readiness

- `submitFsrsReview(cardId, rating)` is ready to be called from Phase 10 review UI buttons
- `getDueCardCount()` is ready to be called from Phase 10 dashboard widget
- `markLessonComplete()` now automatically seeds FSRS cards on first lesson completion
- Re-completing a lesson is idempotent — existing card state is preserved (ignoreDuplicates: true)
- Both server actions require the migration from Plan 01 to be applied to Supabase

---
*Phase: 09-fsrs-data-layer*
*Completed: 2026-03-03*

## Self-Check: PASSED

- FOUND: src/lib/actions/progress.ts (with createEmptyCard import and FSRS card seeding)
- FOUND: src/lib/actions/fsrs.ts (with submitFsrsReview and getDueCardCount exports)
- FOUND: .planning/phases/09-fsrs-data-layer/09-02-SUMMARY.md
- FOUND: 8788e66 (feat: extend markLessonComplete() with FSRS card seeding)
- FOUND: a1e9f6a (feat: create fsrs.ts server actions for review and due-count)
- VERIFIED: npx tsc --noEmit passes with zero errors
