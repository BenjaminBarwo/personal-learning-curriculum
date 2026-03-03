---
phase: 11-content-generation-cli
plan: "03"
subsystem: cli
tags: [supabase, orchestrator, idempotency, query, seed, uuid, dry-run, commander, tsx]

# Dependency graph
requires:
  - scripts/lib/anthropic.ts (Anthropic client singleton)
  - scripts/lib/retry.ts (withBackoff for 529 protection)
  - scripts/lib/types.ts (LessonTarget, GenerateOptions, PipelineResult)
  - scripts/lib/supabase.ts (admin Supabase client)
  - scripts/lib/progress.ts (printLessonHeader, printStage, printSummary)
  - scripts/pipeline/research.ts (researchTopic)
  - scripts/pipeline/generate-lesson.ts (generateLesson)
  - scripts/pipeline/review-lesson.ts (reviewLesson)
  - scripts/pipeline/validate-mdx.ts (validateMdx)
provides:
  - queryLessonsForScope() — scope-based lesson query for all 4 scope flags (scripts/pipeline/query-lessons.ts)
  - seedLesson() — Supabase upsert for lessons.mdx_content + quiz_questions insert with UUID replacement (scripts/pipeline/seed-lesson.ts)
  - Full orchestrator loop in generate.ts wiring all 5 pipeline stages
  - Dry-run mode for both single (stdout) and batch (scripts/output/) scopes
  - Generation log written to scripts/logs/ after each run
  - USAGE.md developer documentation
affects:
  - Fully functional CLI — running `pnpm generate --pillar N` now generates and seeds lessons end-to-end

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy Supabase client init via Proxy — avoids crash on --help when env vars absent"
    - "Scope resolver chain: queryByPillar -> queryBySemester -> queryCourse -> queryByLesson"
    - "assembleLessonTargets() sorts by course display_order then lesson display_order for correct ordering"
    - "PLACEHOLDER_N replacement loop: insertedRows[i].id maps to PLACEHOLDER_{i+1} in MDX"
    - "Batch dry-run saves .mdx files to scripts/output/{courseSlug}_{lessonSlug}.mdx"
    - "mkdirSync({ recursive: true }) for auto-creating logs/ and output/ directories"
    - "Exit code 1 if any lesson failed, 0 if all succeeded or skipped"

key-files:
  created:
    - scripts/pipeline/query-lessons.ts
    - scripts/pipeline/seed-lesson.ts
    - scripts/USAGE.md
  modified:
    - scripts/generate.ts
    - scripts/lib/supabase.ts

key-decisions:
  - "Lazy Supabase client via Proxy — static instantiation crashed --help with supabaseUrl required error; Proxy defers createClient() until first use"
  - "Pillar scope uses display_order (integer) not slug — matches CLI flag type and DB convention for pillar numbering"
  - "Supabase .update() with .select('id') for 0-row detection — per RESEARCH.md Pitfall 4, update on missing row silently returns empty data"
  - "priorLessonSummaries array grows per-lesson through the loop — feeds lesson continuity context to each subsequent lesson's generation stage"
  - "Validation auto-retry once before failing — avoids crashing batch over single malformed generation"

requirements-completed: [GEN-03, GEN-05, GEN-06]

# Metrics
duration: ~5min
completed: "2026-03-03"
---

# Phase 11 Plan 03: Orchestrator Loop and Database Integration Summary

**Complete end-to-end CLI: scope query resolves lesson targets, 5-stage pipeline (research, generate, review, validate, seed) runs sequentially per lesson with idempotency filtering, quiz UUID replacement, dry-run mode, and generation logs — `pnpm generate --pillar N` now works fully**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-03T07:32:54Z
- **Completed:** 2026-03-03T07:38:07Z
- **Tasks:** 2
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- Created `query-lessons.ts` with `queryLessonsForScope()` handling all 4 scope flags (pillar/semester/course/lesson) — each resolves the full pillar/semester/course chain and assembles typed `LessonTarget[]` sorted by course then lesson display_order
- Created `seed-lesson.ts` with `seedLesson()` — inserts quiz questions into `quiz_questions` table, replaces `PLACEHOLDER_N` references in MDX with real UUIDs returned from insert, then updates the lesson row (triggering `trg_lessons_version`)
- Wired the full orchestrator loop in `generate.ts`: query scope, apply idempotency filter, print banner, sequential 5-stage loop with progress output, auto-retry validation, generate log, exit code
- Fixed Supabase client lazy initialization (Rule 3 auto-fix) — eager instantiation crashed `--help` before env vars loaded; replaced with Proxy-based lazy init
- Created `scripts/USAGE.md` with 195 lines covering prerequisites, flags, all common scenarios, pipeline diagram, idempotency behaviour, error handling, logs, and troubleshooting

