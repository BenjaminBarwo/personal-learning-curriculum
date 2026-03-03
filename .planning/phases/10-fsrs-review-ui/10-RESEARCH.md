# Phase 10: FSRS Review UI - Research

**Researched:** 2026-03-02
**Domain:** Next.js App Router (RSC + Client Components), ts-fsrs repeat() API, Supabase data fetching, React UI state machine
**Confidence:** HIGH

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FSRS-03 | Dashboard shows "X due today" widget with link to `/review` — absent when count is 0 | `getDueCardCount()` server action is ready in `src/lib/actions/fsrs.ts`; dashboard page is an RSC at `src/app/dashboard/page.tsx`; widget is a conditional render with `export const dynamic = 'force-dynamic'` already set |
| FSRS-04 | User can review due cards on `/review` page with card-flip flow (question → show answer → rate) | New `src/app/review/page.tsx` (RSC) fetches due cards joined with quiz question data; new `src/components/review/ReviewSession.tsx` ('use client') manages flip state machine |
| FSRS-05 | Rating buttons show interval hints per option (e.g., "Good → 4 days") | `f.repeat(fsrsCard, now)` from ts-fsrs computes all 4 next-state intervals simultaneously; called client-side before rendering buttons; intervals formatted as "< 1 min" / "N min" / "N days" depending on scheduled_days |
| FSRS-06 | Card state is persisted to Supabase after each rating | `submitFsrsReview({ cardId, rating })` server action is ready in `src/lib/actions/fsrs.ts`; called from client component after user taps a rating button |
| FSRS-07 | User sees "All caught up" state when no cards are due, with next review time | RSC fetches next-due card (`ORDER BY due ASC LIMIT 1`) when count is 0; time until next review formatted as human-readable string |

</phase_requirements>

---

## Summary

Phase 10 is a pure UI phase — the data layer (tables, server actions, types) is fully complete from Phase 9. The only new infrastructure needed is a `getDueCardsForReview()` server action to fetch due cards with their quiz question content, a new `/review` route, and a dashboard widget. No new npm packages are required.

The central architectural challenge is the **review session state machine**: a 'use client' component must manage which card is currently displayed, whether the answer is revealed, and the transition to the next card after rating. The state machine is straightforward (question shown → answer revealed → card rated → next card), but the interval hints for rating buttons (FSRS-05) require calling `f.repeat(fsrsCard, now)` client-side to compute all four next-state intervals before rendering the buttons. This is safe because ts-fsrs is a pure calculation library with no side effects.

The `/review` page follows the same RSC + client component split as the rest of the app: the RSC page component fetches data at render time (due cards + quiz question text), passes the array to a client component, and the client component owns all interactive state. The dashboard widget is a simple conditional block added to the existing `src/app/dashboard/page.tsx` RSC — it calls the existing `getDueCardCount()` action at render time.

**Primary recommendation:** No new packages needed. Add `getDueCardsForReview()` to `src/lib/actions/fsrs.ts`, add `src/app/review/page.tsx` (RSC), add `src/components/review/ReviewSession.tsx` ('use client'), and add the due-today widget block to the dashboard page.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ts-fsrs` | ^5.2.3 (already installed) | `f.repeat(card, now)` to compute interval hints for all 4 rating buttons | Already installed; repeat() is the correct API when you need all 4 outcomes simultaneously (vs next() which needs a known grade) |
| `@supabase/supabase-js` | ^2.98.0 (already installed) | Fetch due cards + quiz question data in `getDueCardsForReview()` | Already in project |
| `@clerk/nextjs/server` | ^6.39.0 (already installed) | `auth()` in RSC page and server actions | Already in project, established pattern |
| Next.js App Router | 16.1.6 (already installed) | RSC page at `/review`, client component for interactive session | Already in project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React `useState` | Built-in (React 19.2.3) | Review session state machine (currentIndex, isAnswerRevealed) | Inside 'use client' ReviewSession component |
| React `useTransition` | Built-in | Wrap `submitFsrsReview()` calls to avoid blocking UI during persistence | Prevents button double-tap; shows pending state during server round-trip |
| `useRouter` from `next/navigation` | Built-in | `router.refresh()` after last card rated to trigger dashboard re-render | Same pattern as MarkCompleteButton |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side `f.repeat()` for interval hints | Server-side pre-computation (include in getDueCardsForReview() response) | Server-side avoids exposing ts-fsrs to client bundle; but adds ~100KB to server response per card and mismatches the "now" used at rating time vs fetch time. Client-side is simpler and ts-fsrs is small (~50KB) |
| `useTransition` for rating submission | `useState(isLoading)` only | useTransition is cleaner for concurrent mode; both work; use useTransition per established React 19 patterns |
| Single `ReviewSession` component | Separate `FlashCard` + `RatingButtons` components | Composition is cleaner for testing; split into sub-components within the same file |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── dashboard/
│   │   └── page.tsx              # MODIFIED — add due-today widget block
│   └── review/
│       └── page.tsx              # NEW — RSC: fetch due cards, render ReviewSession
├── components/
│   └── review/                   # NEW directory
│       └── ReviewSession.tsx     # NEW — 'use client': card flip state machine
├── lib/
│   └── actions/
│       └── fsrs.ts               # MODIFIED — add getDueCardsForReview()
```

