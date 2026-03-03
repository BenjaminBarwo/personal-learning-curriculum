# Phase 9: FSRS Data Layer - Research

**Researched:** 2026-03-02
**Domain:** FSRS spaced repetition algorithm — Supabase schema, ts-fsrs library, card seeding on lesson completion, server actions
**Confidence:** HIGH

---

## Summary

Phase 9 establishes the Supabase data layer for FSRS (Free Spaced Repetition Scheduler) — two new tables (`fsrs_cards` and `fsrs_review_logs`), auto-seeding of cards when a lesson is completed, and two server action functions (`submitFsrsReview()` and `getDueCardCount()`). The FSRS algorithm itself is provided by the `ts-fsrs` npm package (currently v5.x), which handles all scheduling math. The application is responsible only for persisting the resulting card state to Supabase and for seeding initial card rows from `quiz_questions` when a lesson is marked complete.

The project's existing `markLessonComplete()` server action in `src/lib/actions/progress.ts` is the correct hook point for card seeding. After writing the `progress` row to Supabase, that same action must query `quiz_questions` for the lesson and upsert one `fsrs_cards` row per question (skipping any that already exist). This guarantees idempotent behavior — completing the same lesson twice does not duplicate cards. The project's established Supabase patterns (TEXT `user_id` for Clerk IDs, `current_setting('request.jwt.claims', true)::json->>'sub'` for RLS, separate SELECT/INSERT/UPDATE policies, index on `user_id`) must be strictly followed for both new tables.

Phase 10 depends on the server actions defined here (`submitFsrsReview`, `getDueCardCount`), so their function signatures and return shapes need to be stable and well-typed before Phase 10 begins.

**Primary recommendation:** Install `ts-fsrs` as a production dependency; add migration `00004_fsrs_tables.sql` with `fsrs_cards` and `fsrs_review_logs`; extend `markLessonComplete()` to seed cards; create `src/lib/actions/fsrs.ts` with `submitFsrsReview()` and `getDueCardCount()`.

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FSRS-01 | `review_cards` table (actually named `fsrs_cards` per roadmap) exists in Supabase with FSRS card state fields (due, stability, difficulty, state, reps, lapses) and RLS policies | Migration `00004_fsrs_tables.sql` adds `fsrs_cards` with all required fields plus `user_id TEXT`, `question_id UUID`, `lesson_id UUID`; RLS follows established project pattern |
| FSRS-02 | Review cards are auto-seeded from quiz questions when a lesson is completed | `markLessonComplete()` server action extended to upsert one `fsrs_cards` row per `quiz_questions` row for the completed lesson, using `createEmptyCard()` from ts-fsrs for initial state |

</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ts-fsrs` | ^5.2.3 (latest) | FSRS algorithm: scheduling math, card state transitions, ReviewLog generation | Official TypeScript FSRS implementation by open-spaced-repetition; maintained, ESM + CJS support |
| `@supabase/supabase-js` | ^2.98.0 (already installed) | Database client for card persistence | Already in project |
| `@clerk/nextjs/server` | ^6.39.0 (already installed) | `auth()` for userId in server actions | Already in project, established pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase CLI | ^2.76.15 (already installed as devDep) | `supabase migration new` to create migration file, `supabase db push` to apply | For creating the `00004_fsrs_tables.sql` migration |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ts-fsrs` | Hand-rolled FSRS implementation | FSRS-5 has 19 parameters and complex math; ts-fsrs is audited and tested; hand-rolling wastes time and introduces bugs |
| `ts-fsrs` | `@squeakyrobot/fsrs` | Smaller community, less maintained; ts-fsrs is the canonical TypeScript FSRS implementation |
| `ts-fsrs` | `@austinshelby/simple-ts-fsrs` | Simplified/minimal; lacks full FSRS-5 feature set; choose ts-fsrs for correctness |

**Installation:**
```bash
pnpm add ts-fsrs
```

