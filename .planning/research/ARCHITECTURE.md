# Architecture Research

**Domain:** Personal learning curriculum platform — v2.0 integration patterns
**Researched:** 2026-03-02
**Confidence:** HIGH (based on actual codebase inspection + official docs)

---

> This document supersedes the v1.0 architecture research written on 2026-02-27.
> Focus: how the three new v2.0 features (content generation CLI, FSRS, Clerk auth) attach to the existing architecture. Only integration points are documented here. The existing v1.0 patterns (lesson rendering pipeline, quiz engine, progress tracking, MDX component map) are stable and unchanged.

---

## Existing Architecture — Confirmed State

Before documenting integrations, this is what actually shipped in v1.0 (verified against src/). These facts constrain all integration decisions:

**Actual route structure (no route groups used — flat routes):**
```
app/
├── layout.tsx                              # Root: ClerkProvider, ThemeProvider, BreadcrumbProvider, Header
├── page.tsx                                # Dashboard (force-dynamic)
├── not-found.tsx
├── error.tsx
└── pillars/[pillarSlug]/
    ├── page.tsx
    └── semesters/[semesterSlug]/
        ├── page.tsx
        └── courses/[courseSlug]/
            ├── page.tsx
            └── lessons/[lessonSlug]/
                └── page.tsx
```

**Middleware (current — no route protection active):**
```typescript
// middleware.ts — currently bare: no routes protected
import { clerkMiddleware } from '@clerk/nextjs/server'
export default clerkMiddleware()
```

**Auth pattern (current — hardcoded user, no real auth gate):**
```typescript
// constants/user.ts
export const HARDCODED_USER_ID = 'user_3AGlLR1a07HdOR8G8mECoqPUUfd'

// All server actions use HARDCODED_USER_ID, not auth()
// lib/actions/progress.ts uses createAdminSupabaseClient() + HARDCODED_USER_ID
```

**Supabase client pattern (actual):**
```typescript
// lib/supabase/server.ts
export async function createServerSupabaseClient()   // Clerk JWT via accessToken callback
export function createAdminSupabaseClient()          // Service role key — bypasses RLS
// All mutations currently use createAdminSupabaseClient() + HARDCODED_USER_ID
// All reads use createServerSupabaseClient() (anon key + Clerk JWT)
```

**Quiz engine integration point:**
```
Quiz.tsx (client) → QuizProvider context → persistQuizAttempt() server action
→ createAdminSupabaseClient() → quiz_attempts table
quiz_attempts: (user_id, question_id, lesson_id, selected_answer, correct_answer, is_correct, time_spent_seconds, attempt_number)
```

**Database schema (11 tables, deployed):**
- Content: `pillars`, `semesters`, `courses`, `lessons`, `lesson_versions`, `quiz_questions`, `vocabulary`, `lesson_vocabulary`, `lesson_connections`
- User data: `progress`, `quiz_attempts`
- No FSRS tables exist yet

---

## System Overview — v2.0

```
┌──────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL (CLI, out of Next.js)                  │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  Content Generation CLI (Node.js, standalone)                 │   │
│  │  Orchestrator → Research sub-agents → MDX writer agent        │   │
│  │  → validateMDX() → Supabase admin client → lessons table      │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
          ↓ writes MDX rows directly to Supabase
┌──────────────────────────────────────────────────────────────────────┐
│                    Next.js App (existing + new)                       │
│                                                                        │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐  │
│  │  middleware.ts │  │  /sign-in page │  │  /review page (NEW)    │  │
│  │  (MODIFIED)    │  │  (NEW)         │  │  Flashcard review flow  │  │
│  │  clerkMiddlew  │  │  <SignIn />     │  │  FSRS rating UI        │  │
│  │  + route guard │  │  Clerk comp    │  │                        │  │
│  └────────────────┘  └────────────────┘  └────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Dashboard (page.tsx — MODIFIED)                                │  │
│  │  + FSRS widget: "X cards due today" → link to /review           │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Existing lesson flow (unchanged)                               │  │
│  │  LessonPage → MDXRemote → Quiz → persistQuizAttempt()          │  │
│  │  quiz_attempts written → FSRS scheduler reads these later       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Supabase                                                       │  │
│  │  Existing: 11 tables + 6 views + RLS                           │  │
│  │  New (FSRS): fsrs_cards, fsrs_review_logs (2 new tables)       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Feature 1: Clerk Sign-In UI + Protected Routes

### What Exists vs What Changes

**Existing (unchanged):**
- `ClerkProvider` wraps the root layout — Clerk is already installed and configured
- `createServerSupabaseClient()` already injects Clerk JWT via `accessToken` callback
- RLS policies already use `current_setting('request.jwt.claims', true)::json->>'sub'`
- `HARDCODED_USER_ID` exists as a bridge constant

**What needs to change:**

**1. `middleware.ts` — add route protection**

Current middleware does nothing. Replace with route-protecting middleware:

```typescript
// src/middleware.ts (MODIFIED)
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