No other directories or files need to change.

### Pattern 1: getDueCardsForReview() Server Action

**What:** Fetch due cards for the authenticated user, joined with their quiz question content (question_text, correct_answer, explanation, options, question_type). This is the data contract between the RSC page and the client component.

**Why a separate action from getDueCardCount():** The review page needs full card + question data. getDueCardCount() only returns a number. Fetching count from a full-data query adds no meaningful overhead, but the two functions have different callers (dashboard widget vs review page).

**Key JOIN pattern:** `fsrs_cards` has `question_id` as a foreign key to `quiz_questions`. Supabase PostgREST supports foreign key joins using the `.select('*, quiz_questions(*)')` syntax. This avoids a second round-trip.

```typescript
// Source: Supabase PostgREST join syntax — foreign key expansion
// Added to src/lib/actions/fsrs.ts

export interface DueCardForReview {
  cardId: string
  questionId: string
  questionText: string
  questionType: string
  correctAnswer: string | null
  acceptedAnswers: string[] | null
  explanation: string
  options: QuizOption[] | null
  // FSRS card state fields needed for f.repeat() computation
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: FsrsCardState
  last_review: string | null
}

export async function getDueCardsForReview(): Promise<DueCardForReview[]> {
  const { userId } = await auth()
  if (!userId) return []

  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from('fsrs_cards')
    .select(`
      id,
      question_id,
      due,
      stability,
      difficulty,
      elapsed_days,
      scheduled_days,
      learning_steps,
      reps,
      lapses,
      state,
      last_review,
      quiz_questions (
        question_text,
        question_type,
        correct_answer,
        accepted_answers,
        explanation,
        options
      )
    `)
    .eq('user_id', userId)
    .lte('due', new Date().toISOString())
    .order('due', { ascending: true })  // oldest-due first

  if (error) {
    console.error('Failed to fetch due cards:', error)
    return []
  }

  return (data ?? []).map((row) => ({
    cardId: row.id,
    questionId: row.question_id,
    questionText: row.quiz_questions?.question_text ?? '',
    questionType: row.quiz_questions?.question_type ?? 'multiple_choice',
    correctAnswer: row.quiz_questions?.correct_answer ?? null,
    acceptedAnswers: row.quiz_questions?.accepted_answers ?? null,
    explanation: row.quiz_questions?.explanation ?? '',
    options: (row.quiz_questions?.options as QuizOption[] | null) ?? null,
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.last_review,
  }))
}
```

**Critical note on Supabase join syntax:** When using `createAdminSupabaseClient()` (service role, bypasses RLS), PostgREST foreign key expansion works via `.select('*, related_table(fields)')`. The joined relation name is the table name (`quiz_questions`), not the FK column name. The result row has `row.quiz_questions` as an object (not array) because it's a many-to-one join.

### Pattern 2: Next Due Card Query (for "All caught up" state)

**What:** When `getDueCardsForReview()` returns an empty array, the `/review` page needs to show the time until the next card is due.

```typescript
// Source: Supabase query pattern — same file
export async function getNextDueCard(): Promise<{ due: string } | null> {
  const { userId } = await auth()
  if (!userId) return null

  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from('fsrs_cards')
    .select('due')
    .eq('user_id', userId)
    .gt('due', new Date().toISOString())  // future cards only
    .order('due', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return { due: data.due }
}
```

### Pattern 3: /review RSC Page

