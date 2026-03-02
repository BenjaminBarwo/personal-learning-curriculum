# Pitfalls Research

**Domain:** AI content generation pipeline + FSRS spaced repetition + Clerk auth UI wiring into existing Next.js/Supabase learning platform
**Researched:** 2026-03-02
**Confidence:** HIGH — findings grounded in: official Clerk/Supabase/ts-fsrs documentation, live codebase review (v1.0 source), confirmed API changes (Clerk native Supabase integration April 2025), and pattern analysis from production systems.

> This document covers v2.0 pitfalls only. v1.0 pitfalls are in the original PITFALLS.md (Phase 1 greenfield research). These pitfalls are specific to ADDING these three feature areas to the existing, working v1.0 system.

---

## Domain A: Content Generation Pipeline

### A1 [CRITICAL] — AI generates MDX that uses unknown component names, silently producing empty lesson sections

**What goes wrong:**
The content generation prompt instructs Claude to produce MDX using `<Hook>`, `<ConceptBlock>`, `<Quiz>`, etc. Claude hallucinates a variant: `<HookSection>`, `<Concept>`, `<QuizBlock>`, or a plausibly-named component that doesn't exist in `mdxComponents`. `next-mdx-remote` renders nothing for unregistered components — no error, no warning. The lesson page loads fine, but 30% of the content is invisible. This is discovered late, after hundreds of lessons are seeded.

**Why it happens:**
Claude does not have runtime access to `mdxComponents`. It infers component names from the prompt. If the prompt is slightly ambiguous or Claude interpolates from similar MDX systems it has seen in training data, component names drift. JSX with many attributes also confuses LLMs, leading to attribute mismatches on real components.

**How to avoid:**
1. Include the exact component API in the system prompt as a non-negotiable contract — not a description, the actual JSX signatures:
   ```
   Available components (use ONLY these exact names):
   <Hook title="...">narrative text</Hook>
   <ConceptBlock title="..." icon="...">content</ConceptBlock>
   <Quiz questionId="..." />
   <DeepDive title="...">content</DeepDive>
   <Exercise title="..." duration="...">content</Exercise>
   <Takeaways items={["...", "..."]} />
   <Definition term="...">definition text</Definition>
   <Diagram id="..." caption="..." />
   ```
2. Build a post-generation validator before any lesson is stored. Parse the generated MDX string with a regex or MDX AST walker, extract all JSX component names, and cross-reference against a hardcoded allowlist. Reject any lesson that contains an unregistered component name.
3. Run validation in the CLI pipeline before calling Supabase insert — not after.

**Warning signs:**
- Generated lesson renders fine visually but is shorter than the hand-written reference lessons
- `<Hook>` section missing on some AI-generated lessons but not others
- Console shows no errors but lesson content area is sparse

**Phase to address:** Content generation pipeline phase — validator must be part of the CLI before any lessons are bulk-generated.

---

### A2 [CRITICAL] — MDX with malformed JSX (unclosed tags, invalid props) crashes all lesson pages until manually fixed

**What goes wrong:**
Claude generates technically invalid JSX inside MDX — an unclosed `<ConceptBlock>`, a `title` prop with unescaped double quotes, a `<Diagram>` with a missing required prop. `compileMDX` (called server-side in the lesson page) throws a compilation error. Because MDX content is fetched from Supabase and compiled at request time, every user who visits that lesson gets a 500 error. There is no graceful degradation. The content sits in the database and must be manually corrected or reverted.

**Why it happens:**
Claude generates text, not ASTs. It does not validate JSX syntax. Long generated lessons have higher error rates because more JSX tags means more surface area for subtle structural mistakes. Unclosed tags are especially common — MDX requires proper JSX nesting.

**How to avoid:**
1. The post-generation validator (see A1) must also attempt to compile the generated MDX in a sandbox and capture any thrown errors. Reject the lesson if compilation fails.
2. Wrap `compileMDX` in a try/catch with a graceful error UI: if a lesson fails to compile, render "This lesson's content has a formatting issue" rather than a 500. This already partially exists as P3.4 in v1.0 research — confirm the error boundary is in place before bulk generation begins.
3. Store the raw generated MDX in a staging area (a separate `generated_lessons_staging` table or a `status = 'pending_validation'` column) and only promote it to `lessons.mdx_content` after the validator passes. This allows rollback without content loss.
4. Run a small-batch validation pass on 10 generated lessons before launching bulk generation for an entire pillar.

**Warning signs:**
- 500 errors on specific lesson routes in Vercel logs
- `compileMDX threw: Unexpected token` visible in function logs
- Lessons that validate fine locally fail in production (Unicode or encoding differences)

**Phase to address:** Content generation pipeline phase — staging table and validator must exist before bulk generation of Pillars 2–7.

---

### A3 — Content generation runs without idempotency, causing duplicate lessons or wasted API spend on retries