**2. `app/sign-in/[[...sign-in]]/page.tsx` — new file**

Clerk uses the optional catch-all route pattern:

```typescript
// src/app/sign-in/[[...sign-in]]/page.tsx (NEW)
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <SignIn />
    </div>
  )
}
```

**3. Environment variables — add to `.env.local` and Vercel**

```bash
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

**4. Server actions — replace `HARDCODED_USER_ID` with `auth()`**

All server actions currently use `HARDCODED_USER_ID`. Once auth is wired, replace with dynamic user ID:

```typescript
// src/lib/actions/progress.ts (MODIFIED)
'use server'
import { auth } from '@clerk/nextjs/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function markLessonComplete(lessonId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthenticated')   // middleware already blocks, but be explicit

  const supabase = createAdminSupabaseClient()
  // ... rest unchanged, replace HARDCODED_USER_ID with userId
}
```

**5. Data-fetching pages — replace `HARDCODED_USER_ID` with `auth()`**

`app/page.tsx` (dashboard) and all pages that pass `HARDCODED_USER_ID` to progress queries must call `await auth()` instead. The `getLessonProgressForScope()` and `getContinueLesson()` functions already accept `userId` as a parameter — no signature change needed, only the call site.

### Integration Points: Clerk Auth

| Touch Point | Type | Change Required |
|-------------|------|-----------------|
| `src/middleware.ts` | MODIFY | Add `createRouteMatcher` + `auth.protect()` |
| `src/app/sign-in/[[...sign-in]]/page.tsx` | NEW | Clerk `<SignIn />` component |
| `src/constants/user.ts` | DELETE or KEEP | Remove `HARDCODED_USER_ID` import sites when auth is wired; keep file with a comment |
| `src/lib/actions/progress.ts` | MODIFY | Replace `HARDCODED_USER_ID` with `await auth()` |
| `src/app/page.tsx` | MODIFY | Replace `HARDCODED_USER_ID` with `await auth()` |
| `src/app/pillars/.../lessons/.../page.tsx` | MODIFY | Replace `HARDCODED_USER_ID` with `await auth()` |
| `.env.local` + Vercel env vars | MODIFY | Add three Clerk redirect env vars |

### Data Flow: Auth

```
Browser requests /pillars/[pillarSlug]/...
    ↓
middleware.ts — clerkMiddleware() validates Clerk session JWT
    - isPublicRoute(req)? No → auth.protect()
    - Unauthenticated → redirect to /sign-in
    - Authenticated → request proceeds
    ↓
Server Component (page.tsx)
    const { userId } = await auth()   // Clerk server helper
    userId passed to progress queries + admin client mutations
    ↓
createAdminSupabaseClient() — service role, bypasses RLS
    All mutations (.from('progress').upsert({ user_id: userId, ... }))
```

---

## Feature 2: FSRS Spaced Repetition

### Schema Design (New Tables)

FSRS requires storing per-card state (one card = one quiz question, per user). Two new tables:

```sql
-- Migration: 00004_fsrs_tables.sql

-- fsrs_cards: current FSRS state for each (user, question) pair
-- One row per user per quiz question. Created on first review.
CREATE TABLE fsrs_cards (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         TEXT        NOT NULL,           -- Clerk user ID
  question_id     UUID        NOT NULL REFERENCES quiz_questions(id),
  -- ts-fsrs Card fields (mirrors Card type from ts-fsrs library)
  due             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stability       FLOAT       NOT NULL DEFAULT 0,
  difficulty      FLOAT       NOT NULL DEFAULT 0,
  elapsed_days    INTEGER     NOT NULL DEFAULT 0,
  scheduled_days  INTEGER     NOT NULL DEFAULT 0,
  reps            INTEGER     NOT NULL DEFAULT 0,
  lapses          INTEGER     NOT NULL DEFAULT 0,
  state           TEXT        NOT NULL DEFAULT 'New'
                              CHECK (state IN ('New', 'Learning', 'Review', 'Relearning')),
  last_review     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, question_id)   -- one card per user per question
);

-- fsrs_review_logs: immutable log of every review rating
-- Required for FSRS parameter optimization (ts-fsrs optimizer)
CREATE TABLE fsrs_review_logs (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         TEXT        NOT NULL,
  question_id     UUID        NOT NULL REFERENCES quiz_questions(id),
  rating          TEXT        NOT NULL CHECK (rating IN ('Again', 'Hard', 'Good', 'Easy')),
  state           TEXT        NOT NULL,           -- Card state before this review
  due             TIMESTAMPTZ NOT NULL,           -- When card was due
  stability       FLOAT       NOT NULL,
  difficulty      FLOAT       NOT NULL,
  elapsed_days    INTEGER     NOT NULL,
  scheduled_days  INTEGER     NOT NULL,
  review          TIMESTAMPTZ NOT NULL,           -- When review happened
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
  -- NO updated_at — append-only like quiz_attempts
);