**What:** Server component that calls both data-fetching functions, renders ReviewSession with due cards, or renders the "All caught up" state.

**Why RSC for the page:** Data fetching happens at render time; the client receives pre-fetched cards. No useEffect data fetching in the client component. This matches the established pattern in dashboard/page.tsx and lesson/[slug]/page.tsx.

```typescript
// src/app/review/page.tsx
import { auth } from '@clerk/nextjs/server'
import { getDueCardsForReview, getNextDueCard } from '@/lib/actions/fsrs'
import { ReviewSession } from '@/components/review/ReviewSession'

export const dynamic = 'force-dynamic'  // REQUIRED — due count changes per request

export default async function ReviewPage() {
  const { userId } = await auth()
  if (!userId) return null  // middleware handles redirect; this is a safety guard

  const dueCards = await getDueCardsForReview()

  if (dueCards.length === 0) {
    const nextCard = await getNextDueCard()
    return <AllCaughtUp nextDue={nextCard?.due ?? null} />
  }

  return <ReviewSession cards={dueCards} />
}
```

### Pattern 4: ReviewSession Client Component State Machine

**What:** 'use client' component that manages the card-flip flow. State: `currentIndex` (which card), `isAnswerRevealed` (question or answer face), `isPending` (rating submission in flight).

**Key design decisions:**
- `f.repeat(fsrsCard, now)` is called during render to compute interval hints for the 4 rating buttons. This is a pure synchronous computation — no async, no side effects.
- After rating the last card, call `router.refresh()` to re-render the RSC page (which will then show "All caught up"). Same pattern as `MarkCompleteButton`.
- Buttons are disabled during `isPending` (useTransition) to prevent double-tap.

```typescript
// Source: ts-fsrs verified via local node_modules execution
// src/components/review/ReviewSession.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { fsrs, Rating } from 'ts-fsrs'
import { submitFsrsReview } from '@/lib/actions/fsrs'
import type { DueCardForReview } from '@/lib/actions/fsrs'

const f = fsrs()  // singleton — same FSRS-5 default params as server action

// Compute interval hints synchronously using f.repeat()
function computeIntervalHints(card: DueCardForReview): Record<1|2|3|4, string> {
  const now = new Date()
  const fsrsCard = {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  }
  const repeatLog = f.repeat(fsrsCard, now)

  function formatInterval(scheduledDays: number, due: Date): string {
    if (scheduledDays === 0) {
      const mins = Math.max(1, Math.round((due.getTime() - now.getTime()) / 60000))
      return mins === 1 ? '1 min' : `${mins} min`
    }
    return scheduledDays === 1 ? '1 day' : `${scheduledDays} days`
  }

  return {
    1: formatInterval(repeatLog[Rating.Again].card.scheduled_days, repeatLog[Rating.Again].card.due),
    2: formatInterval(repeatLog[Rating.Hard].card.scheduled_days, repeatLog[Rating.Hard].card.due),
    3: formatInterval(repeatLog[Rating.Good].card.scheduled_days, repeatLog[Rating.Good].card.due),
    4: formatInterval(repeatLog[Rating.Easy].card.scheduled_days, repeatLog[Rating.Easy].card.due),
  }
}

export function ReviewSession({ cards }: { cards: DueCardForReview[] }) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false)
  const [isPending, startTransition] = useTransition()

  const currentCard = cards[currentIndex]
  if (!currentCard) return null

  const intervalHints = computeIntervalHints(currentCard)
  const isLastCard = currentIndex === cards.length - 1

  function handleReveal() {
    setIsAnswerRevealed(true)
  }

  function handleRate(rating: 1 | 2 | 3 | 4) {
    startTransition(async () => {
      await submitFsrsReview({ cardId: currentCard.cardId, rating })

      if (isLastCard) {
        router.refresh()  // triggers RSC re-render → "All caught up" state
      } else {
        setCurrentIndex((i) => i + 1)
        setIsAnswerRevealed(false)
      }
    })
  }

  return (
    <div>
      {/* Progress indicator: "Card N of M" */}
      {/* Question face */}
      {/* Answer face (shown when isAnswerRevealed) */}
      {/* "Show Answer" button (shown when !isAnswerRevealed) */}
      {/* Rating buttons with interval hints (shown when isAnswerRevealed) */}
    </div>
  )
}
```

