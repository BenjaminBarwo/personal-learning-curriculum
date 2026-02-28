# Phase 4: Quiz Engine - Research

**Researched:** 2026-02-27
**Domain:** Interactive quiz components in MDX, React state persistence within a session, Supabase client-side mutations from 'use client' components
**Confidence:** HIGH (database schema, Supabase mutation patterns, component architecture), MEDIUM (question-type UI patterns)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QUIZ-01 | User can complete inline quizzes with immediate correct/incorrect feedback and explanations | Client component with local useState for selected answer + submitted state; explanation shown after submission regardless of outcome |
| QUIZ-02 | User can answer at least four question types: multiple-choice, recall, application, and analysis | Schema already stores question_type ('multiple_choice', 'recall', 'application', 'analysis', 'comparison'); each type needs a UI variant inside a single Quiz component |
| QUIZ-03 | Every quiz attempt (question ID, selected answer, correct/incorrect, timestamp) is written to the database | quiz_attempts table exists in Phase 1 schema; INSERT via browser Supabase client (createClerkSupabaseClient) from client component; RLS INSERT policy already exists |
</phase_requirements>

---

## Summary

Phase 4 builds the interactive quiz layer on top of the lesson content pipeline established in Phase 3. The schema is already complete: `quiz_questions` (content) and `quiz_attempts` (user data) tables were created in Phase 1 along with all necessary RLS policies. No migrations are needed unless quiz question seed data is required. The technical work is entirely in React component building and Supabase client-side mutation.

The core architectural decision is how Quiz integrates with the MDX lesson. The approach is to add a `Quiz` MDX custom component that receives a `questionId` prop and fetches the question from `active_quiz_questions` on the server — or receives the question data pre-fetched by the lesson page. Given the existing patterns (MDX renders server-side, client components provide interactivity), the cleanest pattern is to pre-fetch all quiz questions for a lesson in the server page component alongside lesson data, then pass them into a client `QuizBlock` component that handles interactivity and persistence. This avoids nested async RSC fetches inside MDX.

Session-state persistence (Success Criterion 4 — quiz state does not reset if the user scrolls away) requires that quiz state live outside the Quiz component itself. Using a `QuizProvider` context (similar to `DeepDiveProvider`) in `LessonBody` is the correct pattern: it stores per-question answer state in a map keyed by question ID, so scrolling away and returning does not reset state.

**Primary recommendation:** Add `QuizBlock` as an MDX component receiving a `questionId` prop; pre-fetch all lesson quiz questions in the server page and pass to a `QuizProvider` wrapping the lesson body; use `createClerkSupabaseClient()` in the client component to INSERT into `quiz_attempts`; no new libraries required.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.98.0 (already installed) | Client-side INSERT to quiz_attempts | Already the project standard; browser client via createClerkSupabaseClient |
| React (useState, useContext, useRef) | 19.2.3 (already installed) | Quiz interaction state, session persistence, answer tracking | Built-in; no additional dependencies needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @clerk/nextjs useSession | ^6.39.0 (already installed) | Get Clerk session token for browser Supabase client | Required for RLS INSERT — quiz_attempts has user_id RLS policy |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pre-fetch questions in server page | Fetch inside each QuizBlock RSC | Per-question fetches inside MDX would require nested async RSC; harder to manage total question set for scoring |
| QuizProvider context for session state | URL state (searchParams) | URL state would expose answers and is cumbersome for multiple questions |
| QuizProvider context for session state | sessionStorage | sessionStorage works but adds complexity; React state is simpler and sufficient for same-session requirement |

**Installation:**
```bash
# No new packages needed — all required libraries already installed
# @supabase/supabase-js, @clerk/nextjs, React are in current package.json
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   └── lesson/
│       ├── Quiz.tsx              # NEW — 'use client' quiz component; handles all question types
│       ├── QuizProvider.tsx      # NEW — 'use client' context; session-persistent quiz state map
│       ├── LessonBody.tsx        # MODIFY — add QuizProvider wrapping (alongside existing DeepDiveProvider + DefinitionProvider)
│       └── index.ts              # MODIFY — export Quiz, QuizProvider
├── lib/
│   └── mdx-components.ts        # MODIFY — add Quiz to MDX components map
└── app/
    └── pillars/[...]/lessons/[lessonSlug]/
        └── page.tsx              # MODIFY — pre-fetch quiz questions, pass to QuizProvider via LessonBody
```