-- Indexes
CREATE INDEX idx_fsrs_cards_user_id ON fsrs_cards(user_id);
CREATE INDEX idx_fsrs_cards_user_due ON fsrs_cards(user_id, due);  -- critical for "due today" query
CREATE INDEX idx_fsrs_review_logs_user_id ON fsrs_review_logs(user_id);

-- Updated_at trigger for fsrs_cards (updates on every review)
CREATE TRIGGER trg_fsrs_cards_updated_at
  BEFORE UPDATE ON fsrs_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE fsrs_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsrs_review_logs ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can view own fsrs review logs"
  ON fsrs_review_logs FOR SELECT
  USING (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can insert own fsrs review logs"
  ON fsrs_review_logs FOR INSERT
  WITH CHECK (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));
```

### FSRS Library Integration: ts-fsrs

The TypeScript FSRS implementation is `ts-fsrs` (npm package, actively maintained as of 2026, ES module + CommonJS support).

**Core API:**
```typescript
import { createEmptyCard, fsrs, Rating, type Card, type ReviewLog } from 'ts-fsrs'

// Create a new card for a question the user has never reviewed
const newCard: Card = createEmptyCard()

// Schedule next review after user rates 'Good'
const f = fsrs()
const scheduling = f.repeat(newCard, new Date())
const result = scheduling[Rating.Good]   // { card: Card, log: ReviewLog }

// result.card = updated Card to save back to fsrs_cards
// result.log  = ReviewLog to save to fsrs_review_logs
```

**Card type maps directly to `fsrs_cards` columns.** The ts-fsrs `Card` type and `ReviewLog` type match the schema columns defined above field-for-field.

### FSRS Server Actions

```typescript
// src/lib/actions/fsrs.ts (NEW)
'use server'
import { auth } from '@clerk/nextjs/server'
import { fsrs, createEmptyCard, Rating, type Rating as RatingType } from 'ts-fsrs'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function submitFsrsReview(questionId: string, rating: RatingType) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthenticated')

  const supabase = createAdminSupabaseClient()
  const f = fsrs()
  const now = new Date()

  // 1. Fetch or create the card for this (user, question) pair
  const { data: existing } = await supabase
    .from('fsrs_cards')
    .select('*')
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .maybeSingle()

  const currentCard = existing
    ? mapRowToCard(existing)
    : createEmptyCard(now)

  // 2. Schedule — get result for user's chosen rating
  const scheduling = f.repeat(currentCard, now)
  const { card: nextCard, log: reviewLog } = scheduling[rating]

  // 3. Upsert the updated card state
  await supabase.from('fsrs_cards').upsert(
    { user_id: userId, question_id: questionId, ...mapCardToRow(nextCard) },
    { onConflict: 'user_id,question_id' }
  )

  // 4. Append review log
  await supabase.from('fsrs_review_logs').insert({
    user_id: userId,
    question_id: questionId,
    rating: Rating[rating],
    ...mapReviewLogToRow(reviewLog),
  })
}

export async function getDueCardCount(userId: string): Promise<number> {
  const supabase = createAdminSupabaseClient()
  const { count } = await supabase
    .from('fsrs_cards')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .lte('due', new Date().toISOString())
  return count ?? 0
}

export async function getDueCards(userId: string) {
  const supabase = createAdminSupabaseClient()
  const { data } = await supabase
    .from('fsrs_cards')
    .select(`
      id,
      question_id,
      due,
      state,
      quiz_questions (
        question_text,
        question_type,
        correct_answer,
        explanation,
        options,
        accepted_answers,
        lesson_id
      )
    `)
    .eq('user_id', userId)
    .lte('due', new Date().toISOString())
    .order('due', { ascending: true })
    .limit(50)
  return data ?? []
}
```

### Seeding FSRS Cards from Quiz History

The `quiz_attempts` table already has every quiz answer from v1.0. FSRS needs to be bootstrapped from this history rather than starting from zero. A one-time seeding script converts quiz history into initial FSRS card states:

```typescript
// scripts/seed-fsrs-from-history.ts (NEW — CLI script, not Next.js)
// Run once: npx tsx scripts/seed-fsrs-from-history.ts
import { createAdminSupabaseClient } from '../src/lib/supabase/server'
import { fsrs, createEmptyCard, Rating } from 'ts-fsrs'

// Fetch all quiz_attempts ordered by created_at (chronological)
// For each unique (user_id, question_id), replay answers through FSRS
// Insert resulting Card state into fsrs_cards
```

### FSRS Dashboard Widget (Modified Page)

The dashboard page (`app/page.tsx`) is a Server Component. Add the due count query and render a widget:

```typescript
// app/page.tsx (MODIFIED — add to existing fetch block)
const { userId } = await auth()
const dueCount = await getDueCardCount(userId)