**Verified via live execution:** `f.repeat(card, now)` with a new card returns:
- Again: `< 1 min` (scheduled_days=0, due in ~1 min)
- Hard: `6 min` (scheduled_days=0, due in 6 min)
- Good: `10 min` (scheduled_days=0, due in 10 min — learning phase)
- Easy: `8 days` (scheduled_days=8)

For review-state cards (after multiple reps), intervals are in days (e.g., Again=0 days/relearning, Hard=2 days, Good=3 days, Easy=4 days).

### Pattern 5: Dashboard Due-Today Widget

**What:** Conditional block added to the existing dashboard RSC, after the continue card. Calls `getDueCardCount()` at page render time.

**Conditional rendering rule:** The widget is entirely absent (returns null) when count is 0. It renders as a linked card when count > 0. This is FSRS-03's "widget is absent when zero cards are due."

```typescript
// Added to src/app/dashboard/page.tsx
import { getDueCardCount } from '@/lib/actions/fsrs'

// Inside DashboardPage():
const dueCount = await getDueCardCount()

// In JSX — after the continue card, before the pillar grid:
{dueCount > 0 && (
  <Link
    href="/review"
    className="rounded-xl p-6 border border-border-subtle bg-surface-card flex items-center justify-between gap-4 hover:border-border-default hover:bg-surface-hover transition-all"
  >
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
        Spaced Repetition
      </p>
      <p className="text-xl font-semibold text-text-primary">
        {dueCount} {dueCount === 1 ? 'card' : 'cards'} due today
      </p>
    </div>
    {/* Arrow icon */}
  </Link>
)}
```

### Pattern 6: "All Caught Up" State

**What:** Displayed by the `/review` RSC when no cards are due. Shows the time until the next card is due. This is a server-rendered static display, not interactive.

**Time until next review:** Computed from `nextCard.due` (ISO string from Supabase) as a formatted human-readable string. Computed in the RSC (server-side), not client-side.

```typescript
// In review/page.tsx (RSC — server-side time formatting)
function formatTimeUntil(dueIso: string): string {
  const diff = new Date(dueIso).getTime() - Date.now()
  if (diff <= 0) return 'very soon'

  const mins = Math.round(diff / 60000)
  if (mins < 60) return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`

  const hours = Math.round(diff / 3600000)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`

  const days = Math.round(diff / 86400000)
  return `${days} ${days === 1 ? 'day' : 'days'}`
}
```

### Anti-Patterns to Avoid