## Task Commits

Each task was committed atomically:

1. **Task 1: Create lesson query and seeding modules** - `7fe9c35` (feat)
2. **Task 2: Wire orchestrator loop and create USAGE.md** - `f7b9afb` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `scripts/pipeline/query-lessons.ts` — `queryLessonsForScope()` with 4 scope resolvers; `assembleLessonTargets()` joins pillar/semester/course context onto each lesson; 332 lines
- `scripts/pipeline/seed-lesson.ts` — `seedLesson()` with dry-run gate, quiz insert + UUID replacement, lesson update with 0-row detection; 122 lines
- `scripts/generate.ts` — Full orchestrator replacing placeholder stub: scope query, idempotency filter, banner, sequential pipeline loop (research → generate → review → validate → seed), log writer, exit code; 311 lines
- `scripts/lib/supabase.ts` — Converted to lazy Proxy-based init (auto-fix deviation); same `supabase` export API, deferred until first actual DB call
- `scripts/USAGE.md` — Step-by-step CLI documentation: prerequisites, all flags, 6 common scenarios, pipeline diagram, idempotency guide, error handling, troubleshooting

## Decisions Made

- **Lazy Supabase Proxy:** Eager `createClient()` at import time threw `supabaseUrl is required` on `--help`. Replaced with a `Proxy` that defers `createClient()` to first property access — maintains exact same `supabase.from(...)` API with no changes to callers.
- **Pillar query by display_order:** The `--pillar` flag accepts an integer (display_order), not a slug — matches the CLI design from Plan 01 and database convention where pillar 1/2/3 maps to semester ordering.
- **Update with select('id') for 0-row detection:** Supabase `.update()` without `.select()` returns no data and no error even when no rows match — added `.select('id')` to detect missing lesson rows and throw a helpful error.
- **priorLessonSummaries as running accumulator:** Array is built up across the sequential loop; each lesson receives summaries from all previously generated lessons in the batch for continuity context.
- **Single validation retry:** On validation failure, regenerate once and re-validate. If still invalid, fail the lesson (not the batch). This avoids infinite loops while giving Claude a second chance.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Supabase client eager instantiation crashing --help**
- **Found during:** Task 2 verification
- **Issue:** `scripts/lib/supabase.ts` called `createClient()` at module load time. When `generate.ts` imports all pipeline modules at top level (including those that import supabase), the Supabase URL check runs before dotenv has loaded env vars — crashing `--help` with `supabaseUrl is required`
- **Fix:** Replaced eager `export const supabase = createClient(...)` with a lazy `Proxy` that calls `createClient()` on first property access. Maintains identical API (`supabase.from(...)`) with no changes to callers.
- **Files modified:** `scripts/lib/supabase.ts`
- **Commit:** `f7b9afb` (included in Task 2 commit)

## Issues Encountered

- Eager Supabase client instantiation — resolved by Rule 3 auto-fix (see Deviations above)

## Self-Check

Verifying created files and commits:
- `scripts/pipeline/query-lessons.ts` — FOUND
- `scripts/pipeline/seed-lesson.ts` — FOUND
- `scripts/generate.ts` — FOUND (modified)
- `scripts/lib/supabase.ts` — FOUND (modified)
- `scripts/USAGE.md` — FOUND
- Commit `7fe9c35` — FOUND
- Commit `f7b9afb` — FOUND

## Self-Check: PASSED

## Next Phase Readiness

- CLI is fully functional end-to-end — all pipeline stages wired
- Phase 11 (Content Generation CLI) is now complete — all 3 plans executed
- Phase 12 can begin (next phase per ROADMAP.md)
- Pilot recommendation from STATE.md still applies: run one lesson per pillar before bulk generation to confirm content quality and component correctness

---
*Phase: 11-content-generation-cli*
*Completed: 2026-03-03*