// In JSX — add above pillar grid:
{dueCount > 0 && (
  <Link href="/review">
    <div className="rounded-xl p-5 bg-surface-card border border-border-subtle">
      <p className="text-lg font-semibold">{dueCount} cards due for review</p>
      <p className="text-sm text-text-secondary mt-1">Strengthen your retention</p>
    </div>
  </Link>
)}
```

### FSRS Review Page (New Route)

```
app/review/
├── page.tsx        # Server: fetch due cards, pass to client
└── loading.tsx     # Skeleton while cards load
```

**Data flow for review page:**
```
/review
  ↓
page.tsx (Server Component)
  - const { userId } = await auth()
  - const dueCards = await getDueCards(userId)  — fetches from fsrs_cards + quiz_questions join
  - passes dueCards to <ReviewSession cards={dueCards} />
  ↓
ReviewSession (Client Component)
  - Manages flashcard state: currentIndex, showAnswer toggle
  - On rating click (Again/Hard/Good/Easy):
    → calls submitFsrsReview(questionId, rating) server action
    → advances to next card
  - On completion: shows summary and link back to dashboard
```

### Integration Points: FSRS

| Touch Point | Type | Change Required |
|-------------|------|-----------------|
| Supabase migration `00004_fsrs_tables.sql` | NEW | `fsrs_cards` + `fsrs_review_logs` tables + RLS + indexes |
| `src/types/database.types.ts` | MODIFY | Add `fsrs_cards` and `fsrs_review_logs` table types |
| `src/lib/actions/fsrs.ts` | NEW | `submitFsrsReview()`, `getDueCardCount()`, `getDueCards()` |
| `src/app/review/page.tsx` | NEW | Server Component — fetch due cards, render client review session |
| `src/components/fsrs/ReviewSession.tsx` | NEW | Client Component — flashcard UI with rating buttons |
| `src/app/page.tsx` | MODIFY | Add due count query + widget UI |
| `scripts/seed-fsrs-from-history.ts` | NEW | One-time CLI script to bootstrap FSRS from quiz history |
| `package.json` | MODIFY | Add `ts-fsrs` dependency |

---

## Feature 3: Content Generation CLI Pipeline

### Architecture: Standalone CLI (not a Next.js route)

The content generation pipeline is a **standalone Node.js CLI tool**, not a Next.js API route or server action. This is the correct design because:
- Generation takes 30-120 seconds per lesson (Claude API + sub-agent research)
- It is triggered manually by the platform author, not by users
- It uses the same Supabase admin client the Next.js app uses, just from a Node.js process
- No HTTP server, no streaming to a browser — just a script that writes to Supabase

```
scripts/
├── generate-lesson.ts       # CLI entry point: npx tsx scripts/generate-lesson.ts
├── agents/
│   ├── orchestrator.ts      # Coordinates research → MDX → seed flow
│   ├── research-agent.ts    # Uses Claude API to research a topic deeply
│   └── writer-agent.ts      # Uses Claude API to write MDX from research notes
├── lib/
│   ├── claude-client.ts     # Configured @anthropic-ai/sdk client
│   ├── validate-mdx.ts      # Validates MDX compiles before DB insert
│   └── seed-lesson.ts       # Supabase upsert with versioning trigger
└── templates/
    └── lesson-prompt.ts     # System prompt and MDX structure template
```

### CLI Tool Internal Flow

```
npx tsx scripts/generate-lesson.ts --pillar 2 --course "distributed-systems" --lesson "cap-theorem"
    ↓
orchestrator.ts
  1. Resolve target lesson ID from Supabase (pillar → semester → course → lesson slug)
  2. Spawn research-agent: "Research CAP theorem thoroughly..."
     → Claude API (claude-opus-4-6, extended thinking if needed)
     → Returns structured research notes: key concepts, examples, misconceptions
  3. Pass research notes to writer-agent: "Write an MDX lesson from these notes..."
     → Claude API (claude-sonnet-4-6)
     → System prompt includes full lesson template (Hook → ConceptBlock → Quiz → DeepDive → Exercise → Takeaways)
     → Returns raw MDX string
  4. validateMDX(mdxString)
     → Attempts compileMDX on the generated MDX
     → If error: retry writer-agent with error as context (up to 3 attempts)
     → If valid: proceed
  5. seed-lesson.ts: upsert to Supabase
     → lessons table: UPDATE mdx_content, content_version++
     → lesson_versions table: INSERT new row (for rollback)
     → quiz_questions table: INSERT generated quiz questions
    ↓
Console output: "Lesson written: [lesson name] v[content_version]"
```

### Claude API Client Setup

```typescript
// scripts/lib/claude-client.ts (NEW)
import Anthropic from '@anthropic-ai/sdk'