No other new packages are needed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── actions/
│   │   ├── progress.ts          # Existing — extend markLessonComplete() to seed cards
│   │   └── fsrs.ts              # NEW — submitFsrsReview(), getDueCardCount()
│   └── supabase/
│       └── server.ts            # Unchanged — createAdminSupabaseClient() used for writes
├── types/
│   └── database.types.ts        # Add FsrsCard, FsrsReviewLog types manually
supabase/
└── migrations/
    └── 00004_fsrs_tables.sql    # NEW — fsrs_cards + fsrs_review_logs tables + RLS
```

### Pattern 1: Database Schema

**What:** Two new tables following the project's established user-data table conventions.
**Key constraints from codebase:**
- `user_id TEXT NOT NULL` — Clerk IDs are strings, not UUIDs (see migration 00001 comments)
- RLS uses `current_setting('request.jwt.claims', true)::json->>'sub'` — NOT `auth.uid()` (project-wide anti-pattern comment in migration 00001)
- Separate SELECT/INSERT/UPDATE policies — no `FOR ALL` policy
- Index on `user_id` and composite indexes on `(user_id, question_id)`

```sql
-- Migration: 00004_fsrs_tables.sql
-- Phase: 09-fsrs-data-layer

-- fsrs_cards: one row per (user, quiz_question) — holds current card state
CREATE TABLE fsrs_cards (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         TEXT        NOT NULL,               -- Clerk user ID (TEXT, not UUID)
  question_id     UUID        NOT NULL REFERENCES quiz_questions(id),
  lesson_id       UUID        NOT NULL REFERENCES lessons(id), -- denormalized for batch queries
  -- FSRS algorithm fields (match ts-fsrs Card interface exactly)
  due             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stability       DOUBLE PRECISION NOT NULL DEFAULT 0,
  difficulty      DOUBLE PRECISION NOT NULL DEFAULT 0,
  elapsed_days    INTEGER     NOT NULL DEFAULT 0,
  scheduled_days  INTEGER     NOT NULL DEFAULT 0,
  reps            INTEGER     NOT NULL DEFAULT 0,
  lapses          INTEGER     NOT NULL DEFAULT 0,
  state           INTEGER     NOT NULL DEFAULT 0,  -- 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, question_id)                      -- one card per user per question
);

-- fsrs_review_logs: append-only log of every review (matches ts-fsrs ReviewLog)
CREATE TABLE fsrs_review_logs (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         TEXT        NOT NULL,
  card_id         UUID        NOT NULL REFERENCES fsrs_cards(id),
  question_id     UUID        NOT NULL REFERENCES quiz_questions(id), -- denormalized
  -- ts-fsrs ReviewLog fields
  rating          INTEGER     NOT NULL,    -- 1=Again, 2=Hard, 3=Good, 4=Easy
  state           INTEGER     NOT NULL,    -- card state BEFORE this review
  due             TIMESTAMPTZ NOT NULL,    -- when card was due BEFORE this review
  stability       DOUBLE PRECISION NOT NULL,
  difficulty      DOUBLE PRECISION NOT NULL,
  elapsed_days    INTEGER     NOT NULL,
  last_elapsed_days INTEGER   NOT NULL,
  scheduled_days  INTEGER     NOT NULL,
  review          TIMESTAMPTZ NOT NULL,   -- timestamp of this review
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
  -- NO updated_at — append-only (immutable audit log like quiz_attempts)
);
```

### Pattern 2: Card Seeding on Lesson Completion

**What:** Extend the existing `markLessonComplete()` server action to upsert FSRS cards.
**When to use:** This is the only code path where cards are created. No background jobs, no triggers.
**Why upsert not insert:** Idempotent — marking the same lesson complete twice must not create duplicate cards.

```typescript
// src/lib/actions/progress.ts
// Source: extended from existing pattern in codebase
'use server'

import { createEmptyCard } from 'ts-fsrs'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