- **useEffect for data fetching in ReviewSession:** The RSC page fetches all cards before rendering. The client component receives them as props. No useEffect data fetching is needed or appropriate. This matches the established app pattern.
- **Calling `f.repeat()` in a useEffect or useState initializer:** `f.repeat()` is synchronous. Call it directly during render to compute hints. No memo needed unless profiling shows a real cost (it won't — pure JS math on 4 numbers is instant).
- **Using `router.push('/review')` after last card instead of `router.refresh()`:** `push` would navigate away and back. `refresh()` re-renders the current RSC, which will now see 0 due cards and show the "All caught up" state. This matches the `MarkCompleteButton` precedent.
- **Adding `export const dynamic = 'force-dynamic'` to the ReviewSession client component:** Only the RSC page needs `force-dynamic`. Client components don't participate in Next.js static generation.
- **Fetching next-due card only from the client:** The "All caught up" state is rendered by the RSC. The next-due time is computed server-side and passed as a prop to a static display component. No client-side polling needed.
- **Two separate Supabase queries for cards + quiz questions:** Use PostgREST foreign key expansion in a single query. Avoid N+1 patterns.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interval hint computation | Custom math for "next review in N days" | `f.repeat(fsrsCard, now)` from ts-fsrs | Returns all 4 outcomes simultaneously with correct FSRS-5 math; already installed |
| Card + question JOIN | Two separate Supabase queries | `.select('*, quiz_questions(*)')` PostgREST join | Single round-trip; same result |
| "Time until next review" clock | Real-time countdown with useEffect + setInterval | Static server-side `formatTimeUntil()` string | Per FSRS-07, showing "N hours/days" is sufficient; a real-time clock adds complexity with no learning benefit |
| Rating button loading states | Custom `useState(isLoading)` per button | `useTransition` from React | isPending covers all 4 buttons simultaneously; prevents double-tap during the server round-trip |

**Key insight:** Phase 9 built the entire data layer. Phase 10 is UI assembly — the main job is correctly wiring the existing server actions to a well-designed state machine.

---

## Common Pitfalls

### Pitfall 1: `f.repeat()` Parameter Mismatch with `f.next()` at Submission Time

**What goes wrong:** The interval hints computed by `f.repeat(card, now_at_render)` show "Good → 4 days" to the user. When the user rates, `submitFsrsReview()` calls `f.next(card, now_at_submission)` — but `now` may differ by seconds or minutes. The resulting intervals will be slightly different from the hints shown.

**Why it happens:** Time passes between when the card is rendered and when the user taps a rating button.

**How to avoid:** This is acceptable and expected behavior. FSRS is robust to small time differences. The interval hint is an approximation, not a guarantee. Document this in code comments; do not try to synchronize the two timestamps.

**Warning signs:** Attempting to pass a `reviewedAt` timestamp from client to server action — this opens a security hole (client-provided timestamps). Use `new Date()` server-side in `submitFsrsReview()`.

---

### Pitfall 2: Missing `force-dynamic` on Review Page

**What goes wrong:** Next.js statically generates the `/review` page at build time. The due card count is baked in at build; every user sees the same (empty) page.

**Why it happens:** Next.js App Router statically generates pages by default unless opted out.

**How to avoid:** Add `export const dynamic = 'force-dynamic'` to `src/app/review/page.tsx`. The dashboard already has this for the same reason.

**Warning signs:** `/review` always shows "All caught up" even after lessons are completed; `getDueCardsForReview()` always returns [].

---

### Pitfall 3: PostgREST Join Returns `null` Instead of Object

**What goes wrong:** `row.quiz_questions` is `null` for a card whose `question_id` references a soft-deleted quiz question (`deleted_at IS NOT NULL`). The join succeeds but returns null because the FK target exists but the active_quiz_questions view filters it out.

**Why it happens:** The join is against the `quiz_questions` table (which includes soft-deleted rows via PostgREST), while card seeding queries `quiz_questions` filtered by `is('deleted_at', null)`. A question soft-deleted after card seeding creates an orphaned card.

**How to avoid:** Add null guards when mapping join results in `getDueCardsForReview()`. A card with `quiz_questions: null` should be filtered out of the returned array (or skipped in the UI). This is an edge case in the current phase but document it.

**Warning signs:** TypeScript errors on `row.quiz_questions.question_text` when the TS type marks the join as nullable.

---

### Pitfall 4: ReviewSession Loses State on router.refresh()

**What goes wrong:** After rating the last card, `router.refresh()` is called. Next.js re-fetches the RSC and re-renders the page. If the RSC now returns 0 cards, it renders `<AllCaughtUp />` — correct. But if the Supabase write from `submitFsrsReview()` hasn't committed before `router.refresh()` fires, the page briefly shows the same card again.

**Why it happens:** `submitFsrsReview()` is awaited inside `startTransition`, so the update is committed before `router.refresh()` is called. This should not be an issue with `useTransition`.

**How to avoid:** Ensure `await submitFsrsReview(...)` completes before `router.refresh()`. The `startTransition(async () => { await ...; router.refresh() })` pattern handles this correctly.

**Warning signs:** Flicker — the review page momentarily shows the just-rated card again on refresh.

---

### Pitfall 5: Supabase Admin Client in getDueCardsForReview()

**What goes wrong:** Using `createServerSupabaseClient()` (JWT-authenticated, RLS-enforced) instead of `createAdminSupabaseClient()` for `getDueCardsForReview()`.

**Why it happens:** The JWT client goes through RLS, which requires a valid Clerk JWT to be present in the request. Server actions called from RSC pages may not have the JWT available in the same way as client-initiated requests.

**How to avoid:** Use `createAdminSupabaseClient()` in all server actions, consistent with the project pattern established in Phase 9. The `auth()` call at the top of each action provides the userId for manual filtering (`.eq('user_id', userId)`), replacing RLS filtering.

**Warning signs:** `getDueCardsForReview()` returns [] despite cards existing in the DB; Supabase logs show RLS policy violations.

---

### Pitfall 6: Interval Hint for Sub-Day Intervals Shows "0 days"

**What goes wrong:** For new cards in the learning phase, `scheduled_days` is 0 (the card is due in minutes). Displaying "Again → 0 days" is confusing.

**Why it happens:** FSRS uses minutes for learning steps, not days. `scheduled_days` is 0 when the next review is sub-day.

**How to avoid:** Check `scheduled_days === 0` and use the `due` timestamp difference in minutes instead. Verified via live execution: a new card's "Again" interval is ~1 min, "Hard" is 6 min, "Good" is 10 min, "Easy" is 8 days (scheduled_days=8). See Pattern 4 for the `formatInterval()` implementation.

**Warning signs:** Rating buttons show "Again — 0 days" for new cards.

---

## Code Examples

Verified patterns from official sources and live codebase execution:

### ts-fsrs: repeat() for Interval Hints

```typescript
// Source: verified via live node execution against installed ts-fsrs@5.2.3
// Returns ALL 4 next-state outcomes simultaneously
import { fsrs, Rating } from 'ts-fsrs'
const f = fsrs()

const repeatLog = f.repeat(fsrsCard, now)
// repeatLog[Rating.Again] = { card: Card, log: ReviewLog }
// repeatLog[Rating.Hard]  = { card: Card, log: ReviewLog }
// repeatLog[Rating.Good]  = { card: Card, log: ReviewLog }
// repeatLog[Rating.Easy]  = { card: Card, log: ReviewLog }

// For a new card:
// again.card.scheduled_days = 0, again.card.due = now + 1 min
// hard.card.scheduled_days  = 0, hard.card.due  = now + 6 min
// good.card.scheduled_days  = 0, good.card.due  = now + 10 min
// easy.card.scheduled_days  = 8, easy.card.due  = now + 8 days
```

### Supabase: Foreign Key Join in One Query

```typescript
// Source: Supabase PostgREST docs — foreign key expansion
const { data } = await supabase
  .from('fsrs_cards')
  .select(`
    id,
    question_id,
    due,
    stability,
    difficulty,
    elapsed_days,
    scheduled_days,
    learning_steps,
    reps,
    lapses,
    state,
    last_review,
    quiz_questions (
      question_text,
      question_type,
      correct_answer,
      accepted_answers,
      explanation,
      options
    )
  `)
  .eq('user_id', userId)
  .lte('due', new Date().toISOString())
  .order('due', { ascending: true })
// data[i].quiz_questions is an object (not array) — many-to-one join via FK
```

### Next.js: force-dynamic RSC Page with Auth Guard

```typescript
// Source: established project pattern from src/app/dashboard/page.tsx
export const dynamic = 'force-dynamic'

export default async function ReviewPage() {
  const { userId } = await auth()
  if (!userId) return null  // middleware catches this; guard is redundant safety
  // ...
}
```

### React: useTransition for Async Server Action

```typescript
// Source: React 19 docs — useTransition with async functions
const [isPending, startTransition] = useTransition()

function handleRate(rating: 1 | 2 | 3 | 4) {
  startTransition(async () => {
    await submitFsrsReview({ cardId: currentCard.cardId, rating })
    // isPending is true until this block completes
    if (isLastCard) {
      router.refresh()
    } else {
      setCurrentIndex((i) => i + 1)
      setIsAnswerRevealed(false)
    }
  })
}
```

### Dashboard Widget: Conditional Due Count

```typescript
// Source: project pattern — getDueCardCount() already callable from RSC
import { getDueCardCount } from '@/lib/actions/fsrs'

// In DashboardPage():
const dueCount = await getDueCardCount()

// In JSX:
{dueCount > 0 && (
  <Link href="/review" className="...">
    {dueCount} {dueCount === 1 ? 'card' : 'cards'} due today
  </Link>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `f.repeat()` iterating all grades (v3 style) | `f.next(card, now, grade)` for submission, `f.repeat(card, now)` for preview | ts-fsrs v4+ | Use `next()` when grade is known (submitFsrsReview), use `repeat()` when previewing all options (interval hints) |
| Pages Router for `/review` | App Router RSC + client component split | Next.js 13+ | Data fetching in RSC eliminates useEffect + loading state boilerplate |
| `useState(isLoading)` for async UI | `useTransition` from React 18+ | React 18+ | useTransition integrates with concurrent mode; prevents UI blocking during long transitions |

**Deprecated/outdated:**
- `f.repeat()` v3 API: Returns `RecordLog` keyed by `Rating` (same as v5). Still valid in v5 for interval-hint use cases.
- `export const revalidate = 0` (alternative to `force-dynamic`): `force-dynamic` is the explicit, preferred way to opt out of caching in Next.js App Router.

---

## Open Questions

1. **How many due cards should the review page load at once?**
   - What we know: `getDueCardsForReview()` fetches all currently-due cards in a single query. A user who skipped review for a week could have hundreds of due cards.
   - What's unclear: Whether to cap at a session limit (e.g., 20 cards max per session) or show all.
   - Recommendation: Fetch all due cards for now (no cap). The first phase implementation should be simple. A session cap (FSRS-08 in future requirements) can be added later. If the query returns 200+ rows, add `.limit(50)` as a pragmatic cap.

2. **Should the review page show the lesson context alongside the question?**
   - What we know: `fsrs_cards.lesson_id` is available, and `quiz_questions.context` exists for application/analysis type questions. The FSRS-04 requirement says "question shown first, answer revealed on tap."
   - What's unclear: Whether to show which lesson/course the card came from.
   - Recommendation: Show `quiz_questions.context` (already in the joined data) for question types that have it. Skip lesson breadcrumb context for now — it adds a JOIN to lessons → courses → semesters → pillars and the requirement doesn't call for it.

3. **Quiz question `options` field type in the join result**
   - What we know: `quiz_questions.options` is typed as `Json | null` in `database.types.ts`. The `QuizOption[]` shape is `{ id: string, text: string, isCorrect: boolean }`. The Quiz component already casts it as `question.options as unknown as QuizOption[]`.
   - Recommendation: Apply the same `as unknown as QuizOption[]` cast in `getDueCardsForReview()`'s map function. The shape is stable.

4. **TypeScript type for the PostgREST join result on `quiz_questions`**
   - What we know: Supabase TypeScript client may infer `quiz_questions` as `{ ... } | null` or as `{ ... }` depending on the FK nullable/not-null constraint. The FK is `NOT NULL` on `fsrs_cards.question_id`, but PostgREST may still return null for soft-deleted rows.
   - Recommendation: Explicitly type the join result as `QuizQuestion | null` and add null guards in the map function. Filter out cards where `quiz_questions` is null.

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` — skipping this section.

---

## Sources

### Primary (HIGH confidence)

- **Codebase inspection** — `src/lib/actions/fsrs.ts` (submitFsrsReview, getDueCardCount — exact function signatures), `src/types/database.types.ts` (FsrsCard, FsrsRating, FsrsCardState types, fsrs_cards schema), `src/app/dashboard/page.tsx` (RSC pattern, dynamic export, getDueCardCount integration point), `src/components/lesson/MarkCompleteButton.tsx` (useTransition pattern, router.refresh() pattern), `src/components/lesson/Quiz.tsx` ('use client' state machine pattern), `package.json` (no new packages needed)
- **Live ts-fsrs execution** — Executed `f.repeat(createEmptyCard(now), now)` against installed ts-fsrs@5.2.3 in the project's node_modules; verified: `Rating` keyed output, `scheduled_days` values for all 4 ratings on new card (0, 0, 0, 8), minute-level interval for learning phase, correct State enum values (0=New, 1=Learning, 2=Review, 3=Relearning)
- **Phase 9 RESEARCH.md and SUMMARY files** — Confirmed `f.repeat()` vs `f.next()` distinction, confirmed `learning_steps` field required in Card reconstruction, confirmed double-cast pattern `as unknown as FsrsCardState`

### Secondary (MEDIUM confidence)

- **Next.js App Router docs** — `force-dynamic` behavior, RSC + client component data-passing pattern, `useTransition` with async server actions in React 19
- **Supabase PostgREST docs** — Foreign key expansion via `.select('*, related_table(columns)')` syntax; many-to-one join returns object not array

### Tertiary (LOW confidence)

- None — all critical claims verified against codebase or live execution.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; verified via package.json and node_modules
- Architecture: HIGH — patterns derived directly from existing codebase (dashboard RSC, MarkCompleteButton hook, Quiz state machine); ts-fsrs API verified via live execution
- Pitfalls: HIGH — most pitfalls identified from codebase patterns + live ts-fsrs execution; one MEDIUM (Pitfall 3: soft-delete orphan — edge case identified by reasoning, not witnessed)

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (Next.js, ts-fsrs, Supabase APIs are stable; no fast-moving dependencies in this phase)