export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Research agent: use opus for deep research quality
export async function researchTopic(topic: string, context: string): Promise<string> {
  const message = await claude.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: `Research this topic deeply for a lesson: ${topic}\nContext: ${context}`
      }
    ]
  })
  return message.content[0].type === 'text' ? message.content[0].text : ''
}

// Writer agent: use sonnet for MDX generation (faster, cheaper, still high quality)
export async function writeLessonMDX(research: string, lessonTitle: string): Promise<string> {
  const message = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16384,
    system: LESSON_WRITING_SYSTEM_PROMPT,   // Full MDX template instructions
    messages: [
      { role: 'user', content: `Write a lesson titled "${lessonTitle}" using these research notes:\n\n${research}` }
    ]
  })
  return message.content[0].type === 'text' ? message.content[0].text : ''
}
```

### MDX Validation Before DB Insert

The pipeline must validate generated MDX before storing it. Use the same `compileMDX` function the Next.js app uses, but called from Node.js context:

```typescript
// scripts/lib/validate-mdx.ts (NEW)
import { compileMDX } from 'next-mdx-remote/rsc'

export async function validateMDX(mdxContent: string): Promise<{ valid: boolean; error?: string }> {
  try {
    await compileMDX({
      source: mdxContent,
      components: {},  // Empty components — just validates syntax, not rendering
    })
    return { valid: true }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) }
  }
}
```

### Supabase Seed Function

```typescript
// scripts/lib/seed-lesson.ts (NEW)
import { createAdminSupabaseClient } from '../../src/lib/supabase/server'

export async function seedLesson(lessonId: string, mdxContent: string, quizQuestions: QuizQuestion[]) {
  const supabase = createAdminSupabaseClient()

  // 1. Get current version
  const { data: lesson } = await supabase
    .from('lessons')
    .select('content_version')
    .eq('id', lessonId)
    .single()

  const newVersion = (lesson?.content_version ?? 0) + 1

  // 2. Archive current version to lesson_versions
  const { data: current } = await supabase
    .from('lessons')
    .select('mdx_content, learning_objectives')
    .eq('id', lessonId)
    .single()

  if (current?.mdx_content) {
    await supabase.from('lesson_versions').insert({
      lesson_id: lessonId,
      version_number: lesson!.content_version,
      mdx_content: current.mdx_content,
      learning_objectives: current.learning_objectives,
      change_note: 'Pre-AI-generation snapshot',
    })
  }

  // 3. Update lesson with new content
  await supabase
    .from('lessons')
    .update({ mdx_content: mdxContent, content_version: newVersion })
    .eq('id', lessonId)

  // 4. Upsert quiz questions
  for (const q of quizQuestions) {
    await supabase.from('quiz_questions').upsert(
      { ...q, lesson_id: lessonId },
      { onConflict: 'id' }
    )
  }
}
```

### Integration Points: Content Generation CLI

| Touch Point | Type | Change Required |
|-------------|------|-----------------|
| `scripts/generate-lesson.ts` | NEW | CLI entry point with argument parsing |
| `scripts/agents/orchestrator.ts` | NEW | Coordinates research → write → validate → seed |
| `scripts/agents/research-agent.ts` | NEW | Claude API research call (claude-opus-4-6) |
| `scripts/agents/writer-agent.ts` | NEW | Claude API MDX writing call (claude-sonnet-4-6) |
| `scripts/lib/claude-client.ts` | NEW | Configured Anthropic client |
| `scripts/lib/validate-mdx.ts` | NEW | MDX validation before DB insert |
| `scripts/lib/seed-lesson.ts` | NEW | Supabase upsert with version archiving |
| `scripts/templates/lesson-prompt.ts` | NEW | System prompt embedding lesson template |
| `scripts/seed-fsrs-from-history.ts` | NEW | One-time FSRS bootstrap from quiz_attempts |
| `package.json` | MODIFY | Add `@anthropic-ai/sdk`, `tsx` dev dep, `scripts.*` commands |
| `.env.local` + Vercel | MODIFY | Add `ANTHROPIC_API_KEY` |
| `tsconfig.json` | POSSIBLY MODIFY | Ensure scripts/ is included in compilation |

---

## Component Boundaries — v2.0 Additions

| Component | Layer | Server/Client | Responsibility | New or Modified |
|-----------|-------|---------------|----------------|-----------------|
| `middleware.ts` | Edge | — | Add route protection: all routes except `/sign-in` require Clerk session | MODIFIED |
| `app/sign-in/[[...sign-in]]/page.tsx` | App | Server wrapper | Render Clerk `<SignIn />` component, centered on page | NEW |
| `app/review/page.tsx` | App | Server | Fetch due FSRS cards for authenticated user, pass to client | NEW |
| `components/fsrs/ReviewSession.tsx` | App | **Client** | Flashcard UI: show question, toggle answer reveal, rating buttons (Again/Hard/Good/Easy), advance card | NEW |
| `components/fsrs/FsrsWidget.tsx` | App | Server | Dashboard "X due today" count with link to /review | NEW |
| `lib/actions/fsrs.ts` | Server | Server Action | `submitFsrsReview()`, `getDueCardCount()`, `getDueCards()` | NEW |
| `lib/actions/progress.ts` | Server | Server Action | Replace `HARDCODED_USER_ID` with `await auth()` | MODIFIED |
| `app/page.tsx` (dashboard) | App | Server | Add due-count query + FSRS widget rendering | MODIFIED |
| All data-fetching pages | App | Server | Replace `HARDCODED_USER_ID` with `await auth()` in all 4 lesson-hierarchy pages | MODIFIED |
| `src/types/database.types.ts` | Shared | — | Add `fsrs_cards` and `fsrs_review_logs` types | MODIFIED |

---

## Data Flow: New Features

### FSRS Review Flow

```
User clicks "X cards due" → /review
    ↓
