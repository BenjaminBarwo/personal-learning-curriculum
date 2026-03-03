---
phase: 11-content-generation-cli
plan: "02"
subsystem: cli
tags: [anthropic, mdx, prompts, pipeline, web-search, tsx, validation, few-shot]

# Dependency graph
requires:
  - scripts/lib/anthropic.ts (Anthropic client singleton)
  - scripts/lib/retry.ts (withBackoff for 529 protection)
  - scripts/lib/types.ts (LessonTarget, GenerateOptions)
provides:
  - buildSystemPrompt() — embeds content-format-standards skeleton + tone + component rules + example lesson as few-shot reference (scripts/prompts/system-prompt.ts)
  - buildReviewPrompt() — two-pass quality control: consistency, difficulty, prerequisites, quiz alignment, component correctness (scripts/prompts/review-prompt.ts)
  - EXAMPLE_LESSON_MDX — complete example lesson with correct <Quiz questionId="..." /> pattern (scripts/prompts/example-lesson.ts)
  - GeneratedQuizQuestion interface — typed shape for quiz questions generated alongside MDX (scripts/prompts/example-lesson.ts)
  - researchTopic() — Claude web_search_20250305 research stage with graceful fallback (scripts/pipeline/research.ts)
  - generateLesson() — streaming Claude generation stage, parses MDX and quiz JSON from two-section response (scripts/pipeline/generate-lesson.ts)
  - reviewLesson() — Claude consistency review stage, returns original if format not recognised (scripts/pipeline/review-lesson.ts)
  - validateMdx() — MDX compile parse check + 6-component presence check (scripts/pipeline/validate-mdx.ts)
affects:
  - 11-03 (orchestrator loop imports all pipeline functions and wires them together)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prompt templates embed content standards as string constants — no runtime fs.readFile; CLI stays self-contained"
    - "Dynamic import of @mdx-js/mdx in validate-mdx.ts — avoids ERR_PACKAGE_PATH_NOT_EXPORTED in tsx CJS context caused by transitive estree-walker package.json"
    - "<Quiz questionId='PLACEHOLDER_N' /> self-closing pattern — orchestrator replaces PLACEHOLDER_N with real UUIDs after DB insert"
    - "generateLesson uses anthropic.messages.stream() — avoids idle connection timeout on 8192-token generations (RESEARCH.md Pitfall 5)"
    - "web_search_20250305 versioned tool name in researchTopic — avoids API deprecation errors (RESEARCH.md Pitfall 6)"
    - "Graceful fallback in researchTopic when web_search tool is unavailable — returns training-knowledge prompt instead of crashing"

key-files:
  created:
    - scripts/prompts/example-lesson.ts
    - scripts/prompts/system-prompt.ts
    - scripts/prompts/review-prompt.ts
    - scripts/pipeline/research.ts
    - scripts/pipeline/generate-lesson.ts
    - scripts/pipeline/review-lesson.ts
    - scripts/pipeline/validate-mdx.ts
  modified: []

key-decisions:
  - "Dynamic import for @mdx-js/mdx in validate-mdx.ts — static import fails with ERR_PACKAGE_PATH_NOT_EXPORTED due to estree-walker (transitive dep of @mdx-js/mdx) missing exports field"
  - "Quiz PLACEHOLDER_N pattern — generation pipeline uses string placeholders; orchestrator in Plan 03 replaces them with real UUIDs after inserting quiz_questions rows into Supabase"
  - "Streaming for generateLesson, non-streaming for reviewLesson — review responses are shorter and benefit from simpler code; generation needs stream to avoid idle timeout on 8192-token completions"
  - "Web search fallback graceful degradation — researchTopic catches 400 errors from missing tool access and returns a training-knowledge prompt, allowing generation to proceed without crashing"

requirements-completed: [GEN-02, GEN-08]

# Metrics
duration: ~6min
completed: "2026-03-03"
---

# Phase 11 Plan 02: Generation Pipeline and Prompt Templates Summary