**What goes wrong:**
The CLI pipeline generates lesson N, the Supabase insert times out or fails (network blip, RLS denial), and the pipeline retries the entire lesson from scratch — calling Claude again and inserting a duplicate. At ~598 remaining lessons, a 5% error rate means 30 duplicate lessons scattered across pillars. Cleaning up duplicates manually is expensive. Re-running the Claude API call on retry wastes tokens (and money).

**Why it happens:**
Pipelines are often written as a simple loop without a checkpoint mechanism. The error is caught, the loop continues, but the state is not persisted. On a crash-and-restart, there is no record of which lessons were already successfully generated.

**How to avoid:**
1. Use a generation progress table or a simple JSON checkpoint file: after each successful lesson insert, record the lesson ID and slug as "done". On re-run, skip already-completed lessons.
2. Make the Supabase insert idempotent: use `upsert` with `onConflict: 'course_id,slug'` so re-running the same lesson overwrites rather than duplicates. Pair with a `generated_at` timestamp so you know the content is fresh.
3. The Anthropic Batch API provides a 50% cost reduction for async generation. For 598 lessons, batch processing is strongly recommended — submit all prompts for a pillar in one batch, poll for completion, then insert results. This eliminates per-lesson timeout risk.
4. Rate limit awareness: the Batch API has its own queue limits. Generate per-pillar (not all 7 pillars at once) to stay within limits.

**Warning signs:**
- Two lessons with the same slug appearing in a course
- Generation CLI exiting without reporting total lessons inserted
- Claude API costs higher than projected with no corresponding lesson count increase

**Phase to address:** Content generation pipeline phase — checkpoint mechanism must be designed before the first pillar generation run.

---

### A4 — AI-generated quiz questions use `questionId` values that don't exist in `quiz_questions`, breaking the Quiz component

**What goes wrong:**
The lesson template includes `<Quiz questionId="some-id" />`. The AI generates an MDX lesson with placeholder question IDs (e.g. `"q-001"`, `"question-1"`, or fabricated UUIDs). The Quiz component reads these IDs from the `QuizProvider` context, which is populated from `quiz_questions` fetched from Supabase. Non-matching IDs cause the graceful fallback path in `Quiz.tsx` to render "Question not available" — silently, with no error logged. All quiz questions in AI-generated lessons are broken.

**Why it happens:**
The `questionId` prop must reference a real row in `quiz_questions`. But the AI generates the MDX lesson content and the quiz questions as separate concerns — the IDs are only resolved at insert time. If the pipeline generates MDX first and question rows second (or separately), there is a timing/ID mismatch. UUIDs must be pre-generated and passed to the AI, or question MDX must be replaced with real IDs during a post-processing step.

**How to avoid:**
1. Pre-generate UUIDs for quiz questions before calling the AI. Pass these UUIDs to the generation prompt: "Use these exact questionIds for the Quiz components: `a1b2c3-...`, `d4e5f6-...`". Insert the question rows with these UUIDs first, then insert the MDX with the matching `questionId` props.
2. Alternatively: generate questions separately, insert them to get real UUIDs, then do a string replacement pass on the MDX before storing it.
3. Add the `questionId` to the post-generation validator's check list: for every `<Quiz questionId="..." />` found in the MDX, verify a corresponding row exists in `quiz_questions` before marking the lesson as valid.

**Warning signs:**
- Quiz components all showing "Question not available" on AI-generated lessons
- `quiz_questions` table row count not matching expected question count per lesson
- AI generating `<Quiz questionId="question-1" />` (non-UUID format)

**Phase to address:** Content generation pipeline phase — ID pre-generation strategy must be designed before the first lesson is generated.

---

### A5 — Generation prompt produces pedagogically flat lessons that violate the lesson design template

**What goes wrong:**
The AI generates content that is technically valid MDX and passes the syntax validator, but the lesson design template (Hook → Core Concepts → Checkpoint Quiz → Deep Dive → Exercise → Takeaways) is not followed. Lessons arrive as walls of prose wrapped in `<ConceptBlock>` tags, or the `<Hook>` contains an abstract definition instead of a real-world case study. The lesson renders fine but feels like a textbook — contradicting the platform's core value principle.

**Why it happens:**
The system prompt explains the template structure but the AI interprets "real-world hook" loosely. Without a reference lesson to imitate, the AI defaults to academic prose patterns. This is a prompt engineering problem, not a code problem — but it causes significant rework if discovered only after 598 lessons are generated.

**How to avoid:**
1. Include the two existing hand-written Pillar 1 lessons as concrete few-shot examples in the generation prompt. Show the AI exactly what a good `<Hook>` looks like (specific company, specific moment, specific stakes) versus a bad one.
2. Generate a single pilot lesson for each new pillar and manually review it before bulk-generating the rest of that pillar's lessons. Adjust the prompt based on the pilot output.
3. Add a content quality checklist to the CLI output: does the lesson contain a Hook? Does the Hook reference a specific event/company? Are there 3–5 ConceptBlocks? Is there at least one Quiz? Flag lessons that fail these structural checks for manual review.