app/review/page.tsx (Server Component)
  - await auth() → userId
  - getDueCards(userId) → SELECT from fsrs_cards JOIN quiz_questions WHERE due <= NOW()
  - Passes cards[] to <ReviewSession cards={cards} />
    ↓
ReviewSession.tsx (Client Component)
  - Shows question text (client state: showAnswer = false initially)
  - User clicks "Show Answer" → reveals correct answer + explanation
  - User clicks rating (Again / Hard / Good / Easy)
    → calls submitFsrsReview(questionId, Rating.Good) — Server Action
    → Server Action: loads/creates card, calls fsrs.repeat(), upserts fsrs_cards, inserts fsrs_review_logs
    → returns next card
  - When cards[] exhausted: show summary screen
```

### Content Generation Flow (CLI)

```
Developer terminal: npx tsx scripts/generate-lesson.ts --lesson-slug "cap-theorem"
    ↓
orchestrator.ts
  1. createAdminSupabaseClient() → find lesson by slug → get lesson.id
  2. researchTopic(topic, pillarContext) → Claude API (opus-4-6) → research notes (string)
  3. writeLessonMDX(research, lessonTitle, template) → Claude API (sonnet-4-6) → raw MDX
  4. validateMDX(mdx) → compileMDX() → if error: retry writer up to 3x
  5. seedLesson(lessonId, mdx, parsedQuizQuestions) → Supabase upsert
  6. Log: "Done: Lesson updated to v{N}"
    ↓
Next time user navigates to that lesson page:
  - Server Component fetches mdx_content from lessons table (fresh content)
  - MDXRemote compiles and renders the new content
  - No cache invalidation needed — force-dynamic pages always re-fetch
```

### Auth Flow (Post-Wiring)

```
User visits any app route (not /sign-in)
    ↓
middleware.ts — clerkMiddleware() + isPublicRoute check
  - If unauthenticated: redirect to /sign-in
  - If authenticated: proceed (session attached to request)
    ↓
Server Component / Server Action
  const { userId } = await auth()
  userId used for all progress reads and writes
    ↓
createAdminSupabaseClient() with explicit user_id on all mutations
RLS on read queries enforced via Clerk JWT (createServerSupabaseClient)
```

---

## Project Structure — New Files/Directories

Only showing additions and modifications. Existing structure is unchanged.

```
src/
├── app/
│   ├── page.tsx                            # MODIFIED: add FSRS widget + auth()
│   ├── sign-in/
│   │   └── [[...sign-in]]/
│   │       └── page.tsx                    # NEW: Clerk SignIn component
│   └── review/
│       ├── page.tsx                        # NEW: FSRS review session server wrapper
│       └── loading.tsx                     # NEW: skeleton while due cards load
├── components/
│   └── fsrs/
│       ├── ReviewSession.tsx               # NEW: client — flashcard + rating UI
│       └── FsrsWidget.tsx                  # NEW: server — "X due today" dashboard card
├── lib/
│   └── actions/
│       ├── progress.ts                     # MODIFIED: auth() replaces HARDCODED_USER_ID
│       └── fsrs.ts                         # NEW: submitFsrsReview, getDueCardCount, getDueCards
├── middleware.ts                           # MODIFIED: add route protection
└── types/
    └── database.types.ts                   # MODIFIED: add fsrs_cards, fsrs_review_logs types

scripts/                                    # NEW directory (not part of Next.js app)
├── generate-lesson.ts                      # CLI entry point
├── seed-fsrs-from-history.ts               # One-time bootstrap
├── agents/
│   ├── orchestrator.ts
│   ├── research-agent.ts
│   └── writer-agent.ts
├── lib/
│   ├── claude-client.ts
│   ├── validate-mdx.ts
│   └── seed-lesson.ts
└── templates/
    └── lesson-prompt.ts

