---
phase: 04-quiz-engine
plan: 01
subsystem: quiz-engine
tags: [quiz, mdx, supabase, context, react, typescript]
dependency_graph:
  requires:
    - "03-02: LessonBody + MDX pipeline (QuizProvider wraps MDX output)"
    - "01-02: quiz_attempts table schema (Supabase INSERT target)"
    - "01-02: active_quiz_questions view (server-side pre-fetch)"
  provides:
    - "QuizProvider: session-persistent quiz state for all child components"
    - "Quiz: inline MDX quiz component supporting all 5 question types"
    - "quiz_attempts persistence layer: user answers recorded for FSRS Phase 6"
  affects:
    - "LessonBody.tsx: now accepts quizQuestions prop"
    - "mdx-components.ts: Quiz available to all MDX lesson content"
    - "lesson page.tsx: pre-fetches active_quiz_questions server-side"
tech_stack:
  added:
    - "React context + useMemo for session-persistent quiz state"
    - "createClerkSupabaseClient for browser-side quiz_attempts INSERT"
  patterns:
    - "React context provider pattern (QuizProvider wraps MDX subtree)"
    - "TypeScript exhaustive switch with never type for question_type"
    - "Double cast (as unknown as QuizOption[]) for JSON → typed array"
    - "DO block conditional seed — skips if no lessons exist"
key_files:
  created:
    - "src/components/lesson/QuizProvider.tsx"
    - "src/components/lesson/Quiz.tsx"
  modified:
    - "src/components/lesson/LessonBody.tsx"
    - "src/components/lesson/index.ts"
    - "src/lib/mdx-components.ts"
    - "src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/courses/[courseSlug]/lessons/[lessonSlug]/page.tsx"
    - "supabase/seed.sql"
decisions:
  - "[04-01]: Double cast (as unknown as QuizOption[]) required for Json | null JSONB field — TypeScript strict mode prevents direct cast to QuizOption[]; unknown intermediary satisfies compiler"
  - "[04-01]: createClerkSupabaseClient called at Quiz component top level (not inside handleSubmit) — it calls useSession() internally which is a React hook; calling inside event handlers violates Rules of Hooks"
  - "[04-01]: Quiz state is session-persistent via context, not URL/localStorage — scroll-away-and-return preserves answers within same browser session without storage overhead"
  - "[04-01]: quizQuestions prop defaults to [] on LessonBody — backward compatible; existing lesson pages without quiz questions work unchanged"
  - "[04-01]: Persistence errors logged via console.error but never block feedback UX — submitAnswer(context) always called in finally block regardless of Supabase outcome"
metrics:
  duration_seconds: 156
  completed_date: "2026-02-28"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 5
---

# Phase 4 Plan 01: Quiz Engine — Core Components Summary

**One-liner:** Session-persistent quiz engine with QuizProvider context, 5-question-type Quiz component with immediate feedback, Supabase quiz_attempts persistence, and full MDX pipeline integration via `<Quiz questionId="..." />` syntax.

## What Was Built

### QuizProvider.tsx (new)
React context provider that holds two pieces of state:
- `questions`: a `Record<string, ActiveQuizQuestion>` map built from the pre-fetched questions array (memoized with `useMemo` to prevent re-computation on re-renders)
- `answers`: a `Record<string, QuizAnswerState>` map tracking submitted answers per question ID — this is what makes quiz state persist across scrolling

Exports `QuizProvider` (component) and `useQuizContext` (hook that throws if used outside provider).

### Quiz.tsx (new)
Client component used as `<Quiz questionId="some-uuid" />` in MDX. Handles:
- **5 question types** with distinct input mechanisms:
  - `multiple_choice`, `comparison`: radio-button-style option list
  - `application`, `analysis`: context block above option list
  - `recall`: text input with Enter-key submit, shows accepted answers after feedback
- **Correctness evaluation**: recall uses case-insensitive accepted_answers check; all others compare against `correct_answer`
- **Supabase persistence**: counts prior attempts for `attempt_number`, then INSERTs into `quiz_attempts` with `user_id`, `question_id`, `lesson_id`, `selected_answer`, `correct_answer`, `is_correct`, `time_spent_seconds`
- **Graceful degradation**: question not in context → "Question not available" message; Supabase error → logged, UX never blocked
- **After submission**: button disappears, feedback section shows with correct/incorrect indicator and explanation

### Integration Changes
- **LessonBody.tsx**: added optional `quizQuestions?: ActiveQuizQuestion[]` prop (defaults `[]`), wraps children with `QuizProvider`
- **index.ts**: exports `Quiz`, `QuizProvider`, `useQuizContext`
- **mdx-components.ts**: `Quiz` added to MDX component map
- **lesson page.tsx**: server-side pre-fetch from `active_quiz_questions` view filtered by `lesson_id`, ordered by `display_order`, passed to `LessonBody`

### seed.sql (appended)
5 test quiz questions (one per type) with AI/ML content targeting Pillar 1 curriculum. Uses a `DO $$` block to find any existing lesson ID — skips silently if no lessons exist. Must be executed manually.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Type Error] Json cast to QuizOption[] requires double-cast**
- **Found during:** Task 1 TypeScript verification
- **Issue:** `question.options as QuizOption[]` fails strict TypeScript — `Json | null` does not sufficiently overlap with `QuizOption[]`; TypeScript requires explicit acknowledgement via `unknown` intermediary
- **Fix:** Changed `question.options as QuizOption[]` to `question.options as unknown as QuizOption[]` for both `multiple_choice`/`comparison` and `application`/`analysis` branches
- **Files modified:** `src/components/lesson/Quiz.tsx`
- **Commit:** 214cdbe (fix applied in same task, pre-commit)

## Self-Check

Verified:
- `src/components/lesson/QuizProvider.tsx` — exists, exports QuizProvider + useQuizContext
- `src/components/lesson/Quiz.tsx` — exists, exports Quiz, handles all 5 types
- `src/components/lesson/LessonBody.tsx` — modified, accepts quizQuestions prop
- `src/lib/mdx-components.ts` — Quiz in component map
- `src/app/.../lessons/[lessonSlug]/page.tsx` — pre-fetches active_quiz_questions
- `supabase/seed.sql` — 5 test questions appended
- Commits: 214cdbe, fd47010, 96468e2 — all present
- `npx tsc --noEmit` — zero errors
- `npm run build` — compiled successfully in 7.9s, zero errors

## Self-Check: PASSED