export async function markLessonComplete(lessonId: string): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: 'Unauthorized' }

  const supabase = createAdminSupabaseClient()

  // 1. Update progress table (existing logic — unchanged)
  const { error: progressError } = await supabase
    .from('progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        status: 'completed' as const,
        completed_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    )

  if (progressError) {
    console.error('Failed to mark lesson complete:', progressError)
    return { success: false, error: 'Could not save progress. Please try again.' }
  }

  // 2. Seed FSRS cards for all quiz questions in this lesson (NEW)
  const { data: questions, error: questionError } = await supabase
    .from('quiz_questions')
    .select('id')
    .eq('lesson_id', lessonId)
    .is('deleted_at', null)

  if (questionError) {
    console.error('Failed to fetch quiz questions for FSRS seeding:', questionError)
    // Non-fatal: progress was saved; FSRS seeding failure should not block the user
    return { success: true }
  }

  if (questions && questions.length > 0) {
    const now = new Date()
    const emptyCard = createEmptyCard(now)
    const cardRows = questions.map((q) => ({
      user_id: userId,
      question_id: q.id,
      lesson_id: lessonId,
      due: emptyCard.due.toISOString(),
      stability: emptyCard.stability,
      difficulty: emptyCard.difficulty,
      elapsed_days: emptyCard.elapsed_days,
      scheduled_days: emptyCard.scheduled_days,
      reps: emptyCard.reps,
      lapses: emptyCard.lapses,
      state: emptyCard.state,  // State.New = 0
      last_review: null,
    }))

    const { error: cardError } = await supabase
      .from('fsrs_cards')
      .upsert(cardRows, { onConflict: 'user_id,question_id', ignoreDuplicates: true })

    if (cardError) {
      console.error('Failed to seed FSRS cards:', cardError)
      // Non-fatal: log but do not surface to user
    }
  }

  return { success: true }
}
```

### Pattern 3: Submit FSRS Review (Server Action)

**What:** Apply a rating to a card, compute next scheduling, persist updated card state + log row.
**When to use:** Called from Phase 10 review UI when user rates a card.

```typescript
// src/lib/actions/fsrs.ts
// Source: ts-fsrs API verified via CDN type definitions + DeepWiki docs
'use server'

import { fsrs, Rating, createEmptyCard } from 'ts-fsrs'
import type { Grade } from 'ts-fsrs'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

const f = fsrs() // default FSRS-5 parameters

export async function submitFsrsReview(params: {
  cardId: string
  rating: 1 | 2 | 3 | 4  // Again=1, Hard=2, Good=3, Easy=4
}): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: 'Unauthorized' }

  const supabase = createAdminSupabaseClient()

  // Fetch current card state
  const { data: card, error: fetchError } = await supabase
    .from('fsrs_cards')
    .select('*')
    .eq('id', params.cardId)
    .eq('user_id', userId)
    .single()

  if (fetchError || !card) {
    return { success: false, error: 'Card not found' }
  }

  // Reconstruct ts-fsrs Card from DB row
  const fsrsCard = {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  }

  const now = new Date()
  const grade = params.rating as Grade
  const { card: nextCard, log } = f.next(fsrsCard, now, grade)

  // Update card state
  const { error: updateError } = await supabase
    .from('fsrs_cards')
    .update({
      due: nextCard.due.toISOString(),
      stability: nextCard.stability,
      difficulty: nextCard.difficulty,
      elapsed_days: nextCard.elapsed_days,
      scheduled_days: nextCard.scheduled_days,
      reps: nextCard.reps,
      lapses: nextCard.lapses,
      state: nextCard.state,
      last_review: now.toISOString(),
    })
    .eq('id', params.cardId)
    .eq('user_id', userId)

  if (updateError) {
    console.error('Failed to update FSRS card:', updateError)
    return { success: false, error: 'Could not save review. Please try again.' }
  }

  // Append review log
  const { error: logError } = await supabase
    .from('fsrs_review_logs')
    .insert({
      user_id: userId,
      card_id: params.cardId,
      question_id: card.question_id,
      rating: log.rating,
      state: log.state,
      due: log.due.toISOString(),
      stability: log.stability,
      difficulty: log.difficulty,
      elapsed_days: log.elapsed_days,
      last_elapsed_days: log.last_elapsed_days,
      scheduled_days: log.scheduled_days,
      review: log.review.toISOString(),
    })

  if (logError) {
    console.error('Failed to insert FSRS review log:', logError)
    // Non-fatal: card was updated; log insertion failure should not block the user
  }

  return { success: true }
}