supabase/
└── migrations/
    └── 00004_fsrs_tables.sql               # NEW: fsrs_cards, fsrs_review_logs, indexes, RLS
```

---

## Build Order for v2.0

Dependencies flow bottom-up. Each feature has internal dependencies AND cross-feature dependencies.

```
PREREQUISITE: Verify Clerk JWT → Supabase integration works (auth.uid returns non-null)
This must be tested before wiring auth into any page.

PHASE A: Auth Wiring (no new external deps — everything already installed)

  1. MODIFY middleware.ts
     Add createRouteMatcher and auth.protect() for all non-public routes
     Verify: incognito window → /pillars/... → redirected to /sign-in
     Reason: Must work before any page reads userId from auth()

  2. NEW app/sign-in/[[...sign-in]]/page.tsx
     Render <SignIn /> from @clerk/nextjs
     Add three env vars (CLERK_SIGN_IN_URL, etc.) to .env.local and Vercel
     Verify: sign in flow completes, redirects to dashboard

  3. MODIFY server actions (progress.ts) + data pages (page.tsx, lesson/page.tsx)
     Replace HARDCODED_USER_ID with await auth()
     Verify: lessons still mark in_progress, quiz attempts still persist, progress still saves
     Reason: Auth must work before progress data relies on real userId

PHASE B: FSRS Database + Algorithm (no UI yet)

  4. NEW supabase migration 00004_fsrs_tables.sql
     Create fsrs_cards, fsrs_review_logs, indexes, RLS policies
     Verify: tables exist in Supabase, RLS blocks anon reads
     Reason: Actions and review page depend on these tables existing

  5. MODIFY database.types.ts
     Add FsrsCard and FsrsReviewLog types
     Reason: TypeScript safety for all FSRS code

  6. npm install ts-fsrs

  7. NEW lib/actions/fsrs.ts
     Implement getDueCardCount(), getDueCards(), submitFsrsReview()
     Verify: manually call getDueCardCount() in a test component, returns 0 (no cards yet)
     Reason: Pages depend on these actions

PHASE C: FSRS UI

  8. NEW components/fsrs/ReviewSession.tsx (client)
     Flashcard UI: show question → reveal answer → rate (Again/Hard/Good/Easy)
     Call submitFsrsReview() on each rating
     Reason: Review page wraps this

  9. NEW app/review/page.tsx + loading.tsx
     Server component: auth(), getDueCards(), pass to <ReviewSession>
     Verify: navigate to /review, no due cards shows empty state

  10. MODIFY app/page.tsx (dashboard)
      Add getDueCardCount() fetch + FsrsWidget conditional render
      Verify: widget shows 0 due (correctly)

PHASE D: Bootstrap FSRS from History

  11. NEW scripts/seed-fsrs-from-history.ts
      Replay quiz_attempts through FSRS to create initial card states
      Run once: npx tsx scripts/seed-fsrs-from-history.ts
      Verify: fsrs_cards table has rows, /review shows due cards

PHASE E: Content Generation CLI (independent of Phases A-D)

  12. npm install @anthropic-ai/sdk
      Add ANTHROPIC_API_KEY to .env.local

  13. NEW scripts/ directory structure
      claude-client.ts → research-agent.ts → writer-agent.ts → orchestrator.ts

  14. NEW scripts/lib/validate-mdx.ts
      Verify: compileMDX on a known-bad MDX string returns an error

  15. NEW scripts/lib/seed-lesson.ts
      Verify: updates a test lesson in Supabase, version increments, old version archived

  16. NEW scripts/templates/lesson-prompt.ts
      System prompt with full lesson template
      Verify: writer-agent with a test topic produces valid MDX

  17. Wire orchestrator.ts end-to-end
      Generate one lesson (Pillar 2, Lesson 1) end-to-end
      Verify: lesson appears correctly rendered at lesson URL

  18. Generate all Pillars 2-7 content via CLI
      Run in batches by pillar