### Pattern 1: Pre-fetch Quiz Questions in Server Page

**What:** Fetch all quiz questions for the lesson in the server component (LessonPage), pass them to LessonBody which provides them to QuizProvider context. Individual `<Quiz questionId="...">` MDX tags look up their question from context.
**When to use:** Always — avoids N async RSC fetches inside MDX, keeps data fetching at the page boundary.

```typescript
// In LessonPage server component (page.tsx), after fetching lesson:
const { data: questionsData } = await supabase
  .from('active_quiz_questions')
  .select('*')
  .eq('lesson_id', lesson.id)
  .order('display_order', { ascending: true })

const quizQuestions = (questionsData ?? []) as ActiveQuizQuestion[]

// Pass into LessonBody:
<LessonBody quizQuestions={quizQuestions}>
  <MDXRemote source={lesson.mdx_content} components={mdxComponents} ... />
</LessonBody>
```

### Pattern 2: QuizProvider — Session State Context

**What:** A client context that holds a map of `questionId → { selectedAnswer, submitted, isCorrect }`. All Quiz components read from and write to this shared map. State survives scroll events within the same session.
**When to use:** Wrap the MDX output in LessonBody alongside DeepDiveProvider and DefinitionProvider.

```typescript
// src/components/lesson/QuizProvider.tsx
'use client'

import { createContext, useContext, useState } from 'react'
import type { ActiveQuizQuestion } from '@/types/database.types'

interface QuizAnswerState {
  selectedAnswer: string
  submitted: boolean
  isCorrect: boolean
}

interface QuizContextValue {
  questions: Record<string, ActiveQuizQuestion>  // questionId → question data
  answers: Record<string, QuizAnswerState>        // questionId → answer state
  submitAnswer: (questionId: string, selectedAnswer: string, isCorrect: boolean) => void
}

const QuizContext = createContext<QuizContextValue | null>(null)

export function useQuizContext() {
  const ctx = useContext(QuizContext)
  if (!ctx) throw new Error('useQuizContext must be used within QuizProvider')
  return ctx
}

interface QuizProviderProps {
  questions: ActiveQuizQuestion[]
  children: React.ReactNode
}

export function QuizProvider({ questions, children }: QuizProviderProps) {
  const questionMap = Object.fromEntries(questions.map(q => [q.id, q]))
  const [answers, setAnswers] = useState<Record<string, QuizAnswerState>>({})

  function submitAnswer(questionId: string, selectedAnswer: string, isCorrect: boolean) {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { selectedAnswer, submitted: true, isCorrect }
    }))
  }

  return (
    <QuizContext.Provider value={{ questions: questionMap, answers, submitAnswer }}>
      {children}
    </QuizContext.Provider>
  )
}
```

### Pattern 3: LessonBody Extended with QuizProvider

**What:** Add QuizProvider to the existing LessonBody client wrapper, accepting quizQuestions as a prop.
**When to use:** Always — QuizProvider must wrap the MDX output to provide context to Quiz components.

```typescript
// src/components/lesson/LessonBody.tsx — MODIFIED
'use client'

import React from 'react'
import { DeepDiveProvider } from './DeepDive'
import { DefinitionProvider } from './Definition'
import { QuizProvider } from './QuizProvider'
import type { ActiveQuizQuestion } from '@/types/database.types'

interface LessonBodyProps {
  children: React.ReactNode
  quizQuestions: ActiveQuizQuestion[]
}

export function LessonBody({ children, quizQuestions }: LessonBodyProps) {
  return (
    <DeepDiveProvider>
      <DefinitionProvider>
        <QuizProvider questions={quizQuestions}>
          {children}
        </QuizProvider>
      </DefinitionProvider>
    </DeepDiveProvider>
  )
}
```

### Pattern 4: Quiz MDX Component — Lookup by questionId

**What:** The `<Quiz>` MDX component receives only a `questionId` prop. It looks up question data from QuizContext (populated by the server-fetched questions). This keeps MDX authoring simple — authors reference a question ID, not duplicate question text.
**When to use:** In MDX content, between ConceptBlock and DeepDive sections.

