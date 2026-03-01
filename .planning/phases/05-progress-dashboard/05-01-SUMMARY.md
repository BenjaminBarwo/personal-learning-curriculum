---
phase: 05-progress-dashboard
plan: 01
subsystem: database
tags: [supabase, progress, typescript, nextjs, clerk]

# Dependency graph
requires:
  - phase: 04-quiz-engine
    provides: Lesson page and MarkCompleteButton component stubs wired for Phase 5
  - phase: 01-infrastructure
    provides: Supabase client factories (server/client), progress table schema, HARDCODED_USER_ID
provides:
  - Server-side progress computation helpers (getLessonProgressForScope, getContinueLesson, isSemesterLocked, markLessonInProgress, getLessonStatuses)
  - Wired MarkCompleteButton with real Supabase upsert + router.refresh() + error feedback
  - Lesson page marks in_progress on load; initialises button with DB completion status
  - Semester unlock migration (manually_unlocked column) deployed
affects:
  - 05-02-progress-dashboard (consumes all helpers for hierarchy progress display)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fire-and-forget markLessonInProgress on lesson page render (preserves completed status)
    - Caller-provided Supabase client pattern — pages create client and pass to progress helpers
    - head:true count optimization for getLessonProgressForScope (no row data transferred)
    - router.refresh() after mutation to trigger RSC re-render of parent progress bars

key-files:
  created:
    - src/lib/progress.ts
    - supabase/migrations/00003_semester_unlock.sql
  modified:
    - src/components/lesson/MarkCompleteButton.tsx
    - src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/courses/[courseSlug]/lessons/[lessonSlug]/page.tsx
    - src/types/database.types.ts

key-decisions:
  - "Caller-provided Supabase client: progress helpers accept supabase param instead of creating own — each page (server component) creates its client and passes it in, keeping auth context consistent"
  - "head:true count optimization in getLessonProgressForScope: only count returned, no row data transferred — efficient for large lesson sets"
  - "Fire-and-forget markLessonInProgress: try/catch logs errors but does not throw — lesson page render must not be blocked by a progress upsert failure"
  - "manually_unlocked as table-level boolean: simpler than a per-user override table for this single-user platform; upgrade path is clear when multi-user lands"

patterns-established:
  - "Progress helper pattern: all functions accept (supabase, ...args) — server pages own the client lifetime"
  - "Optimistic UI + server refresh: MarkCompleteButton sets local state immediately, then calls router.refresh() to sync server state"

requirements-completed: [PROG-01, PROG-03]

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 5 Plan 01: Progress Data Layer Summary

**Server-side progress helpers + wired MarkCompleteButton (real Supabase upsert with error feedback) + fire-and-forget in_progress tracking on lesson page load + manually_unlocked semester schema migration**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T05:10:13Z
- **Completed:** 2026-03-01T05:12:17Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created `src/lib/progress.ts` with 5 exported server-side helpers: getLessonProgressForScope (head:true count optimization), getContinueLesson (resolves full URL path via DB chain), markLessonInProgress (fire-and-forget, preserves completed), isSemesterLocked (pure function with manual override), getLessonStatuses (batch Map return)
- Wired MarkCompleteButton from placeholder to real Supabase upsert with error state display and router.refresh() for RSC cache invalidation
- Lesson page now marks in_progress on every load and passes completion status to MarkCompleteButton so button initialises in correct state
- Schema migration adds manually_unlocked BOOLEAN to semesters; TypeScript types updated in Row/Insert/Update and active_semesters view

## Task Commits

Each task was committed atomically:

1. **Task 1: Create progress helpers + semester unlock migration + type update** - `42d019c` (feat)
2. **Task 2: Wire MarkCompleteButton + mark in-progress on lesson page load** - `1c80a77` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/progress.ts` - 5 server-side progress computation helpers, caller-provided Supabase client pattern
- `supabase/migrations/00003_semester_unlock.sql` - ALTER TABLE semesters ADD COLUMN manually_unlocked BOOLEAN NOT NULL DEFAULT FALSE
- `src/types/database.types.ts` - Added manually_unlocked to semesters Row/Insert/Update and active_semesters View Row
- `src/components/lesson/MarkCompleteButton.tsx` - Real Supabase upsert, initialCompleted prop, error display, router.refresh()
- `src/app/pillars/.../lessons/[lessonSlug]/page.tsx` - markLessonInProgress fire-and-forget, progress status query, initialCompleted passed to button

## Decisions Made
- Caller-provided Supabase client for all progress helpers — avoids each helper creating its own client, ensures auth context from the calling page flows through consistently
- head:true optimization in getLessonProgressForScope — transfers only count, not row data, important for large lesson sets
- Fire-and-forget pattern for markLessonInProgress with try/catch logging — progress upsert failure must not block lesson content rendering
- manually_unlocked as simple boolean on semesters table — single-user platform; cleaner than a separate override table

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
The `00003_semester_unlock.sql` migration must be applied to the Supabase project:
```bash
supabase db push
# or apply manually in Supabase dashboard SQL editor
```

## Next Phase Readiness
- All 5 progress helpers are exported and ready for consumption by Plan 05-02
- MarkCompleteButton writes completed status with router.refresh() — hierarchy progress bars will update correctly once 05-02 wires them
- Semester lock logic (isSemesterLocked) is ready for the semester listing page in 05-02
- Semester unlock migration must be applied to Supabase before 05-02 queries manually_unlocked field

## Self-Check: PASSED

- src/lib/progress.ts — FOUND
- supabase/migrations/00003_semester_unlock.sql — FOUND
- .planning/phases/05-progress-dashboard/05-01-SUMMARY.md — FOUND
- Commit 42d019c (Task 1) — FOUND
- Commit 1c80a77 (Task 2) — FOUND

---
*Phase: 05-progress-dashboard*
*Completed: 2026-02-28*