```

**Rationale for this order:**
- Auth (Phase A) must come before FSRS UI because the review page calls `auth()`
- FSRS tables (Phase B step 4) must exist before actions that query them
- FSRS actions (Phase B step 7) must exist before review page that calls them
- Bootstrap (Phase D) can only run after tables exist AND quiz attempts have been collected
- Content generation CLI (Phase E) is fully independent — runs against Supabase directly, no Next.js dependency

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: FSRS Rating Exposed Only After Answer

**What people do:** Show the four FSRS ratings (Again/Hard/Good/Easy) immediately when the question is shown, before the answer is revealed.
**Why it's wrong:** The user rates their recall, not their guess. Ratings without seeing the answer are meaningless and corrupt FSRS data quality.
**Do this instead:** Two-step flow: show question → user tries to recall → clicks "Show Answer" → answer + explanation revealed → user self-rates with Again/Hard/Good/Easy.

### Anti-Pattern 2: Creating FSRS Cards Eagerly for All Questions

**What people do:** On first login or FSRS bootstrap, create `fsrs_cards` rows for all ~600 lessons × ~3 questions = ~1800 rows immediately.
**Why it's wrong:** Flooding the review queue on day one is overwhelming and defeats spaced repetition's purpose. Cards should enter the queue as lessons are completed.
**Do this instead:** Create an `fsrs_cards` row for a question only when: (a) the user first answers that question in a lesson quiz, OR (b) the bootstrap script replays existing quiz_attempts. New lessons with no quiz history start their cards fresh with `createEmptyCard()`.

### Anti-Pattern 3: CLI Tool as a Next.js API Route

**What people do:** Build the content generation pipeline as a Next.js Route Handler (e.g., `/api/generate`).
**Why it's wrong:** Generation takes 30-120 seconds. Vercel serverless functions have a 60-second timeout (Hobby) or 300-second (Pro). The pipeline also needs to be triggered by the developer, not via HTTP. API routes add complexity (auth, CSRF) with no benefit.
**Do this instead:** Standalone Node.js script in `scripts/` using `@anthropic-ai/sdk` directly. Calls Supabase with the admin client. Run via `npx tsx`.

### Anti-Pattern 4: FSRS Cards Storing Compiled MDX

**What people do:** De-normalize FSRS cards to store the full question text in `fsrs_cards` for performance.
**Why it's wrong:** Question text lives in `quiz_questions` and is already indexed. Duplicating it in `fsrs_cards` creates a data consistency problem when quiz questions are updated.
**Do this instead:** `fsrs_cards` stores only FSRS algorithm state (due, stability, difficulty, etc.) and a foreign key to `quiz_questions`. JOIN in the due-cards query — it's a single query with an index on `question_id`.

### Anti-Pattern 5: Replacing HARDCODED_USER_ID Before Auth is Tested

**What people do:** Delete `HARDCODED_USER_ID` and replace all call sites with `auth()` in one commit, then discover that middleware is misconfigured and all pages break.
**Why it's wrong:** A broken auth integration takes down the entire app.
**Do this instead:** Wire middleware first and verify the sign-in redirect works. Then wire one server action (e.g., `markLessonComplete`) to `auth()`, verify it still works when logged in. Then replace the remaining call sites. Delete `HARDCODED_USER_ID` constant last, after all replacements are verified.

---

## Integration Points Summary

| Feature | New Files | Modified Files | New DB Objects |
|---------|-----------|----------------|----------------|
| Clerk Auth | `app/sign-in/[[...sign-in]]/page.tsx` | `middleware.ts`, `lib/actions/progress.ts`, `app/page.tsx`, `app/pillars/.../page.tsx` (×4) | None |
| FSRS | `lib/actions/fsrs.ts`, `app/review/page.tsx`, `app/review/loading.tsx`, `components/fsrs/ReviewSession.tsx`, `components/fsrs/FsrsWidget.tsx`, `scripts/seed-fsrs-from-history.ts` | `app/page.tsx`, `types/database.types.ts`, `package.json` | `fsrs_cards`, `fsrs_review_logs` (migration `00004`) |
| Content CLI | `scripts/generate-lesson.ts`, `scripts/agents/orchestrator.ts`, `scripts/agents/research-agent.ts`, `scripts/agents/writer-agent.ts`, `scripts/lib/claude-client.ts`, `scripts/lib/validate-mdx.ts`, `scripts/lib/seed-lesson.ts`, `scripts/templates/lesson-prompt.ts` | `package.json` | None (writes to existing `lessons`, `lesson_versions`, `quiz_questions`) |

---

## Sources

- [ts-fsrs GitHub (TypeScript FSRS library)](https://github.com/open-spaced-repetition/ts-fsrs) — HIGH confidence, verified 2026-03-02
- [ts-fsrs npm (v4.5.x)](https://www.npmjs.com/package/ts-fsrs) — HIGH confidence
- [Clerk clerkMiddleware() reference](https://clerk.com/docs/reference/nextjs/clerk-middleware) — HIGH confidence, official docs verified 2026-03-02
- [Clerk custom sign-in page guide](https://clerk.com/docs/nextjs/guides/development/custom-sign-in-or-up-page) — HIGH confidence, official docs verified 2026-03-02
- [Anthropic multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) — MEDIUM confidence, architectural pattern reference
- Existing codebase inspection (`src/middleware.ts`, `src/lib/supabase/server.ts`, `src/types/database.types.ts`, `src/lib/actions/progress.ts`, `supabase/migrations/00001_initial_schema.sql`) — HIGH confidence, ground truth

---

*Architecture research for: Personal Learning Curriculum Platform — v2.0 content generation pipeline, FSRS spaced repetition, Clerk auth integration*
*Researched: 2026-03-02*