```typescript
// src/components/lesson/Quiz.tsx
'use client'

import { useState } from 'react'
import { useSession } from '@clerk/nextjs'
import { createClerkSupabaseClient } from '@/lib/supabase/client'
import { useQuizContext } from './QuizProvider'
import { HARDCODED_USER_ID } from '@/lib/constants' // or use Clerk session.user.id

interface QuizProps {
  questionId: string
}

export function Quiz({ questionId }: QuizProps) {
  const { questions, answers, submitAnswer } = useQuizContext()
  const { session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localSelected, setLocalSelected] = useState<string | null>(null)

  const question = questions[questionId]
  const existingAnswer = answers[questionId]

  // Question data not yet loaded or not found
  if (!question) return null

  // Already answered this session — show locked result
  const submitted = existingAnswer?.submitted ?? false
  const selectedAnswer = existingAnswer?.selectedAnswer ?? localSelected

  async function handleSubmit() {
    if (!localSelected || submitted || isSubmitting) return

    const isCorrect = computeIsCorrect(question, localSelected)
    setIsSubmitting(true)

    try {
      // Persist attempt to Supabase
      const supabase = createClerkSupabaseClient()
      const userId = session?.user?.id ?? 'user_PLACEHOLDER'

      // Get attempt_number: count existing attempts for this question
      const { count } = await supabase
        .from('quiz_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('question_id', questionId)

      await supabase.from('quiz_attempts').insert({
        user_id: userId,
        question_id: questionId,
        lesson_id: question.lesson_id,
        selected_answer: localSelected,
        correct_answer: question.correct_answer ?? '',
        is_correct: isCorrect,
        attempt_number: (count ?? 0) + 1,
      })

      submitAnswer(questionId, localSelected, isCorrect)
    } catch (error) {
      console.error('Failed to persist quiz attempt:', error)
      // Still update local state so UX does not freeze — error does not block feedback
      submitAnswer(questionId, localSelected, isCorrect)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <QuizBlockUI
      question={question}
      localSelected={localSelected}
      selectedAnswer={selectedAnswer}
      submitted={submitted}
      isSubmitting={isSubmitting}
      onSelect={setLocalSelected}
      onSubmit={handleSubmit}
    />
  )
}
```

### Pattern 5: Question Type Rendering

**What:** The `question_type` field determines which UI variant to render. All types share the same submit/feedback flow; they differ in how options are presented and how correctness is evaluated.
**When to use:** Inside the Quiz component based on `question.question_type`.

```typescript
// Question type → UI mapping
type QuestionType = 'multiple_choice' | 'recall' | 'application' | 'analysis' | 'comparison'

function computeIsCorrect(question: ActiveQuizQuestion, selectedAnswer: string): boolean {
  if (question.question_type === 'recall') {
    // accepted_answers is an array of valid strings; case-insensitive match
    return (question.accepted_answers ?? []).some(
      (a) => a.toLowerCase().trim() === selectedAnswer.toLowerCase().trim()
    )
  }
  // For multiple_choice, application, analysis, comparison:
  // correct_answer holds the canonical answer text; options[].isCorrect marks the correct option
  return selectedAnswer === question.correct_answer
}
```

**UI variants per type:**
- `multiple_choice`: Radio-button list of labeled options (A, B, C, D). Most common type.
- `application`: Same UI as multiple_choice but with a scenario `context` block shown above options.
- `analysis`: Same UI as application; context block required; question asks learner to interpret/evaluate.
- `recall`: Text input field; accepted_answers array is checked server-side-computed; no options shown.
- `comparison`: Multiple choice with options that compare two concepts; same UI as multiple_choice.

### Pattern 6: Supabase Browser Client for Mutations

**What:** The `createClerkSupabaseClient()` function uses `useSession` from `@clerk/nextjs` to get the access token. It must be called inside a function body (not at module level) because `useSession` is a hook.
**When to use:** Inside the Quiz client component for inserting quiz attempts.

```typescript
// src/lib/supabase/client.ts (already exists — no changes needed)
import { createClient } from '@supabase/ssr'
import { useSession } from '@clerk/nextjs'
import type { Database } from '@/types/database.types'

export function createClerkSupabaseClient() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { session } = useSession()
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => session?.getToken() ?? null,
    }
  )
}
```

**CRITICAL:** `createClerkSupabaseClient()` uses a React hook internally. It must be called at the top level of a 'use client' component — not inside event handlers or conditionally. Store the result in a variable at component scope and use that variable in the submit handler.

