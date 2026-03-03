---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Content & Retention
status: unknown
last_updated: "2026-03-03T07:38:07Z"
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 8
  completed_plans: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Every lesson must be so frictionless to start and so engaging to continue that the learner never talks themselves out of opening one.
**Current focus:** v2.0 Content & Retention — Phase 11: Content Generation CLI COMPLETE (plan 03 complete — orchestrator loop, scope query, DB seeding, USAGE.md)

## Current Position

Phase: 11 of 12 (Content Generation CLI) — fourth phase of v2.0 — COMPLETE
Plan: 03 complete (orchestrator loop, queryLessonsForScope, seedLesson, USAGE.md)
Status: Phase 11 complete — ready for Phase 12
Last activity: 2026-03-03 — 11-03 completed: full CLI end-to-end with scope query, idempotency, pipeline wiring, quiz UUID seeding, dry-run mode, generation logs

Progress: [##########] 100%

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
| Phase 10 (10-01) | 1 | ~2 min | ~2 min |
| Phase 10 (10-02) | 2 | ~2 min | ~2 min |
| Phase 11 (11-01) | 1 | ~2 min | ~2 min |
| Phase 11 (11-02) | 2 | ~6 min | ~6 min |
| Phase 11 (11-03) | 2 | ~5 min | ~5 min |

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
- [10-01]: PostgREST FK expansion uses quiz_questions (table name) not question_id (FK column) — Supabase JS client convention; using column name silently returns nothing
- [10-01]: getDueCardsForReview filters rows where quiz_questions is null — orphaned cards from soft-deleted questions would crash review UI
- [10-01]: getNextDueCard uses .maybeSingle() not .single() — avoids PGRST116 error when no future cards exist
- [10-01]: Dashboard widget uses {dueCount > 0 && (...)} conditional — FSRS-03 requires widget absent (not hidden) when zero cards due
- [Phase 10]: f.repeat() used for client-side interval hint computation — returns all 4 outcomes in one call; server action uses f.next() for single-grade persistence
- [Phase 10]: router.refresh() after last card rated — RSC re-render sees empty due queue and shows all-caught-up without tracking client state
- [Phase 10]: force-dynamic on /review RSC page — due cards are per-user per-request; static generation would bake in stale counts
- [11-02]: Dynamic import for @mdx-js/mdx in validate-mdx.ts — static import fails with ERR_PACKAGE_PATH_NOT_EXPORTED due to estree-walker missing exports field
- [11-02]: Quiz PLACEHOLDER_N pattern — generation embeds string placeholders; Plan 03 orchestrator replaces with real UUIDs after Supabase insert
- [11-02]: Streaming only for generateLesson — review responses are shorter; streaming justified only for 8192-token generation to avoid idle timeout
- [11-03]: Lazy Supabase Proxy — defers createClient() until first use; prevents crash when --help runs before dotenv loads env vars
- [11-03]: Pillar scope by display_order integer, not slug — matches CLI flag design and pillar 1/2/3 naming convention
- [11-03]: Supabase .update().select('id') for 0-row detection — update on missing row silently succeeds without .select(); added to detect missing lesson rows
- [11-03]: Single validation retry before failing lesson — gives Claude one more chance; prevents batch crash from single malformed generation

### Pending Todos

None.

### Blockers/Concerns

- [Phase 8]: Verify Supabase dashboard is configured for Clerk third-party auth BEFORE writing any application code (Pitfall C3 — cannot confirm from research alone)
- [Phase 11]: Pilot one lesson per pillar before bulk generation — confirm MDX component names, quiz question IDs, and content quality

## Session Continuity

Last session: 2026-03-03
Stopped at: 11-03-PLAN.md complete — Phase 11 fully complete: orchestrator loop, scope query, DB seeding, USAGE.md; GEN-03/GEN-05/GEN-06 requirements satisfied
Resume file: None