export async function getDueCardCount(): Promise<number> {
  const { userId } = await auth()
  if (!userId) return 0

  const supabase = createAdminSupabaseClient()

  const { count, error } = await supabase
    .from('fsrs_cards')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .lte('due', new Date().toISOString())

  if (error) {
    console.error('Failed to get due card count:', error)
    return 0
  }

  return count ?? 0
}
```

### Pattern 4: RLS Policies (must follow project pattern exactly)

**What:** Row-level security for new tables, following the Clerk JWT `sub` claim pattern.
**Critical:** The project uses `current_setting('request.jwt.claims', true)::json->>'sub'` NOT `auth.uid()`. See migration 00001 comment: "auth.uid() returns NULL with Clerk".

```sql
-- Indexes (CRITICAL for RLS performance — project anti-pattern says 100x+ impact)
CREATE INDEX idx_fsrs_cards_user_id ON fsrs_cards(user_id);
CREATE INDEX idx_fsrs_cards_user_question ON fsrs_cards(user_id, question_id);
CREATE INDEX idx_fsrs_cards_user_due ON fsrs_cards(user_id, due);   -- for getDueCardCount
CREATE INDEX idx_fsrs_review_logs_user_id ON fsrs_review_logs(user_id);
CREATE INDEX idx_fsrs_review_logs_card_id ON fsrs_review_logs(card_id);

-- Enable RLS
ALTER TABLE fsrs_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsrs_review_logs ENABLE ROW LEVEL SECURITY;