```typescript
// CORRECT pattern in Quiz.tsx
export function Quiz({ questionId }: QuizProps) {
  const { session } = useSession()
  const supabase = createClerkSupabaseClient() // called at top level — hook rules satisfied

  async function handleSubmit() {
    // Use supabase variable from component scope — do NOT call createClerkSupabaseClient() here
    await supabase.from('quiz_attempts').insert(...)
  }
}
```

### Pattern 7: MDX Authoring Format

**What:** Quiz components appear in MDX using just the question ID. Questions are seeded in the database independently from lesson content.

```mdx
<ConceptBlock title="Gradient Descent">
  The optimization algorithm that finds the minimum of the cost function...
</ConceptBlock>

<Quiz questionId="3f7d2e1a-..." />

<DeepDive title="When Does Gradient Descent Fail?">
  ...
</DeepDive>
```

### Anti-Patterns to Avoid

- **Fetching questions inside the Quiz MDX component as RSC:** MDXRemote renders server-side; nested async RSC fetches inside MDX are possible but create waterfall latency and make data flow hard to trace. Fetch at page level.
- **Calling `createClerkSupabaseClient()` inside event handlers:** It calls `useSession` hook internally; hooks cannot be called inside callbacks. Always call at component top level.
- **Storing quiz state in individual Quiz components:** Each Quiz component would independently lose state on scroll and unmount. Use QuizProvider context.
- **Using auth.uid() in RLS context from client:** The existing RLS policy uses `current_setting('request.jwt.claims', true)::json->>'sub'` — this works automatically when the browser Supabase client sends the Clerk JWT as the access token. No changes to RLS are needed.
- **Blocking feedback display on failed Supabase insert:** The attempt persistence is best-effort for UX. Show feedback immediately; log the error. Do not block the learner from seeing their result if the DB write fails.
- **Passing full question data as MDX props:** MDX props are serialized to strings. Complex objects (options array, accepted_answers) cannot be passed as MDX attributes reliably. Use the context lookup pattern instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Quiz state persistence across scroll | Custom scroll observer + localStorage | QuizProvider context (React useState map) | React state is never reset by scrolling — only by unmounting the component tree (page navigation). Context at LessonBody level persists for the full session |
| Correctness evaluation | Custom fuzzy matching for recall | Simple case-insensitive trim comparison against accepted_answers[] | accepted_answers is an array of pre-approved answers set by content authors; no NLP needed |
| Supabase INSERT with auth | Custom fetch to API route | createClerkSupabaseClient() with RLS | RLS policy + browser client is the established project pattern; API routes add an unnecessary layer |
| attempt_number tracking | Counter in UI state | COUNT query before INSERT | Accurate count of previous attempts from DB is the source of truth |

**Key insight:** No new libraries are needed. The entire quiz engine is built from existing project dependencies (React, Supabase browser client, Clerk). The schema was designed for this feature in Phase 1. The MDX component pattern is identical to DeepDive and Definition.

---

## Common Pitfalls

### Pitfall 1: createClerkSupabaseClient Hook Rules Violation

**What goes wrong:** `React Hook "useSession" is called inside a callback` ESLint error and runtime React hook order violations.
**Why it happens:** `createClerkSupabaseClient()` calls `useSession()` internally. Calling it inside `handleSubmit` or conditionally violates hook rules.
**How to avoid:** Call `createClerkSupabaseClient()` at the top of the `Quiz` component body (unconditionally). Capture the result in a `supabase` variable and reference it in event handlers.
**Warning signs:** ESLint error about hooks in callbacks; React "Rendered more hooks than previous render" error.

### Pitfall 2: Quiz State Reset on Scroll (If Component Unmounts)

**What goes wrong:** Quiz answers reset when the user scrolls away and the component re-mounts (e.g., if the browser un-renders off-screen elements).
**Why it happens:** React virtual DOM does not unmount components just because they scroll off-screen in standard rendering. However, if the quiz is inside a virtualized list or a conditional render gate, it could unmount.
**How to avoid:** Store all quiz answer state in `QuizProvider` context (not local `useState` inside `Quiz`). With context at `LessonBody` level, the state persists regardless of Quiz component mount/unmount cycles.
**Warning signs:** Answers disappear after scrolling down and back up; quiz shows in initial state despite having been answered.