**Warning signs:**
- `<Hook>` title starts with "Introduction to..." or "Understanding..."
- ConceptBlock content exceeds 400 words (should be chunked, not walls of text)
- No Exercise component in generated lessons

**Phase to address:** Content generation pipeline phase — pilot-and-review process must be established before bulk generation begins.

---

### A6 — Bulk generation costs exceed budget without cost modeling first

**What goes wrong:**
598 lessons × average 4,000 output tokens per lesson = ~2.4M output tokens. At claude-sonnet-4-6 pricing, this is a real cost. If sub-agents are used for deep research (additional Claude calls per lesson), costs multiply. A pipeline written naively (no batching, no prompt caching, no token estimation) can overspend by 3–5x before the issue is noticed.

**Why it happens:**
Developers estimate cost per lesson in isolation but forget: system prompt tokens repeated per call (cacheable), sub-agent research calls (additional requests), retries (duplicated spend), and the difference between input and output token pricing.

**How to avoid:**
1. Use the Anthropic Batch API for all bulk generation — 50% discount on token costs, no timeout risk.
2. Cache the system prompt: Claude's prompt caching (5-minute TTL) caches repeated system prompt content, reducing effective input costs by up to 90% for a batch run where the system prompt is identical across calls.
3. Model costs before running: estimate `(system_prompt_tokens + avg_research_context_tokens) * num_lessons * input_price + avg_output_tokens * num_lessons * output_price`. Run this estimate and confirm it's within budget before the first pillar.
4. Generate Pillar 2 fully first as a cost baseline before committing to all 6 remaining pillars.

**Warning signs:**
- No cost estimate in the CLI's pre-run output
- System prompt longer than 2,000 tokens sent fresh on every call
- Sub-agent research calls not counted in cost model

**Phase to address:** Content generation pipeline phase — cost model must be produced before the first pillar generation run.

---

## Domain B: FSRS Spaced Repetition Integration

### B1 [CRITICAL] — FSRS card state added as new columns to `quiz_attempts` (append-only table) instead of a separate scheduling table