-- fsrs_cards policies
CREATE POLICY "Users can view own fsrs cards"
  ON fsrs_cards FOR SELECT
  USING (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can insert own fsrs cards"
  ON fsrs_cards FOR INSERT
  WITH CHECK (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can update own fsrs cards"
  ON fsrs_cards FOR UPDATE
  USING (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'))
  WITH CHECK (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));

-- fsrs_review_logs policies (no UPDATE/DELETE — append-only)
CREATE POLICY "Users can view own fsrs review logs"
  ON fsrs_review_logs FOR SELECT
  USING (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can insert own fsrs review logs"
  ON fsrs_review_logs FOR INSERT
  WITH CHECK (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));
```

### Anti-Patterns to Avoid

- **Using `auth.uid()` in RLS policies:** Returns NULL with Clerk JWTs. Use `current_setting('request.jwt.claims', true)::json->>'sub'` exclusively. This is documented in migration 00001 as a project-wide anti-pattern to avoid.
- **UUID type for `user_id`:** Clerk user IDs are strings (e.g., `"user_2abc..."`). The project stores them as TEXT everywhere.
- **Making FSRS card seeding fatal to lesson completion:** If `quiz_questions` fetch or card upsert fails, the user has already been marked as complete. Log the error but return `{ success: true }` so the UI is not blocked.
- **Using `insert` instead of `upsert` for card seeding:** Marking the same lesson complete twice would create duplicate rows. Use `upsert` with `onConflict: 'user_id,question_id'` and `ignoreDuplicates: true`.
- **Storing `state` as an enum text column:** Store as INTEGER (0–3) matching the ts-fsrs `State` enum. Avoids enum sync issues between TypeScript and Postgres.
- **Storing `rating` as text:** Store as INTEGER (1–4) matching the ts-fsrs `Rating` enum. Again avoids sync issues.
- **Not indexing `(user_id, due)`:** `getDueCardCount()` filters on both columns. Without this composite index, the query scans all user rows.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FSRS scheduling math | Custom implementation of FSRS-5 intervals | `ts-fsrs` | FSRS-5 has 19 optimized parameters, complex stability/retrievability formulas; ts-fsrs is the canonical, tested TypeScript implementation |
| "Due today" count | Custom date comparison logic | `.lte('due', now.toISOString())` Supabase query | Supabase handles this with a single indexed query; no application-level iteration needed |
| Card state enum mapping | Custom enum type in Postgres | INTEGER column matching ts-fsrs State enum | Postgres enum types require migration to change; integers are simpler and always in sync |
| Review log writing | Custom audit trail logic | `fsrs_review_logs` table with INSERT | ts-fsrs produces a `ReviewLog` object with all fields pre-computed; just INSERT it |

**Key insight:** ts-fsrs computes everything — the next card state AND the log entry — in a single `f.next(card, now, rating)` call. The application's only job is to persist the results.

---

## Common Pitfalls

### Pitfall 1: `state` Field Integer vs Enum

**What goes wrong:** Postgres ENUM types for `state` (New/Learning/Review/Relearning) require ALTER TABLE migrations to add new values, and require explicit casting in queries.

**Why it happens:** Developers model enum values as DB enums thinking it's "cleaner."

**How to avoid:** Store `state` and `rating` as `INTEGER NOT NULL`. The values are stable (FSRS-5 has 4 states, 4 ratings) and match the ts-fsrs numeric enums directly.

**Warning signs:** Type errors when inserting `card.state` (which is a number) into a Postgres enum column.

---

### Pitfall 2: FSRS Card Seeding Blocks Lesson Completion

**What goes wrong:** If the quiz_questions fetch or card upsert fails, the server action returns `{ success: false }`, which causes the `MarkCompleteButton` to show an error to the user — even though the lesson progress was already saved.

**Why it happens:** Treating the FSRS seeding step as equally critical as the progress write.

**How to avoid:** Structure `markLessonComplete()` to treat FSRS seeding as non-fatal. Log errors but always return `{ success: true }` after the progress write succeeds. FSRS cards can be re-seeded if missing when the review page loads.

**Warning signs:** User sees "Could not save progress" when the quiz-question query fails, even though their progress row was written.

---

### Pitfall 3: Missing `updated_at` Trigger on `fsrs_cards`

**What goes wrong:** `fsrs_cards` has an `updated_at` column (needed to track when state was last updated) but no trigger to auto-update it.

**Why it happens:** Forgetting to add the trigger after adding the column.

**How to avoid:** Add `CREATE TRIGGER trg_fsrs_cards_updated_at BEFORE UPDATE ON fsrs_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at();` in the migration. The `update_updated_at()` function is already defined in migration 00001 — no need to recreate it.

**Warning signs:** `updated_at` stays at the original insertion timestamp even after reviews.

---

### Pitfall 4: `ignoreDuplicates` vs Actual Upsert

**What goes wrong:** Using `ignoreDuplicates: true` on the card upsert means existing cards with different state are not overwritten — which is correct for seeding (don't reset a card that's already been reviewed), but could cause confusion.

**Why it happens:** Conflating "seed on first completion" with "reset card on re-completion."

**How to avoid:** This is intentional behavior. Once a card exists (even if reviewed), re-completing the lesson should not reset it. `ignoreDuplicates: true` is the correct choice for seeding.

**Warning signs:** A card that was rated "Easy" gets reset to `New` state when the user re-views the lesson.

---

### Pitfall 5: Admin Client vs RLS Client for Card Writes

**What goes wrong:** Using `createServerSupabaseClient()` (the Clerk-JWT-authenticated client) for card writes — this client goes through RLS. Since RLS uses the JWT sub claim, it should work, but the admin client (`createAdminSupabaseClient()`) is the established project pattern for writes and bypasses RLS overhead.

**Why it happens:** Confusion between the two client types in the project.

**How to avoid:** Match the existing `markLessonComplete()` pattern — use `createAdminSupabaseClient()` for all writes in server actions. The project comment on `createAdminSupabaseClient()` says "NEVER import in 'use client' file" — follow this. Server action files (`'use server'`) are safe.

---

### Pitfall 6: `getDueCardCount` Performance Without Index

**What goes wrong:** `getDueCardCount()` filters `WHERE user_id = $1 AND due <= NOW()`. Without `idx_fsrs_cards_user_due`, Postgres performs a sequential scan of all the user's cards, not a range scan.

**Why it happens:** Not adding the composite `(user_id, due)` index.

**How to avoid:** Add `CREATE INDEX idx_fsrs_cards_user_due ON fsrs_cards(user_id, due);` in the migration.

---

## Code Examples

Verified patterns from official sources:

### ts-fsrs: Create Empty Card for Seeding
```typescript
// Source: ts-fsrs CDN type definitions (cdn.jsdelivr.net/npm/ts-fsrs@4.7.1/dist/index.d.ts)
//         DeepWiki ts-fsrs documentation
import { createEmptyCard } from 'ts-fsrs'

const now = new Date()
const emptyCard = createEmptyCard(now)
// emptyCard.state === 0  (State.New)
// emptyCard.stability === 0
// emptyCard.difficulty === 0
// emptyCard.reps === 0
// emptyCard.lapses === 0
// emptyCard.due === now
```

### ts-fsrs: Apply Rating and Get Next State
```typescript
// Source: ts-fsrs CDN type definitions, DeepWiki API docs
import { fsrs, Rating } from 'ts-fsrs'
import type { Grade } from 'ts-fsrs'

const f = fsrs() // FSRS-5 default parameters

// currentCard is reconstructed from DB row (see Pattern 3 above)
const now = new Date()
const grade: Grade = Rating.Good  // or Again(1), Hard(2), Good(3), Easy(4)
const { card: nextCard, log } = f.next(currentCard, now, grade)

// nextCard has updated: due, stability, difficulty, reps, lapses, state, elapsed_days, scheduled_days
// log has: rating, state (before), due (before), stability, difficulty, elapsed_days,
//          last_elapsed_days, scheduled_days, review (timestamp)
```

### Supabase: Upsert Cards with ignoreDuplicates
```typescript
// Source: @supabase/supabase-js docs — existing project patterns
const { error } = await supabase
  .from('fsrs_cards')
  .upsert(cardRows, { onConflict: 'user_id,question_id', ignoreDuplicates: true })
```

### Supabase: Get Due Card Count
```typescript
// Source: @supabase/supabase-js docs
const { count, error } = await supabase
  .from('fsrs_cards')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .lte('due', new Date().toISOString())

return count ?? 0
```

### TypeScript Types to Add to `database.types.ts`
```typescript
// Add to src/types/database.types.ts

export type FsrsCardState = 0 | 1 | 2 | 3  // New, Learning, Review, Relearning
export type FsrsRating = 1 | 2 | 3 | 4     // Again, Hard, Good, Easy

// In Database['public']['Tables']:
fsrs_cards: {
  Row: {
    id: string
    user_id: string
    question_id: string
    lesson_id: string
    due: string
    stability: number
    difficulty: number
    elapsed_days: number
    scheduled_days: number
    reps: number
    lapses: number
    state: FsrsCardState
    last_review: string | null
    created_at: string
    updated_at: string
  }
  Insert: { /* all fields optional except user_id, question_id, lesson_id */ }
  Update: { /* all fields optional */ }
}

fsrs_review_logs: {
  Row: {
    id: string
    user_id: string
    card_id: string
    question_id: string
    rating: FsrsRating
    state: FsrsCardState
    due: string
    stability: number
    difficulty: number
    elapsed_days: number
    last_elapsed_days: number
    scheduled_days: number
    review: string
    created_at: string
  }
  Insert: { /* user_id, card_id, question_id, rating, state, due, stability, difficulty,
               elapsed_days, last_elapsed_days, scheduled_days, review required */ }
  Update: never  // append-only
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SM-2 algorithm | FSRS-5 | 2024 | FSRS-5 is strictly superior — the project has explicitly out-of-scoped SM-2 fallback |
| JWT template for Clerk + Supabase | Native `accessToken` on Supabase client | April 2025 | Already in project; no change needed |
| `auth.uid()` in RLS | `current_setting('request.jwt.claims', true)::json->>'sub'` | Clerk+Supabase integration | Already documented in migration 00001; must follow for new tables |
| `ts-fsrs` v3 `repeat()` → iterate all ratings | `ts-fsrs` v4+ `next()` → single rating | ts-fsrs v4 | Use `next()` when grade is known (review UI context); use `repeat()` only to preview all options (Phase 10 interval hints) |

**Deprecated/outdated:**
- `ts-fsrs` v3 API: The `repeat()` method returns a `RecordLog` keyed by `Rating` enum. In v4+, `next()` is preferred when the user's rating is known. Both exist in current ts-fsrs v5 — `repeat()` is still valid and will be needed in Phase 10 to compute interval hints for all four rating buttons.
- SM-2 algorithm: Out of scope per REQUIREMENTS.md. Do not implement.

---

## Open Questions

1. **Does `markLessonComplete()` need to return which FSRS cards were seeded?**
   - What we know: Phase 10 (review UI) will need to navigate to `/review` after lesson completion; Phase 9 only needs to seed cards silently.
   - What's unclear: Whether the return value of `markLessonComplete()` should include a `cardsSeeded` count for Phase 10 to use.
   - Recommendation: Return `{ success: true }` only for now. Phase 10 can call `getDueCardCount()` separately if needed.

2. **Should `fsrs_cards` reference `lesson_id` or derive it via JOIN from `quiz_questions`?**
   - What we know: The existing `quiz_attempts` table denormalizes `lesson_id` for query performance — the project already documents this pattern ("denormalized for query performance").
   - Recommendation: Denormalize `lesson_id` directly on `fsrs_cards`, matching the `quiz_attempts` precedent. This makes the `getDueCardCount()` query faster and avoids a JOIN with `quiz_questions` when filtering cards by lesson.

3. **Should `getDueCardCount()` be exported from `fsrs.ts` or from `progress.ts`?**
   - What we know: The function only reads `fsrs_cards`. It has no dependency on progress data.
   - Recommendation: Place it in `src/lib/actions/fsrs.ts` alongside `submitFsrsReview()`. Keep concern separation clean.

4. **What is the exact ts-fsrs version to pin?**
   - What we know: Latest as of March 2026 is v5.2.3. The `Card` interface does NOT include `learning_steps` in v4.7.1 (the version verified from CDN types). The v5.x `learning_steps` field may have been added.
   - What's unclear: Whether v5 added `learning_steps` to the `Card` type and whether that field needs to be persisted to the DB.
   - Recommendation: Install the latest (`pnpm add ts-fsrs`) and inspect the installed types at `node_modules/ts-fsrs/dist/index.d.ts` as the first task. If `learning_steps` exists in the installed Card type, add it as an `INTEGER NOT NULL DEFAULT 0` column to the migration. Flag this in the plan.

---

## Sources

### Primary (HIGH confidence)
- [ts-fsrs CDN type definitions (v4.7.1)](https://cdn.jsdelivr.net/npm/ts-fsrs@4.7.1/dist/index.d.ts) — verified Card interface, State enum, Rating enum, createEmptyCard, fsrs().next() API
- [ts-fsrs DeepWiki documentation](https://deepwiki.com/open-spaced-repetition/ts-fsrs/4.2-card-creation-and-management) — Card lifecycle, createEmptyCard, next() method description
- Codebase inspection — migration 00001 (RLS pattern, user_id TEXT, no auth.uid()), database.types.ts, progress.ts (markLessonComplete pattern, quiz_attempts denormalization precedent), MarkCompleteButton (hook point for seeding), supabase/server.ts (admin client usage)

### Secondary (MEDIUM confidence)
- [ts-fsrs GitHub README](https://github.com/open-spaced-repetition/ts-fsrs) — general API overview, version history, Node.js requirements
- [ts-fsrs npm page](https://www.npmjs.com/package/ts-fsrs) — version 5.2.3 confirmed as latest
- WebSearch results for ts-fsrs Card interface fields (cross-verified against CDN types) — confirmed `elapsed_days`, `scheduled_days`, `last_review`, `reps`, `lapses`, `state`
- WebSearch results for ReviewLog interface fields — confirmed `rating`, `state`, `due`, `stability`, `difficulty`, `elapsed_days`, `last_elapsed_days`, `scheduled_days`, `review`

### Tertiary (LOW confidence)
- [ts-fsrs v5 `learning_steps` field](https://x.com/JarrettYe/status/1816772530172297690) — mentioned in tweets about short-term learning step support; exact field name and schema impact unverified against installed types. Flag for validation in Wave 0.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — ts-fsrs is the canonical TS FSRS implementation; version and API verified against CDN published types
- Architecture: HIGH — migration pattern, RLS pattern, server action pattern all derived directly from existing codebase; FSRS seeding extension of existing `markLessonComplete()` is straightforward
- Pitfalls: HIGH — most pitfalls identified directly from codebase inspection (existing patterns that must be matched); one MEDIUM (Pitfall 2: non-fatal seeding — logical reasoning, not an official source)

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (ts-fsrs is actively maintained; verify installed version's Card type before writing migration; Supabase and Clerk patterns are stable)