### Pitfall 3: `quiz_attempts.correct_answer` Must Match Schema

**What goes wrong:** INSERT fails or `is_correct` is wrong because `correct_answer` stored in the attempt doesn't match what's in `quiz_questions.correct_answer`.
**Why it happens:** For multiple-choice questions, `correct_answer` in `quiz_questions` is the canonical answer text (not the option ID). The INSERT to `quiz_attempts.correct_answer` must use `question.correct_answer`, not a derived value.
**How to avoid:** Always read `question.correct_answer` from the question object (fetched from `active_quiz_questions`) when inserting the attempt. Never re-compute the correct answer string.
**Warning signs:** `is_correct = true` but learner selected wrong option; or `is_correct = false` when learner selected correct answer.

### Pitfall 4: Recall Questions — accepted_answers Matching

**What goes wrong:** A valid recall answer is rejected because of case or trailing whitespace differences.
**Why it happens:** `accepted_answers` is a `TEXT[]` in Postgres; case sensitivity depends on how answers were seeded.
**How to avoid:** Normalize both the user's input and each `accepted_answers` entry: `.toLowerCase().trim()` before comparison. This is a client-side check for immediate feedback; the DB still records the raw selected_answer.
**Warning signs:** Learner types exact answer and gets "incorrect"; or slight capitalization variation causes failure.

### Pitfall 5: question_type Mismatches Between Schema and UI

**What goes wrong:** A question with `question_type = 'comparison'` falls through the UI rendering switch and renders nothing.
**Why it happens:** Missing case in the question type handler.
**How to avoid:** Handle all 5 types defined in the schema enum: `multiple_choice`, `recall`, `application`, `analysis`, `comparison`. Add a default fallback rendering for unknown types. TypeScript exhaustive check with a `never` assertion in the default case.
**Warning signs:** Quiz block renders blank/empty in a lesson; TypeScript error about unhandled union member.

### Pitfall 6: Attempt Count Race Condition

**What goes wrong:** `attempt_number` is off by one or duplicate if two tabs submit simultaneously.
**Why it happens:** The COUNT query and INSERT are not atomic.
**How to avoid:** For a single-user platform, this is acceptable. The `attempt_number` is best-effort metadata for FSRS; it does not need strict atomicity. Document this as a known limitation.
**Warning signs:** Two attempts with the same `attempt_number` in `quiz_attempts`. Not critical for Phase 4.

### Pitfall 7: Question Not Found in QuizContext

**What goes wrong:** A `<Quiz questionId="...">` in MDX references a question ID that was not seeded in the DB or was soft-deleted.
**Why it happens:** Content author error, or question was deleted from `quiz_questions`.
**How to avoid:** In the `Quiz` component, if `questions[questionId]` is `undefined`, render a graceful fallback (empty or a placeholder UI — not a crash).
**Warning signs:** React render error "Cannot read property 'question_text' of undefined".

---

## Code Examples

### Full Quiz INSERT Pattern

```typescript
// Source: Supabase JS client docs + project Supabase client pattern
// Called inside handleSubmit in Quiz.tsx

const supabase = createClerkSupabaseClient() // at component top level

async function handleSubmit() {
  if (!localSelected || submitted || isSubmitting) return
  setIsSubmitting(true)

  const isCorrect = computeIsCorrect(question, localSelected)

  try {
    // Count previous attempts for attempt_number
    const { count } = await supabase
      .from('quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('question_id', questionId)

    const { error } = await supabase.from('quiz_attempts').insert({
      user_id: userId,
      question_id: questionId,
      lesson_id: question.lesson_id,
      selected_answer: localSelected,
      correct_answer: question.correct_answer ?? '',
      is_correct: isCorrect,
      attempt_number: (count ?? 0) + 1,
    })

    if (error) {
      // Log but do not block UX — feedback still shows
      console.error('[Quiz] Failed to persist attempt:', error)
    }

    submitAnswer(questionId, localSelected, isCorrect) // update context
  } catch (error) {
    console.error('[Quiz] Unexpected error:', error)
    submitAnswer(questionId, localSelected, isCorrect) // still update UX
  } finally {
    setIsSubmitting(false)
  }
}
```

### Multiple Choice Option Rendering