**What goes wrong:**
Developers see `quiz_attempts` and add FSRS scheduling columns to it (`due`, `stability`, `difficulty`, `state`, `last_review`, etc.). But `quiz_attempts` is append-only by design — it records every individual attempt as an immutable row. FSRS scheduling state is mutable — it is updated after each review. These are different data shapes with different access patterns. Adding mutable FSRS state to an immutable attempts table creates a contradiction: either you violate the immutability invariant (updating rows that should never be updated) or you misread the scheduling state (reading the first attempt's state instead of the current state).

**Why it happens:**
The existing schema has `quiz_attempts` indexed on `(user_id, question_id)` — the same key FSRS scheduling is keyed on. Developers make the natural but wrong connection.

**How to avoid:**
Create a separate `fsrs_cards` table:
```sql
CREATE TABLE fsrs_cards (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         TEXT NOT NULL,
  question_id     UUID NOT NULL REFERENCES quiz_questions(id),
  -- FSRS algorithm state (all fields required by ts-fsrs Card type)
  due             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stability       FLOAT NOT NULL DEFAULT 0,
  difficulty      FLOAT NOT NULL DEFAULT 0,
  elapsed_days    INTEGER NOT NULL DEFAULT 0,
  scheduled_days  INTEGER NOT NULL DEFAULT 0,
  reps            INTEGER NOT NULL DEFAULT 0,
  lapses          INTEGER NOT NULL DEFAULT 0,
  state           TEXT NOT NULL DEFAULT 'New',
  last_review     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, question_id)
);
```
Keep `quiz_attempts` purely as the immutable attempt log. `fsrs_cards` holds the current scheduling state. A separate `fsrs_review_logs` table holds the history of FSRS-specific reviews (not the same as raw quiz attempts).

**Warning signs:**
- Any migration that adds `due`, `stability`, or `difficulty` columns to `quiz_attempts`
- Queries doing `SELECT ... WHERE user_id = ? ORDER BY created_at DESC LIMIT 1` to find "current" FSRS state from the attempts table

**Phase to address:** FSRS phase — schema must be designed correctly before any FSRS logic is written.

---

### B2 [CRITICAL] — FSRS card state not persisted after `repeat()` call, causing scheduling to reset on every review

**What goes wrong:**
The ts-fsrs `repeat(card, now)` function returns a `RecordLog` with four possible next states (one per rating). The developer calls `repeat()`, gets the result, shows the user the next review date, but does not write the updated card state back to the database. On the next review session, `fsrs.repeat()` is called again with the original (unmodified) card — as if the user has never reviewed this question. All scheduling benefits of FSRS are lost; every question is treated as new on every session.

**Why it happens:**
The ts-fsrs API returns a result object but does not mutate the card in place and does not write to any database. The developer must explicitly persist the selected card variant (based on the user's rating) AND the review log. This two-step persist (update card + insert review log) is easy to miss in the initial implementation.

**How to avoid:**
After the user rates a card, persist both:
1. Update `fsrs_cards` with the new card state: `due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `reps`, `lapses`, `state`, `last_review`.
2. Insert a row into `fsrs_review_logs` with the pre-review state and the rating chosen.

Write a helper function that handles both writes atomically:
```typescript
async function recordFsrsReview(userId: string, questionId: string, rating: Rating) {
  const card = await getOrCreateFsrsCard(userId, questionId)
  const now = new Date()
  const recordLog = fsrs().repeat(card, now)
  const nextCard = recordLog[rating].card
  const log = recordLog[rating].log
  // Persist both in a single transaction
  await supabase.rpc('record_fsrs_review', { next_card: nextCard, log, user_id: userId, question_id: questionId })
}
```

**Warning signs:**
- FSRS card `reps` column always showing 1 in the database after multiple review sessions
- `due` date not advancing after reviews
- Dashboard "due today" count not decreasing after completing a review session

**Phase to address:** FSRS phase — the persist step must be tested with a round-trip integration test before the review UI is built.

---

### B3 — Rating scale mismatch between quiz UX (correct/incorrect) and FSRS (Again/Hard/Good/Easy)

**What goes wrong:**
The existing quiz engine is binary: correct or incorrect. FSRS requires a 4-point rating scale (Again, Hard, Good, Easy). Developers map `isCorrect = false` → `Rating.Again` and `isCorrect = true` → `Rating.Good`, skipping Hard and Easy entirely. This works superficially but defeats FSRS's memory model: the algorithm needs confidence gradations to model stability accurately. A user who barely recalls an answer and one who recalls it instantly should get different intervals. Without Hard/Easy, the algorithm's effectiveness is severely reduced.

**Why it happens:**
The quiz engine was built for pass/fail feedback. The review page needs a different UX (a flashcard flow with explicit difficulty rating) to capture the full 4-point scale. This is a separate UX concern, not an extension of the quiz component.

**How to avoid:**
Design the review page as a distinct UX from the lesson quiz page: show the question, user thinks, reveals answer, then shows four buttons labeled "Again", "Hard", "Good", "Easy" (with next review interval previewed under each). Do not reuse the existing Quiz component for the review page — the interaction model is fundamentally different.

Map ratings explicitly:
- Again: answer was wrong or requires immediate re-review
- Hard: answer was recalled but with significant effort
- Good: normal successful recall
- Easy: answer felt trivial; could have waited longer

**Warning signs:**
- FSRS review page reusing the `<Quiz>` component unchanged
- Only two rating buttons on the review page ("Correct" / "Incorrect")
- All cards ending up with identical scheduling intervals regardless of confidence

**Phase to address:** FSRS phase — review page UX must be specced before any FSRS UI is built.

---

### B4 — "Due today" widget count doesn't match what the review page actually shows

**What goes wrong:**
The dashboard widget queries `WHERE due <= NOW()` and shows "8 cards due today". The user clicks through to the review page. The review page queries the same table but with a slightly different filter, or has a different definition of "due" (e.g. timezone offset, `due < NOW()` vs `due <= NOW()`, or a stale server-side cached value). The user sees 6 cards on the review page. The discrepancy erodes trust and confuses the learner.

**Why it happens:**
Two separate queries for the same data written independently, with subtle differences in the `due` date comparison, timezone handling, or caching strategy. Server-rendered pages may also return stale counts if cached and not revalidated.

**How to avoid:**
1. Define a single `getDueCards(userId: string)` function that is the only place the due-card query is written. Import it in both the dashboard widget and the review page.
2. Use UTC timestamps consistently throughout — `due` column stored in UTC, compared with `new Date().toISOString()` (UTC). Never compare with local timezone dates.
3. The dashboard widget is on a real-time data page — use `force-dynamic` or `revalidate: 0` so it never serves a stale count.

**Warning signs:**
- Dashboard count and review page count differ by more than 0 between page loads
- `due` column storing local timestamps instead of UTC
- Two separate SQL queries written for "due cards" in different files

**Phase to address:** FSRS phase — single source of truth for due-card query must be established at schema design time.

---

### B5 — FSRS cards not seeded from existing `quiz_attempts`, so early adopters start with zero history

**What goes wrong:**
The platform has been live since v1.0. The single user has answered quiz questions across Pillar 1 lessons. When FSRS is added, the `fsrs_cards` table starts empty — every question is treated as new (state = "New", reps = 0). The algorithm ignores all the historical quiz attempt data. The user is asked to review questions they already answered correctly 20 times. FSRS's initial parameter calibration also suffers from lack of history.

**Why it happens:**
FSRS cards are initialized lazily (on first review session), not from historical attempt data. The existing `quiz_attempts` table has the correctness signal needed to bootstrap reasonable initial stability values, but this bootstrap step is never written.

**How to avoid:**
Write a one-time migration script that bootstraps `fsrs_cards` from `quiz_attempts`:
1. For each `(user_id, question_id)` pair in `quiz_attempts`, find the most recent attempt.
2. If `is_correct = true` with multiple correct attempts, initialize the card with a reasonable stability > 0 (representing established knowledge) rather than the zero-stability default.
3. Set `state = 'Review'` for questions with multiple correct answers, `state = 'Learning'` for single correct answers, `state = 'New'` for unattempted questions.
4. This bootstrap is a best-effort approximation, not a replacement for FSRS parameter optimization — but it prevents the "re-learn everything from scratch" UX failure.

**Warning signs:**
- FSRS review queue on day one contains every question from Pillar 1
- User reports "I already know this" on questions they've answered correctly multiple times
- `fsrs_cards.reps` = 0 for questions with non-zero entries in `quiz_attempts`

**Phase to address:** FSRS phase — bootstrap migration must be part of the FSRS database migration, not deferred.

---

## Domain C: Clerk Auth UI Wiring

### C1 [CRITICAL] — `clerkMiddleware()` runs but protects nothing — all routes remain public after adding the middleware

**What goes wrong:**
The existing `middleware.ts` already runs `clerkMiddleware()` (configured in v1.0 as a skeleton). But `clerkMiddleware()` with no configuration does not protect any routes — all routes remain public by default. The developer adds the sign-in page UI, tests it by navigating to `/sign-in`, and considers auth "done". But navigating directly to `/dashboard` or any lesson URL without being signed in still works — because the middleware is not calling `auth.protect()` on any route.

**Why it happens:**
The Clerk docs state clearly that `clerkMiddleware()` does not protect routes by default and you must opt in. But the existing skeleton middleware looks functional (it runs, it imports correctly), so developers assume it is protecting routes and don't re-read the protection configuration docs.

**Existing code confirms this risk:**
```typescript
// Current middleware.ts (v1.0) — protects NOTHING:
import { clerkMiddleware } from '@clerk/nextjs/server'
export default clerkMiddleware()
```

**How to avoid:**
Add explicit route protection using `createRouteMatcher`:
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/pillars(.*)',
  '/api/(?!webhooks)(.*)', // protect API routes except webhooks
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})
```

Test by opening an incognito window and navigating directly to `/pillars/ai-engineering` — it must redirect to `/sign-in`, not render the content.

**Warning signs:**
- Incognito access to lesson routes succeeds without redirect
- No `createRouteMatcher` or `auth.protect()` anywhere in `middleware.ts`
- Only sign-in page added, no middleware update

**Phase to address:** Clerk auth phase — middleware update must be the first thing done, before sign-in page UI.

---

### C2 [CRITICAL] — Replacing `HARDCODED_USER_ID` with `auth()` breaks all progress/quiz writes because the client switches from admin to user JWT

**What goes wrong:**
All progress writes in v1.0 use `createAdminSupabaseClient()` with the hardcoded user ID. When Clerk auth is wired, the natural migration is to replace `HARDCODED_USER_ID` with the Clerk `userId` from `auth()`. But `progress.ts` is a Server Action that currently uses the admin client (which bypasses RLS). If the mutation code switches to the admin client but now passes the real `userId` from `auth()`, it still works. But if the developer also switches the client to the user-scoped client (`createServerSupabaseClient()`) without verifying that RLS INSERT policies allow user-initiated writes, all progress writes fail silently — `userId` doesn't match the JWT sub claim in the RLS policy because the policy checks `current_setting('request.jwt.claims', true)::json->>'sub'` and the Clerk token's sub claim format may not exactly match what the policy expects.

**Why it happens:**
The v1.0 admin client was used to intentionally bypass RLS. Switching to the user client requires the RLS policies to work correctly end-to-end. The RLS policies were written for the native Clerk integration (using `current_setting('request.jwt.claims', true)::json->>'sub'`) but were never tested with a real Clerk JWT because auth was bypassed.

**How to avoid:**
1. Before changing any application code, test the RLS policies with a real Clerk JWT. In the Supabase SQL editor, run:
   ```sql
   -- Test as authenticated user
   SELECT current_setting('request.jwt.claims', true)::json->>'sub';
   ```
   This should return the Clerk user ID string. If it returns null, the Clerk native integration is not configured correctly in the Supabase dashboard.
2. Use a phased migration: first verify RLS works with the user client (read-only queries), then switch progress writes to the user client, then remove the admin client from user-facing paths.
3. Keep the admin client for seeding/generation operations — it should never be removed entirely, only removed from user-facing Server Actions.

**Warning signs:**
- Progress writes returning no error but progress not saved in Supabase
- `userId` from `auth()` being passed to the admin client (mixed pattern — technically works but semantically wrong)
- RLS policies never tested with a real Clerk token before the switch

**Phase to address:** Clerk auth phase — RLS policy end-to-end test must come before replacing HARDCODED_USER_ID.

---

### C3 — Clerk native Supabase integration (post-April 2025) requires dashboard configuration that the existing JWT template approach didn't need

**What goes wrong:**
The existing `createServerSupabaseClient()` in v1.0 already uses the native Clerk integration pattern:
```typescript
accessToken: async () => (await getToken()) ?? null,
```
This is the correct post-April 2025 approach. But this pattern only works if Clerk is configured as a third-party auth provider in the Supabase dashboard (under Authentication → Third-party Auth). If this dashboard step was skipped during v1.0 setup (because RLS was bypassed via admin client), the `accessToken` function returns a valid Clerk JWT but Supabase cannot verify it — all user-client queries return empty results or permission errors.

**Why it happens:**
The code looks correct (and it is). The failure is in Supabase's dashboard configuration, not in the application code. This is easy to miss because the admin client was always used for writes, and the user client was never actually tested for authenticated reads.

**How to avoid:**
1. Verify the Supabase third-party auth configuration before any auth work begins: Supabase Dashboard → Authentication → Third-party Auth → confirm Clerk is listed with the correct Clerk instance domain.
2. Write a simple test: as a signed-in user, fetch from `pillars` using the user Supabase client (not admin). If it returns rows, the integration is working. If it returns empty or an error, the dashboard configuration is missing.
3. Document: the Clerk JWT template (deprecated April 1, 2025) required sharing the Supabase JWT secret with Clerk. The new native integration requires adding Clerk's domain to Supabase's dashboard. These are different steps — don't confuse them.

**Warning signs:**
- User-scoped Supabase client queries returning 0 rows for content that definitely exists
- No entry in Supabase Authentication → Third-party Auth for Clerk
- Application worked in dev but fails in production (different Clerk instance domains)

**Phase to address:** Clerk auth phase — dashboard configuration verification is the first step.

---

### C4 — Sign-in page redirects to Clerk-hosted UI instead of custom sign-in page, or vice versa

**What goes wrong:**
Clerk defaults to hosting a sign-in page at `https://accounts.[your-clerk-domain].com/sign-in`. If `NEXT_PUBLIC_CLERK_SIGN_IN_URL` is not set to the custom sign-in route (`/sign-in`), clicking "Sign In" redirects users to Clerk's hosted UI rather than the custom page. Alternatively, if the developer builds a custom sign-in page at `/app/sign-in/page.tsx` but doesn't configure Clerk environment variables to point to it, middleware redirects go to Clerk's hosted UI instead of the custom page. Both failures make the auth experience inconsistent.

**Why it happens:**
Clerk requires environment variables to wire up custom sign-in/up pages:
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` (or disable sign-up for single-user)
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`

These are easy to miss because Clerk falls back to hosted pages gracefully — no error is thrown.

**How to avoid:**
Set all three environment variables in both `.env.local` and Vercel environment settings. For a single-user platform, disable sign-up: configure Clerk Dashboard → User Management → Registration to allow only invitation-based or email-restricted sign-up.

**Warning signs:**
- Clicking "Sign In" redirects to `accounts.clerk.com` instead of `/sign-in`
- After sign-in, user lands on a default Clerk dashboard instead of the app dashboard
- No Clerk-related environment variables in `.env.local` beyond the publishable key

**Phase to address:** Clerk auth phase — environment variables must be set before testing any auth flow.

---

### C5 — Prefetch errors on protected links crash Next.js prefetching for unauthenticated users

**What goes wrong:**
Next.js aggressively prefetches `<Link>` targets on hover. If the homepage (public) has a link to `/dashboard` (protected), Next.js prefetches `/dashboard` for unauthenticated users. Clerk's middleware returns a 302 redirect (to `/sign-in`) for the prefetch request. Next.js interprets this as an error and logs warnings. On some versions, this causes noticeable layout issues or console noise that misleads debugging.

**Why it happens:**
Documented Clerk behavior: if a Link points to a protected route from a public page and the user is unauthenticated, the prefetch returns a redirect. Clerk's documentation explicitly calls this out and provides the fix.

**How to avoid:**
Add `prefetch={false}` to any `<Link>` that points to a protected route from a public page:
```tsx
<Link href="/dashboard" prefetch={false}>Enter Learning Platform</Link>
```
Since this is a single-user platform with a public homepage pointing to a protected dashboard, this is a guaranteed issue.

**Warning signs:**
- Console showing `Failed to fetch /dashboard` or redirect-related warnings on the homepage
- "Redirect loop" errors in browser dev tools on homepage hover events
- Auth flow testing being confused by prefetch interference

**Phase to address:** Clerk auth phase — add `prefetch={false}` when building the sign-in UI or any public page with protected links.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep admin client for all mutations after adding Clerk | No migration risk, works immediately | Bypasses user-scoping; harder to audit who wrote what; blocks multi-user | Only during Clerk transition, replace within same phase |
| Generate all 6 pillars at once without pilot review | Faster time to content | 598 low-quality lessons requiring manual fixes; wasted API spend | Never — always pilot per pillar first |
| Map FSRS ratings to binary correct/incorrect | Reuses existing quiz UI | Defeats FSRS memory model; intervals become inaccurate | Never for FSRS review page (fine for raw quiz attempt recording) |
| Skip the FSRS bootstrap migration | Less work upfront | User re-learns all Pillar 1 questions from scratch; poor first impression | Never if significant quiz history exists |
| Defer MDX validator to "after generation" | Faster first lesson | Silent failures in bulk generation discovered late, expensive to fix | Never — validator must run before any insert |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Clerk → Supabase (post-April 2025) | Configuring Clerk JWT template (deprecated) instead of native third-party auth dashboard | Add Clerk as third-party provider in Supabase dashboard; use `accessToken: async () => session.getToken()` |
| Clerk middleware | Running `clerkMiddleware()` with no route protection config | Use `createRouteMatcher` + `auth.protect()` for all protected routes |
| ts-fsrs `repeat()` | Calling `repeat()` without persisting the returned card state | Always write the selected `RecordLog[rating].card` back to `fsrs_cards` immediately after user rates |
| Anthropic Batch API | Submitting all 598 lessons at once, hitting queue limits | Submit per-pillar (~74–100 lessons at a time), poll for completion before next pillar |
| Claude API + MDX | Assuming generated MDX component names match registered components | Post-generation validator against hardcoded component allowlist before any database insert |

---

## Performance Traps

Patterns that work now but degrade with scale.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Querying `quiz_attempts` for FSRS "current state" | Slow review page loads, O(n) per user per question | Use `fsrs_cards` for current state, `quiz_attempts` only for history | 100+ attempts per question per user |
| Fetching FSRS due cards with a full table scan | Dashboard widget slow to load | Index `(user_id, due)` on `fsrs_cards`; partial index for `state != 'New'` | 500+ questions per user |
| Compiling MDX at request time for 598 lessons | Slow lesson page loads after content generation | Cache compiled MDX in Supabase or via `unstable_cache` keyed on `lesson_id + content_version` | Any lesson with >50 concurrent users |
| Content generation not using prompt caching | 3–5x API cost for system prompts | Enable Anthropic prompt caching for the system prompt (cached at 5-min TTL) | Immediate — every generation call |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing API key in generated content | Clerk/Supabase keys leaked in MDX stored in DB | Validate generated MDX for any string matching `sk-...`, `eyJ...`, environment variable patterns |
| Admin client accessible from `/api` routes called without auth check | Any unauthenticated caller can trigger admin writes | All `/api` routes using admin client must verify Clerk auth first |
| RLS bypassed permanently via admin client | User data isolation broken; no per-user audit | Admin client only for content seeding, never for user-data reads/writes post-auth |
| Claude API key exposed in client bundle | Anyone can call Claude at your expense | Ensure `ANTHROPIC_API_KEY` is in a server-only file; never in `NEXT_PUBLIC_*` env vars |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Review session shows 50+ due cards with no limit | Learner is overwhelmed, abandons session | Cap daily reviews at 20; show "come back tomorrow" for the rest |
| FSRS review page reuses quiz lesson layout | User confused about context; hard to rate difficulty | Separate review page with minimal chrome: question, reveal button, 4 rating buttons, next interval preview |
| Sign-in page with no indication of platform | User unsure what app they're signing into | Include platform name and logo on sign-in page |
| "Due today" count on dashboard not updating after completing reviews | Learner doesn't know if their session "worked" | Invalidate dashboard data after review session completes (revalidatePath or client-side refresh) |
| Generated lessons in Pillars 2–7 with no visual quality signal | Learner can't distinguish generated from hand-crafted | Consider a subtle "AI-generated" indicator so the learner sets appropriate expectations |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Clerk auth wired:** Middleware runs and imports Clerk — verify it actually blocks unauthenticated access to `/pillars/*` in an incognito window.
- [ ] **Content pipeline built:** CLI runs and outputs MDX — verify generated `questionId` values exist as rows in `quiz_questions` before declaring lessons valid.
- [ ] **FSRS integrated:** Due cards appear in dashboard — verify the card state is actually updated in `fsrs_cards` after a review (check `reps` column increments).
- [ ] **Progress writes migrated:** `HARDCODED_USER_ID` removed — verify progress is written to Supabase under the real Clerk `userId` (not the hardcoded string) by checking the `progress` table after marking a lesson complete.
- [ ] **RLS working with real JWT:** Admin client removed from user paths — verify the user Supabase client can read and write progress under the real Clerk auth (test in incognito after signing in).
- [ ] **Generation pipeline idempotent:** CLI runs successfully — verify it can be re-run safely without creating duplicate lessons (check for upsert behavior and checkpoint file).
- [ ] **FSRS review session completes:** Review page shows cards — verify the dashboard "due today" count decreases after completing a review session (cache invalidation working).

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| A1: AI uses wrong component names (bulk generation done) | HIGH | Write a script to scan all generated MDX in DB for unregistered component names; manually regenerate affected lessons with corrected prompt |
| A2: Invalid MDX causing 500 errors | MEDIUM | Roll back affected lessons to previous version using `lesson_versions` table; validator prevents this for future runs |
| A3: Duplicate lessons seeded | MEDIUM | Identify duplicates by `(course_id, slug)` uniqueness violations; `lesson_versions` retains originals; delete duplicates via admin client |
| A4: Wrong questionIds in MDX | HIGH | Script to re-parse MDX for `<Quiz>` tags, match to real question IDs by position/order, update MDX content via admin client |
| B1: FSRS state in wrong table | HIGH | Write migration to extract FSRS state from `quiz_attempts`, create `fsrs_cards` table, migrate data; significant downtime risk |
| B2: Card state not persisted | LOW | Fix the persist step; FSRS starts from current state correctly from next session |
| C1: Middleware not protecting routes | LOW | Add `createRouteMatcher` + `auth.protect()`; test in incognito; deploy |
| C2: Progress writes fail after admin→user client switch | MEDIUM | Verify Supabase third-party auth config; test RLS with real JWT; re-enable admin client for writes temporarily while debugging |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| A1: Wrong component names in AI output | Content generation pipeline phase | Post-generation validator rejects any MDX with unregistered component |
| A2: Invalid MDX JSX crashes lesson pages | Content generation pipeline phase | Compilation sandbox in validator; error boundary on lesson page |
| A3: Non-idempotent pipeline causing duplicates | Content generation pipeline phase | Re-run CLI on Pillar 2 seed data; verify no duplicates appear |
| A4: Wrong questionId values in MDX | Content generation pipeline phase | Validator checks that every `<Quiz questionId="...">` has a matching DB row |
| A5: Flat, textbook-style generated content | Content generation pipeline phase | Pilot review of first generated lesson per pillar before bulk run |
| A6: Cost overrun without budget model | Content generation pipeline phase | Cost estimate output before each pillar's generation run |
| B1: FSRS state in wrong table | FSRS schema migration phase | `fsrs_cards` table exists with correct columns before any FSRS logic written |
| B2: Card state not persisted after repeat() | FSRS implementation phase | Integration test: review a card, verify `reps` increments in DB |
| B3: Binary rating instead of 4-point scale | FSRS review UX phase | Review page must have 4 explicit rating buttons |
| B4: Due count mismatch between widget and review | FSRS implementation phase | Dashboard and review page return identical count from shared query function |
| B5: No bootstrap from existing quiz_attempts | FSRS schema migration phase | Bootstrap migration included in FSRS migration file |
| C1: Middleware protects nothing | Clerk auth phase (first step) | Incognito access to `/pillars/*` redirects to `/sign-in` |
| C2: Progress writes break after admin→user switch | Clerk auth phase | Progress table shows real Clerk userId after marking a lesson complete |
| C3: Supabase dashboard not configured for Clerk | Clerk auth phase (first step) | User Supabase client query returns content rows (not empty) for authenticated user |
| C4: Sign-in URL environment variables missing | Clerk auth phase | Middleware redirect goes to `/sign-in` (custom), not Clerk-hosted page |
| C5: Prefetch errors on protected links | Clerk auth phase | No redirect/fetch errors in console when hovering homepage links |

---

## Sources

- [Clerk: Integrate Supabase with Clerk (current docs, April 2025 native integration)](https://clerk.com/docs/guides/development/integrations/databases/supabase)
- [Supabase: Clerk third-party auth integration docs](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Clerk changelog: Supabase native integration (March 31, 2025)](https://clerk.com/changelog/2025-03-31-supabase-integration)
- [Clerk middleware docs: clerkMiddleware() defaults to protecting nothing](https://clerk.com/docs/reference/nextjs/clerk-middleware)
- [ts-fsrs GitHub: API reference, data types, state machine](https://github.com/open-spaced-repetition/ts-fsrs)
- [Anthropic: Message Batches API, rate limits, prompt caching](https://platform.claude.com/docs/en/api/rate-limits)
- [FSRS ABC: algorithm fundamentals and parameter considerations](https://github.com/open-spaced-repetition/fsrs4anki/wiki/abc-of-fsrs)
- [Supabase GitHub Discussion: RLS with Clerk](https://github.com/orgs/supabase/discussions/33091)
- [v1.0 codebase review: middleware.ts, progress.ts, server.ts, schema migration 00001](..)

---

*Pitfalls research for: v2.0 Content & Retention milestone — AI generation pipeline, FSRS, Clerk auth UI*
*Researched: 2026-03-02*
