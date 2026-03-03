---
phase: 10-fsrs-review-ui
plan: "02"
subsystem: ui
tags: [fsrs, review-ui, client-component, state-machine, rsc, next-js]

# Dependency graph
requires:
  - phase: 10-01
    provides: getDueCardsForReview, getNextDueCard, DueCardForReview interface
  - phase: 09-fsrs-data-layer
    provides: submitFsrsReview, fsrs_cards table
  - phase: 08-clerk-auth
    provides: auth() for userId guard on review page
provides:
  - ReviewSession client component — card-flip state machine with rating buttons and interval hints
  - /review RSC page — fetches due cards, renders ReviewSession or "All caught up" state
affects:
  - Users can now visit /review and work through their FSRS review queue

# Tech tracking
tech-stack:
  added: []
  patterns:
    - f.repeat() called client-side to compute all 4 FSRS outcomes simultaneously for interval hints
    - useTransition for isPending to disable buttons during async server action (prevents double-tap)
    - router.refresh() after last card to trigger RSC re-render showing "All caught up"
    - force-dynamic on RSC page prevents Next.js from statically generating per-user data
    - Interval formatting: scheduled_days=0 -> minutes from due date; scheduled_days>0 -> days

key-files:
  created:
    - src/components/review/ReviewSession.tsx
    - src/app/review/page.tsx
  modified: []

key-decisions:
  - "f.repeat() used (not f.next() in a loop) — returns all 4 outcomes in one call, matches ts-fsrs API; server action uses f.next() for single-grade persistence"
  - "computeIntervalHints() is synchronous, called during render — no useEffect or async needed since f.repeat() is pure math"
  - "router.refresh() after last card rated — RSC re-render sees empty due queue and shows all-caught-up inline (no client state to clear)"
  - "MC options shown read-only before reveal, correct one highlighted emerald after reveal — no interaction needed, just visual confirmation"
  - "formatTimeUntil() kept server-side only — no real-time countdown needed per research; static snapshot at page load is sufficient"

requirements-completed: [FSRS-04, FSRS-05, FSRS-06, FSRS-07]

# Metrics
duration: ~2min
completed: 2026-03-03
---

# Phase 10 Plan 02: FSRS Review UI Session Summary

**Interactive /review page with card-flip state machine, FSRS interval hints on rating buttons, and "All caught up" state using router.refresh() to transition after the last card**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-03T02:42:14Z
- **Completed:** 2026-03-03T02:44:00Z
- **Tasks:** 2 of 2
- **Files created:** 2

## Accomplishments

- Created `ReviewSession` ('use client') with `currentIndex`/`isAnswerRevealed` state, `useTransition` for isPending, and a `computeIntervalHints()` function that calls `f.repeat()` once to get all 4 FSRS outcomes simultaneously
- Rating buttons (Again/Hard/Good/Easy) show interval hints below their labels — minutes for learning-phase cards (scheduled_days=0), days for review-phase cards
- `handleRate()` calls `submitFsrsReview()` wrapped in `startTransition`, then either advances to next card or calls `router.refresh()` on last card
- Created `/review` RSC page with `force-dynamic`, auth guard, `getDueCardsForReview()` fetch, and conditional rendering of `ReviewSession` or inline "All caught up" state
- "All caught up" state fetches `getNextDueCard()` and shows time until next review, or prompts to complete lessons if no cards exist yet

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ReviewSession client component with card-flip state machine and rating buttons** - `3075b24` (feat)
2. **Task 2: Create /review RSC page with due card fetching and "All caught up" state** - `7daba10` (feat)

## Files Created/Modified

- `src/components/review/ReviewSession.tsx` - 'use client' component with full card-flip state machine, f.repeat() interval hints, and rating buttons
- `src/app/review/page.tsx` - RSC with force-dynamic, auth guard, due card fetch, ReviewSession or all-caught-up conditional

## Decisions Made

- `f.repeat()` used for interval hints (not `f.next()` in a loop) — returns all 4 outcomes in one call; server action uses `f.next()` for single-grade persistence
- `computeIntervalHints()` is synchronous and called during render — f.repeat() is pure math with no async needed
- `router.refresh()` after last card rated — RSC re-render sees empty due queue and shows "All caught up" without any client state to track
- MC options shown read-only (no interactive selection) with correct answer highlighted emerald on reveal — no confusion with actual quiz flow
- `formatTimeUntil()` is server-side only — static snapshot at page load is sufficient; no real-time countdown needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None.

## Self-Check: PASSED

- FOUND: src/components/review/ReviewSession.tsx
- FOUND: src/app/review/page.tsx
- FOUND: commit 3075b24 (feat(10-02): create ReviewSession client component)
- FOUND: commit 7daba10 (feat(10-02): create /review RSC page)