```typescript
// Options come from question.options as Json (runtime: QuizOption[])
// QuizOption = { id: string; text: string; isCorrect: boolean }
// Cast at runtime since schema stores as JSONB

const options = question.options as QuizOption[] ?? []
const labels = ['A', 'B', 'C', 'D', 'E']

options.map((option, i) => (
  <button
    key={option.id}
    type="button"
    disabled={submitted}
    onClick={() => !submitted && setLocalSelected(option.text)}
    className={`
      w-full text-left flex items-start gap-3 rounded-lg px-4 py-3
      border transition-all duration-150
      ${
        submitted
          ? option.isCorrect
            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
            : selectedAnswer === option.text
              ? 'border-red-500 bg-red-500/10 text-red-400'
              : 'border-border-subtle opacity-50'
          : selectedAnswer === option.text
            ? 'border-text-secondary bg-surface-hover text-text-primary'
            : 'border-border-subtle hover:border-border-default hover:bg-surface-hover text-text-secondary'
      }
    `}
  >
    <span className="shrink-0 font-mono text-sm font-semibold">{labels[i]}</span>
    <span className="text-sm leading-relaxed">{option.text}</span>
  </button>
))
```

### Correctness Evaluation

```typescript
// Source: derived from quiz_questions schema
function computeIsCorrect(question: ActiveQuizQuestion, selectedAnswer: string): boolean {
  if (question.question_type === 'recall') {
    return (question.accepted_answers ?? []).some(
      (a) => a.toLowerCase().trim() === selectedAnswer.toLowerCase().trim()
    )
  }
  // multiple_choice, application, analysis, comparison
  return selectedAnswer === question.correct_answer
}
```

### Feedback Display After Submission

```typescript
// Shown after submitted === true, regardless of isCorrect
{submitted && (
  <div className={`
    mt-3 rounded-lg px-4 py-3 text-sm leading-relaxed border
    ${existingAnswer?.isCorrect
      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
      : 'bg-red-500/10 border-red-500/30 text-red-300'
    }
  `}>
    <p className="font-semibold mb-1">
      {existingAnswer?.isCorrect ? 'Correct' : 'Not quite'}
    </p>
    <p className="text-text-secondary">{question.explanation}</p>
  </div>
)}
```

---

## Database Schema Reference

The Phase 1 schema fully supports Phase 4. No migrations needed for the core engine.

**quiz_questions (content table — global, no user_id):**
```
id              UUID PRIMARY KEY
lesson_id       UUID REFERENCES lessons(id)
question_type   TEXT  — 'multiple_choice' | 'recall' | 'application' | 'analysis' | 'comparison'
question_text   TEXT  — the question
context         TEXT  — optional scenario block (for application/analysis types)
options         JSONB — QuizOption[] = [{id, text, isCorrect}] for MC/application/analysis/comparison
correct_answer  TEXT  — canonical answer text for correctness check
accepted_answers TEXT[] — for recall: set of valid fill-in answers
explanation     TEXT  — shown after answering regardless of outcome
display_order   INTEGER
```

**quiz_attempts (user-data table — scoped to user_id):**
```
id               UUID PRIMARY KEY
user_id          TEXT  — Clerk user ID (hardcoded for Phase 1: user_3AGlLR1a07HdOR8G8mECoqPUUfd)
question_id      UUID REFERENCES quiz_questions(id)
lesson_id        UUID REFERENCES lessons(id) — denormalized for FSRS query perf
selected_answer  TEXT  — what the user chose
correct_answer   TEXT  — copied from question at time of attempt (immutable record)
is_correct       BOOLEAN
time_spent_seconds INTEGER | null
attempt_number   INTEGER
created_at       TIMESTAMPTZ  — NO updated_at; append-only record
```

**RLS policies already in place (Phase 1):**
- `quiz_attempts` SELECT: `user_id = JWT sub claim` — user can see own attempts
- `quiz_attempts` INSERT: `user_id = JWT sub claim` — user can insert own attempts
- No UPDATE/DELETE — attempts are immutable for FSRS data integrity

**active_quiz_questions view:** Filters `deleted_at IS NULL`. Query this view in the server page.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API route for client → DB mutations | Browser Supabase client with RLS | Supabase JS v2 / established project pattern | No extra server roundtrip; RLS enforces security at DB layer |
| Form submission with page reload for quiz | Client-side state + async INSERT | React era | Instant feedback without navigation |
| Tracking quiz state in URL params | React context at layout level | Modern React | State persists across scroll without URL pollution |