**Four-stage AI generation pipeline (research, generate, review, validate) with prompt templates embedding content-format-standards, lesson-design-principles, and a few-shot example lesson — all pipeline functions are pure async functions callable per-lesson with withBackoff protection**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-03T07:23:46Z
- **Completed:** 2026-03-03T07:29:18Z
- **Tasks:** 2
- **Files modified:** 7 (all created)

## Accomplishments

- Created 3 prompt template files: system-prompt with full content standards and example lesson embedded, review-prompt for two-pass quality control, and example-lesson with `GeneratedQuizQuestion` interface and correct `<Quiz questionId="..." />` pattern
- Created 4 pipeline stage files: research (web_search tool with graceful fallback), generate (streaming 8192-token), review (non-streaming consistency check), validate (MDX parse + 6-component presence)
- All 7 files importable via tsx; all 6 plan verifications pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create prompt templates (system, review, example lesson)** - `48d0594` (feat)
2. **Task 2: Create pipeline stages (research, generate, review, validate)** - `a034e05` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `scripts/prompts/example-lesson.ts` — EXAMPLE_LESSON_MDX with correct self-closing Quiz pattern; GeneratedQuizQuestion interface; QUIZ_QUESTION_EXAMPLE array for reference
- `scripts/prompts/system-prompt.ts` — buildSystemPrompt() embedding content-format-standards skeleton, tone guidelines, component allowlist, quiz instructions, cross-domain rules, difficulty calibration by semester, prior lesson context, and example lesson few-shot reference
- `scripts/prompts/review-prompt.ts` — buildReviewPrompt() implementing 6-criterion two-pass quality review: consistency, difficulty progression, prerequisite coverage, cross-domain connections, quiz alignment, component correctness
- `scripts/pipeline/research.ts` — researchTopic() with web_search_20250305 tool (max 5 uses), withBackoff for 529, graceful fallback if web_search unavailable
- `scripts/pipeline/generate-lesson.ts` — generateLesson() with streaming (messages.stream + finalMessage()), 8192 max_tokens, MDX and quiz JSON extraction via regex, fallback to full text if markers absent
- `scripts/pipeline/review-lesson.ts` — reviewLesson() non-streaming consistency review, preserves original content if response format not recognised
- `scripts/pipeline/validate-mdx.ts` — validateMdx() two-stage: compile() parse check (dynamic import for ESM compat) then regex presence check for 6 required components; Definition/Diagram/Video optional

## Decisions Made

- Dynamic import for `@mdx-js/mdx` in `validate-mdx.ts` — static import fails with `ERR_PACKAGE_PATH_NOT_EXPORTED` because `estree-walker` (a transitive dep of `@mdx-js/mdx`) has no `exports.main` in its package.json; dynamic import bypasses the CJS resolution path
- `<Quiz questionId="PLACEHOLDER_N" />` pattern — generation embeds string placeholders (PLACEHOLDER_1, PLACEHOLDER_2, etc.) into the MDX; the Plan 03 orchestrator replaces them with real UUIDs after inserting `quiz_questions` rows into Supabase
- Streaming only for `generateLesson` (not `reviewLesson`) — review responses are much shorter; streaming complexity is only justified for the long generation stage where idle connection timeout is a real risk
- Graceful web_search fallback — catches 400-class API errors (tool not provisioned) and returns a training-knowledge instruction, so the pipeline continues rather than crashing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `@mdx-js/mdx` static import crashes under tsx CJS mode due to `estree-walker` missing `exports` field. Resolved by using dynamic `await import('@mdx-js/mdx')` in `validate-mdx.ts` (Rule 3 auto-fix — blocking issue). This is documented as a key decision.

## Next Phase Readiness

- All pipeline functions established and importable — ready for Plan 03 (orchestrator loop) which wires: scope query → lesson targets → for each: research → generate → review → validate → seed DB
- `GeneratedQuizQuestion` interface exported from `example-lesson.ts` — Plan 03 seed stage will use it to insert `quiz_questions` rows and replace PLACEHOLDER_N with real UUIDs
- All functions return structured results (no side effects) — Plan 03 orchestrator handles all DB writes and progress display

---
*Phase: 11-content-generation-cli*
*Completed: 2026-03-03*
