---
phase: 10-fsrs-review-ui
plan: "01"
subsystem: database
tags: [fsrs, supabase, postgrest, server-actions, dashboard, ui]

# Dependency graph
requires:
  - phase: 09-fsrs-data-layer
    provides: submitFsrsReview, getDueCardCount, fsrs_cards table, FsrsCard types
  - phase: 08-clerk-auth
    provides: auth() from @clerk/nextjs/server, userId for all server actions
provides:
  - getDueCardsForReview() server action — fsrs_cards joined with quiz_questions via PostgREST FK expansion
  - getNextDueCard() server action — returns soonest future due card for all-caught-up state
  - DueCardForReview interface — exported type for Plan 02 ReviewSession component
  - Dashboard due-today widget — conditional "X cards due today" link to /review
affects:
  - 10-02 (ReviewSession component consumes DueCardForReview type and getDueCardsForReview)
  - 10-03 (review page all-caught-up state uses getNextDueCard)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - PostgREST FK expansion using table name (quiz_questions) not FK column name in .select()
    - Filter orphaned cards (soft-deleted questions) before mapping — row.quiz_questions !== null check
    - satisfies DueCardForReview in map() for compile-time type safety without type assertion on return
    - Dashboard widget completely absent (not hidden) when count is 0 — {count > 0 && (...)} pattern

key-files:
  created: []
  modified:
    - src/lib/actions/fsrs.ts
    - src/app/dashboard/page.tsx

key-decisions:
  - "PostgREST FK expansion uses quiz_questions (table name) not fsrs_cards.question_id (FK column) — matches Supabase JS client convention"
  - "getDueCardsForReview filters rows where quiz_questions is null — orphaned cards from soft-deleted questions would cause runtime crashes in review UI"
  - "getNextDueCard uses .maybeSingle() not .single() — returns null cleanly when no future cards exist, avoids PGRST116 error"
  - "Dashboard widget uses conditional rendering ({dueCount > 0 && ...}) not CSS visibility — FSRS-03 requires widget to be absent, not hidden"
  - "DueCardForReview includes full FSRS card state fields (stability, difficulty, etc.) — Plan 02 ReviewSession needs them for f.repeat() client-side computation"

patterns-established:
  - "PostgREST FK join: .select('*, related_table(col1, col2)') with table name, not FK column name"
  - "Orphan filter: filter joined rows before mapping, check row.relatedTable !== null"
  - "satisfies T in map callbacks for type-safe shape without return type assertion"

requirements-completed: [FSRS-03]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 10 Plan 01: FSRS Review UI Data Layer and Dashboard Widget Summary

**getDueCardsForReview() and getNextDueCard() server actions with PostgREST FK expansion, plus conditional "X cards due today" dashboard widget linking to /review**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-02T02:58:16Z
- **Completed:** 2026-03-02T02:59:30Z
- **Tasks:** 2 of 2
- **Files modified:** 2

## Accomplishments

- Added `getDueCardsForReview()` that joins `fsrs_cards` with `quiz_questions` via PostgREST FK expansion, filters orphaned cards (soft-deleted questions), and maps to `DueCardForReview[]` sorted oldest-due first
- Added `getNextDueCard()` that returns the soonest future due card or null — used by Plan 02's all-caught-up state
- Exported `DueCardForReview` interface with all FSRS card state fields needed for client-side `f.repeat()` computation in Plan 02's ReviewSession
- Added conditional dashboard widget that shows "X cards due today" linking to /review only when `dueCount > 0` (completely absent at zero per FSRS-03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getDueCardsForReview() and getNextDueCard() server actions with DueCardForReview type** - `4dd7332` (feat)
2. **Task 2: Add due-today widget to dashboard page** - `9e512cb` (feat)

## Files Created/Modified

- `src/lib/actions/fsrs.ts` - Added `DueCardForReview` interface, `getDueCardsForReview()`, and `getNextDueCard()` after existing exports; added `QuizOption` to import
- `src/app/dashboard/page.tsx` - Added `getDueCardCount` import, `dueCount` fetch, and conditional FSRS widget JSX between continue card and pillar grid

## Decisions Made

- PostgREST FK expansion uses `quiz_questions` (table name) not `question_id` (FK column name) — this is the Supabase JS client convention; using the column name causes the join to silently return nothing
- `getDueCardsForReview` filters rows where `quiz_questions` is null before mapping — orphaned cards from soft-deleted questions would cause runtime crashes in the review UI without this guard
- `getNextDueCard` uses `.maybeSingle()` not `.single()` — returns null cleanly when no future cards exist, avoiding PGRST116 ("expected one row, got zero") error
- Dashboard widget uses `{dueCount > 0 && (...)}` conditional rendering — FSRS-03 requires the widget to be completely absent (not hidden with CSS visibility) when zero cards are due
- `DueCardForReview` includes all FSRS card state fields (stability, difficulty, elapsed_days, etc.) so Plan 02's ReviewSession can call `f.repeat()` client-side without a separate card fetch

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `DueCardForReview` type and `getDueCardsForReview()` are ready for Plan 02's ReviewSession component
- `getNextDueCard()` is ready for Plan 02's all-caught-up state
- Dashboard widget live for authenticated users with due cards
- TypeScript compiles with zero errors across all modified files

---
*Phase: 10-fsrs-review-ui*
*Completed: 2026-03-02*