---

## Open Questions

1. **Seed data for quiz questions**
   - What we know: `quiz_questions` table exists and is empty. Phase 4 builds the engine; Phase 6 seeds real lesson content.
   - What's unclear: Will Phase 4 need test quiz question seed data to validate the engine works end-to-end?
   - Recommendation: The planner should include a task to seed at least one sample question per type (5 questions) into the DB for testing. This can be done via Supabase SQL Editor or a new migration file.

2. **User ID source in Quiz client component**
   - What we know: `session?.user?.id` from `useSession()` gives the Clerk user ID; `HARDCODED_USER_ID = 'user_3AGlLR1a07HdOR8G8mECoqPUUfd'` is set in Phase 1 for the single-user case.
   - What's unclear: Whether the session is reliably non-null in the Clerk-protected app (it should be, since all routes require auth).
   - Recommendation: Use `session?.user?.id ?? HARDCODED_USER_ID` as a safe fallback. The user is always the same person in Phase 1.

3. **time_spent_seconds tracking**
   - What we know: `quiz_attempts.time_spent_seconds` column exists and is nullable.
   - What's unclear: Whether to implement timing in Phase 4 or defer to FSRS phase.
   - Recommendation: Implement basic timing (record when question first renders, compute delta on submit) since the column is already there. Low effort, high future value for FSRS.

4. **Recall question UX on mobile**
   - What we know: Recall questions require a text input. Mobile keyboards auto-capitalize and add autocorrect.
   - What's unclear: Whether to disable autocorrect/autocapitalize on the recall input.
   - Recommendation: Add `autoCapitalize="off" autoCorrect="off" spellCheck={false}` to the recall text input to reduce friction. The accepted_answers comparison already does `.toLowerCase().trim()`.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — skipping automated test mapping section. The config has `workflow.verifier: true` (manual verification) but no `nyquist_validation` key.

---

## Sources

### Primary (HIGH confidence)
- Project schema: `supabase/migrations/00001_initial_schema.sql` — read directly; `quiz_questions` and `quiz_attempts` tables confirmed with all columns, RLS policies, and indexes
- Project types: `src/types/database.types.ts` — read directly; `QuizQuestion`, `QuizAttempt`, `QuizOption`, `QuestionType`, `ActiveQuizQuestion` all confirmed
- Project client factory: `src/lib/supabase/client.ts` — read directly; `createClerkSupabaseClient` pattern confirmed
- Project server factory: `src/lib/supabase/server.ts` — read directly; pattern for server mutations confirmed
- Project component pattern: `src/components/lesson/DeepDive.tsx` — read directly; context pattern (DeepDiveProvider + useContext) confirmed as the correct approach for QuizProvider
- Project component pattern: `src/components/lesson/LessonBody.tsx` — read directly; wrapper component that accepts children + provides multiple contexts
- Project component pattern: `src/components/lesson/MarkCompleteButton.tsx` — read directly; client component with loading/disabled state pattern for async Supabase mutations
- Phase 3 research: `.planning/phases/03-lesson-content-pipeline/03-RESEARCH.md` — read directly; MDX component map pattern and LessonBody architecture confirmed

### Secondary (MEDIUM confidence)
- Supabase JS `@supabase/supabase-js` v2 client-side insert pattern — verified by existing project implementation in `client.ts` and `MarkCompleteButton.tsx` placeholder comment referencing Phase 5 mutation wiring
- Clerk `useSession` hook pattern for getting user ID — verified by `client.ts` which already uses `session?.getToken()`

### Tertiary (LOW confidence — flag for validation)
- React context performance characteristics for quiz state map — standard React pattern; no perf issues expected at lesson scale (< 20 questions per lesson)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all dependencies confirmed installed via package.json
- Database schema: HIGH — quiz_questions and quiz_attempts tables read directly from migration; RLS policies confirmed
- Architecture patterns: HIGH — QuizProvider context mirrors existing DeepDiveProvider/DefinitionProvider patterns exactly; confirmed from source
- Question type UI: MEDIUM — UI design patterns derived from schema structure and common quiz UX; specific visual design is Claude's discretion

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (30 days — stable ecosystem; watch for @supabase/supabase-js or @clerk/nextjs major releases)
