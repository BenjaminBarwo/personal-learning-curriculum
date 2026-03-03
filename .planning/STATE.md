---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Content & Retention
status: unknown
last_updated: "2026-03-03T02:12:00Z"
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Every lesson must be so frictionless to start and so engaging to continue that the learner never talks themselves out of opening one.
**Current focus:** v2.0 Content & Retention — Phase 9: FSRS Data Layer (plan 02 complete — phase complete)

## Current Position

Phase: 9 of 12 (FSRS Data Layer) — second phase of v2.0
Plan: 02 complete (FSRS server actions: markLessonComplete seeding, submitFsrsReview, getDueCardCount)
Status: In progress
Last activity: 2026-03-03 — 09-02 completed: progress.ts extended with card seeding, fsrs.ts created with two server actions

Progress: [####░░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 15 (14 v1.0 + 1 v2.0)
- Average duration: unknown
- Total execution time: unknown

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| v1.0 (1-7) | 14 | — | — |
| Phase 8 (08-01) | 1 | ~4 min | ~4 min |
| Phase 9 (09-01) | 1 | ~2 min | ~2 min |
| Phase 9 (09-02) | 1 | ~3 min | ~3 min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

All v1.0 decisions logged in PROJECT.md Key Decisions table with outcomes.

Recent decisions for v2.0:
- [Roadmap]: Phase 11 (Content Generation CLI) is fully independent of Phases 8-10 — can be built in parallel
- [Roadmap]: Phase 8 (Clerk Auth) must complete before Phase 10 (FSRS Review UI) — review page calls `auth()`
- [Roadmap]: Phase 9 (FSRS Data Layer) must complete before Phase 10 (FSRS Review UI) — UI depends on server actions
- [08-01]: Used auth.protect() over manual redirect — Clerk handles the redirect to NEXT_PUBLIC_CLERK_SIGN_IN_URL automatically
- [08-01]: Used NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL over AFTER_SIGN_IN_URL — FORCE variant overrides any redirect_url query param
- [08-01]: Null-guard pattern (if (!userId) return null) preferred over as string cast — maintains TypeScript type narrowing
- [08-01]: Deleted src/constants/user.ts entirely after migration — leaving it would invite future misuse
- [09-01]: learning_steps included in fsrs_cards — ts-fsrs v5.2.3 Card interface includes it (tracks step index within learning/relearning phase)
- [09-01]: FsrsRating typed as 1|2|3|4 (not 0|1|2|3|4) — Manual=0 excluded from review ratings per ts-fsrs Grade type
- [09-01]: fsrs_review_logs Update typed as never — append-only enforcement at TypeScript level matches SQL intent (no UPDATE policy defined)
- [09-02]: FsrsCard explicit cast (data as unknown as FsrsCard) required — Supabase select('*').single() returns {} in strict mode without it
- [09-02]: state cast as unknown as FsrsCardState (not as number) — Supabase Insert type expects FsrsCardState union, not bare number
- [09-02]: FSRS card seeding uses ignoreDuplicates: true — re-completing a lesson never resets existing card state

### Pending Todos

None.

### Blockers/Concerns

- [Phase 8]: Verify Supabase dashboard is configured for Clerk third-party auth BEFORE writing any application code (Pitfall C3 — cannot confirm from research alone)
- [Phase 11]: Pilot one lesson per pillar before bulk generation — confirm MDX component names, quiz question IDs, and content quality

## Session Continuity

Last session: 2026-03-03
Stopped at: 09-02-PLAN.md complete — progress.ts extended with FSRS card seeding, fsrs.ts created with submitFsrsReview and getDueCardCount
Resume file: None
