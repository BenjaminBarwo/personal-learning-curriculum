# Feature Research

**Domain:** Personal learning curriculum platform — v2.0 milestone features
**Researched:** 2026-03-02
**Confidence:** HIGH — all three feature domains verified against official docs and live implementations (Clerk docs, ts-fsrs GitHub + DeepWiki, Anthropic sub-agent patterns via multiple sources)

---

## Scope

This document covers only the three NEW feature areas added in v2.0. The v1.0 feature baseline (dashboard, navigation, MDX rendering, quiz engine, progress tracking) is already built and validated. Everything here assumes that foundation.

**v2.0 feature areas:**
1. Content generation CLI pipeline (Claude API + sub-agents → MDX → Supabase)
2. FSRS spaced repetition (dashboard widget + review page)
3. Clerk auth UI (sign-in page + protected routes wired up)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must work correctly for v2.0 to feel complete. Missing any of these and the milestone is not shippable.

#### Clerk Auth UI

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Sign-in page at `/sign-in` | Without it, unauthenticated users hit a blank or broken app | LOW | `app/sign-in/[[...sign-in]]/page.tsx` — optional catch-all for Clerk to own sub-routes. Renders `<SignIn />` component. Already scaffolded in v1.0 but not wired |
| `clerkMiddleware()` protecting all non-public routes | Routes are currently public; RLS is bypassed via admin client. Real auth requires middleware-enforced gating | LOW-MED | Already exists in `src/middleware.ts` as empty `clerkMiddleware()`. Needs `createRouteMatcher()` + `auth.protect()` to flip from "allow all" to "deny unauthenticated" |
| Redirect to `/sign-in` when unauthenticated | Users navigating directly to `/dashboard` or any lesson should land on sign-in | LOW | `auth.protect()` in middleware handles this automatically — no custom redirect logic needed |
| Post-sign-in redirect to dashboard | After authenticating, user lands somewhere useful, not the Clerk hosted UI | LOW | `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/` in `.env`. Optionally force-redirect to `/dashboard` |
| Clerk JWT wired to Supabase RLS | RLS policies exist but are bypassed today via service-role admin client. Real user data isolation requires Clerk JWT → Supabase `current_setting` claim to resolve | HIGH | This is the hardest piece. Requires Supabase JWT template in Clerk dashboard, `createServerClient` with `getToken({ template: 'supabase' })`, and flipping all data fetches from admin client to user-scoped client. The schema and RLS policies already exist — this is the wiring |

#### FSRS Spaced Repetition

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| "X due today" dashboard widget | Without this, the learner has no nudge to do reviews. The whole system is invisible if there's no entry point | LOW-MED | Query `review_cards` where `due <= now()` and `user_id = current_user`. Show count + CTA button |
| Review page with card-flip flow | The canonical flashcard interaction: question shown → learner thinks → "show answer" → difficulty rating | MED | Show question text, "Show Answer" button, reveal answer, then Again/Hard/Good/Easy buttons. This is the core Anki UX — deviation from it creates friction |
| Again / Hard / Good / Easy rating buttons | FSRS requires exactly these four ratings (mapped to 1/2/3/4). Fewer buttons loses scheduling precision; more buttons creates decision fatigue | LOW | `ts-fsrs` `Rating` enum: `Again=1, Hard=2, Good=3, Easy=4`. Show interval hint per button ("Again: <1 day", "Good: 3 days") |
| Next due date displayed per rating | Learner should see the consequence of each rating BEFORE tapping. Anki does this; removing it degrades trust in the system | LOW | `fsrs.repeat(card, now)` returns all four outcomes simultaneously — read `.due` from each to display hint |
| Review queue exhaustion state | "You're all caught up" message when 0 cards due. Empty queue without feedback feels broken | LOW | Check count before rendering review UI; show completion state with "Next review: tomorrow at 9am" |
| Persist card state after each review | If card state isn't saved, reviews are wasted. Must write updated `Card` object to DB after every rating | MED | Upsert `review_cards` row with new `due`, `stability`, `difficulty`, `state`, `reps`, `lapses` after each `fsrs.repeat()` call |

#### Content Generation CLI Pipeline

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| CLI entry point (`pnpm generate` or `node scripts/generate.ts`) | Without a CLI, the pipeline has no invocation path. It must be runnable from terminal | LOW | Single command entry point; accepts flags for pillar, semester, course target scope |
| Structured output (Zod-validated MDX string) | Claude's output must conform exactly to the lesson MDX template. Unvalidated output seeds broken content | MED | Use Anthropic SDK `generateObject` / `generateText` with post-processing validation. Validate: required components present (`<Hook>`, `<ConceptBlock>`, `<Quiz>`, etc.), minimum word count per section |
| Seed generated content into Supabase | Generation without seeding achieves nothing. The output must be readable from the learning platform immediately | MED | Upsert into `lessons.mdx_content` + increment `content_version` + write to `lesson_versions`. Use service-role admin client (CLI runs server-side) |
| Progress/status reporting per lesson | Generating 598 lessons takes hours. Without progress output, it's impossible to tell if the pipeline is working or hung | LOW | Log `[1/12] Generating: "How Transformers Work"...` per lesson. Use timestamps. No spinner needed for a CLI that may run unattended |
| Idempotency (skip already-generated lessons) | Re-running the pipeline must not overwrite good content with a re-generated version | MED | Check `lessons.mdx_content IS NOT NULL` before generating. Add `--force` flag to override. Log "skipped (already generated)" per lesson |

---

### Differentiators (Competitive Advantage)

Features that go beyond the bare minimum and create meaningful value. Worth building but not blockers for launch.

#### Clerk Auth UI

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Force-redirect to `/dashboard` after sign-in (not `/`) | Learner lands on their curriculum immediately, not a landing page | LOW | `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard` in `.env`. One env var change. HIGH value / LOW cost |
| Sign-in page styled to match the platform (dark mode, pillar colors) | The Clerk `<SignIn />` component is embeddable; unstyled it looks generic. Styled to match, auth feels native to the product | MED | Clerk appearance prop with custom variables. Tailwind CSS v4 token extraction. Keeps the "product polish" bar consistent |
| User menu (avatar, sign-out) in the header | Learner needs to know they're signed in and have a way to sign out | LOW | Clerk `<UserButton />` component — drop-in. Already compatible with App Router |

#### FSRS Spaced Repetition

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Interval hint per rating button | "Good → 4 days" shown before tapping reduces anxiety and builds trust in the algorithm | LOW | Read from pre-calculated `fsrs.repeat()` output. Format as relative duration. Already supported by ts-fsrs API |
| Seed review cards from quiz questions automatically | Without auto-seeding, the user has no cards to review after completing a lesson. The system only works if cards exist | MED | On lesson `completed` event (progress update), query `quiz_questions` for that lesson, `createEmptyCard()` for each not already in `review_cards`, bulk insert. This is the bridge from the existing quiz engine to FSRS |
| "New cards today" count alongside "Due today" | Distinguishes new cards entering the queue from overdue reviews. Learner can pace themselves | LOW | Two queries: `state = 'New' AND created_at >= today` vs `due <= now() AND state != 'New'`. Low complexity, meaningful UX |
| Session summary after review batch | "You reviewed 12 cards. Longest streak: 4 Good in a row." Provides closure for the session | LOW-MED | Track session stats in component state during review. Display on empty-queue screen |

#### Content Generation CLI Pipeline

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Orchestrator + research sub-agent pattern | A single flat Claude call produces generic content. Orchestrator (plans lesson) + researcher sub-agent (deep-dives topic) produces lesson-level depth | HIGH | Pattern: Orchestrator calls `generateText` with tool use; researcher sub-agent does topic deep-dives, returns findings; orchestrator synthesizes into MDX. Matches Claude Code's own agent-team architecture. 90%+ quality improvement on complex topics per benchmark |
| Dry-run mode (`--dry-run`) | Generates and validates the MDX but does NOT write to DB. Useful for auditing quality before committing | LOW | Flag check before the upsert step. Prints generated MDX to stdout or temp file |
| Per-pillar scope flag (`--pillar 2`) | Allows generating one pillar at a time rather than all 598 lessons in one run | LOW | CLI arg parsing. Filters the content tree to one pillar before iterating |
| Retry with backoff on API errors | Claude API has rate limits. Without retry, a rate limit at lesson 47 of 598 halts the entire pipeline | MED | Exponential backoff on `429` / `529` errors. Max 3 retries per lesson. Log failed lessons to a `failed_lessons.json` for re-run |
| Content quality validation before seeding | Generated MDX might be structurally valid but pedagogically thin (too short, missing quiz questions, no Hook). Catch these before they go live | MED | Post-generation checks: min word count per section, at least 2 quiz questions, `<Hook>` present, `<Takeaways>` present. Reject and re-generate once on failure |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem useful but should be explicitly rejected for v2.0.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **On-demand lesson generation** (generate when user opens a lesson) | Eliminates pre-generation step, feels "live" | 5-15s latency per lesson open violates the "frictionless to start" core UX principle. Decided against in PROJECT.md | Pre-generate all content via CLI pipeline. On-demand generation only for AI tutor chat (Phase 3) |
| **FSRS parameter optimization per user** | Optimal FSRS weights improve scheduling accuracy with sufficient data | Requires 500+ reviews per user to compute meaningful weights. Single user with <100 reviews gets worse scheduling, not better | Use default FSRS weights. Revisit after significant review history accumulates |
| **Review card creation from vocabulary terms** (in addition to quiz questions) | Vocabulary terms are a natural flashcard source | Vocabulary terms lack the question/answer structure FSRS needs. Quiz questions already have `question_text` + `correct_answer`. Dual seeding creates confusing mixed card types | Seed only from `quiz_questions`. Vocabulary is surfaced via `<Definition>` component in-lesson |
| **Multi-user Clerk roles / org management** | Seems like a "future-proof" improvement | Clerk org management adds billing, member invite flows, permission matrices. Zero use case for a single-learner platform | Keep single-user model. `user_id` on all tables + RLS is already the right scaffolding for future multi-user without Org overhead |
| **Streaming generation output to browser** | Cool tech demo — watch the lesson be written live | Streaming MDX to a DB write is architecturally awkward (partial content, failed writes, version collision). CLI pre-gen avoids this entirely | Pre-generate and batch-seed. Streaming is appropriate only for the AI tutor chat surface |
| **SM-2 fallback in FSRS** | "What if FSRS doesn't work for this user?" | Maintaining two scheduling algorithms doubles complexity, creates confusing UX, and FSRS strictly dominates SM-2. There is no user cohort for whom SM-2 is the better choice | FSRS only. If FSRS scheduling feels wrong, adjust the `requestRetention` parameter (85% → 90%), not the algorithm |
| **Anki import/export** | Users coming from Anki might want to bring their existing decks | This is a quiz-question-to-review-card pipeline tied to specific lessons. Imported Anki decks have no lesson context, no `<Quiz>` origin, no course structure | Out of scope permanently. Review cards come only from lessons completed on this platform |
| **Real-time "due now" notifications (push/email)** | "You have 5 cards due!" notification at 9am | Push notifications require a separate service worker or FCM integration. Email reminders require a transactional email provider and opt-in flow. Both are significant scope | Dashboard widget shows due count on next visit. Passive pull model is sufficient for a single-user self-directed platform |

---

## Feature Dependencies

```
[Clerk sign-in UI + middleware]
  └──gates──> All authenticated routes (dashboard, pillars, lessons, review)
  └──enables──> [Supabase RLS with real user_id] (currently bypassed via admin client)
                  └──enables──> [FSRS review_cards per user] (user-scoped data)
                  └──enables──> [progress tracking with real isolation] (currently any user_id works)

[Content generation pipeline]
  └──requires──> Existing lesson content structure in Supabase (pillars, semesters, courses, lessons rows)
  └──produces──> mdx_content + content_version populated on lessons
  └──produces──> lesson_versions append-only history
  └──enables──> [Pillars 2-7 available to learner] (600 lessons)
  └──enables (indirectly)──> [FSRS seeding at scale] (more completed lessons = more review cards)

[FSRS spaced repetition]
  └──requires──> [Clerk auth] (review_cards are per user_id, RLS required)
  └──requires──> quiz_questions rows (source of review card content)
  └──requires──> progress.status = 'completed' events (trigger for seeding new cards)
  └──requires──> ts-fsrs npm package (scheduling algorithm)
  └──requires──> review_cards table migration (does NOT exist in v1.0 schema — new table)
  └──surface 1──> Dashboard widget (due count + CTA)
  └──surface 2──> Review page (/review) (card-flip + rating UI)

[Dashboard widget]
  └──requires──> [FSRS review_cards table]
  └──enhances──> Existing dashboard (adds a new widget alongside existing progress rings)

[Review page]
  └──requires──> [FSRS review_cards table]
  └──requires──> [Clerk auth] (user must be signed in to see their cards)
  └──depends on──> ts-fsrs repeat() for scheduling updates after rating
```

### Dependency Notes

- **Clerk auth gates FSRS**: Without real user auth wired through to Supabase RLS, `review_cards` cannot be safely written with a real `user_id`. Admin-client-only writes for user data is acceptable for v1.0 progress tracking (single user, no isolation needed) but unacceptable once auth is wired up and RLS enforces row-level access.

- **`review_cards` table does not exist in v1.0**: The v1.0 schema has `quiz_attempts` (immutable attempt records) and `progress` (completion status) but no FSRS card state table. This is a new migration before any FSRS UI can be built.

- **Content generation is independent of auth and FSRS**: The CLI pipeline runs server-side with service-role admin credentials. It does not require Clerk auth to be wired up. It can ship in parallel or first.

- **FSRS seeding depends on completed lessons, not on content volume**: The FSRS dashboard widget is useful from day one (Pillar 1 has 2 complete lessons with quiz questions). Generating Pillars 2-7 amplifies it but doesn't unblock it.

---

## MVP Definition

### v2.0 Launch With

Minimum required for this milestone to be "done":

- [ ] **Clerk middleware protecting all routes** — flip `clerkMiddleware()` from passthrough to `auth.protect()` on all non-`/sign-in` routes
- [ ] **Sign-in page at `/sign-in`** — renders `<SignIn />`, styled to match dark theme
- [ ] **Post-sign-in redirect to `/dashboard`** — `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`
- [ ] **`review_cards` Supabase migration** — new table to hold FSRS card state per user (due, stability, difficulty, state, reps, lapses)
- [ ] **Auto-seed review cards on lesson completion** — when progress flips to `completed`, create FSRS cards from that lesson's `quiz_questions`
- [ ] **Dashboard "Due today" widget** — shows count of cards due, links to review page
- [ ] **Review page at `/review`** — card-flip flow with Again/Hard/Good/Easy, persists updated card state after each rating
- [ ] **Content generation CLI** — `pnpm generate --pillar 1` generates and seeds MDX for all Pillar 1 lessons not yet generated
- [ ] **Pillars 2-7 content generated** — all ~598 lessons have `mdx_content` populated via the pipeline

### Add After Validation (v2.x)

Features that are ready to add once the v2.0 core is stable:

- [ ] **Interval hints per rating button** — trigger: FSRS widget exists, low-cost enhancement
- [ ] **Session summary screen** — trigger: review sessions have baseline usage data
- [ ] **Orchestrator + research sub-agent pattern** — trigger: validate flat-generation quality first; upgrade if content quality is insufficient
- [ ] **Sign-in page styled with platform design tokens** — trigger: functional auth ships first, polish second

### Future Consideration (v3+)

Defer until v2.0 is proven:

- [ ] **FSRS parameter optimization** — needs 500+ reviews per card type; not meaningful at v2.0 launch
- [ ] **Review notifications (push/email)** — requires notification infrastructure; passive dashboard widget is sufficient
- [ ] **Anki import/export** — no evidence of need
- [ ] **Real Supabase RLS enforcement via Clerk JWT** — currently the user client reads with service role on server components. Flipping to user-scoped JWT requires significant refactor of all data fetches. Schedule as a dedicated hardening milestone

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Clerk middleware — protect all routes | HIGH | LOW | P1 |
| Sign-in page (`/sign-in`) | HIGH | LOW | P1 |
| `review_cards` migration | HIGH | LOW | P1 |
| Dashboard "Due today" widget | HIGH | MEDIUM | P1 |
| Review page with card-flip + rating | HIGH | MEDIUM | P1 |
| Auto-seed FSRS cards on lesson completion | HIGH | MEDIUM | P1 |
| Content generation CLI (flat generation) | HIGH | MEDIUM | P1 |
| Pillars 2-7 content generated via CLI | HIGH | HIGH (time) | P1 |
| Force-redirect to `/dashboard` post-sign-in | HIGH | LOW | P1 |
| Interval hints per rating button | MEDIUM | LOW | P2 |
| `--dry-run` CLI flag | MEDIUM | LOW | P2 |
| Per-pillar scope flag (`--pillar N`) | MEDIUM | LOW | P2 |
| Session summary after review batch | MEDIUM | LOW | P2 |
| Sign-in page styled with platform tokens | MEDIUM | MEDIUM | P2 |
| Retry + backoff on API errors | HIGH | MEDIUM | P2 |
| Orchestrator + research sub-agent pattern | HIGH | HIGH | P2 |
| `UserButton` (sign-out) in header | MEDIUM | LOW | P2 |
| FSRS parameter optimization | LOW | HIGH | P3 |
| Anki import/export | LOW | HIGH | P3 |
| Review notifications (push/email) | LOW | HIGH | P3 |
| Real Supabase RLS via Clerk JWT | HIGH | HIGH | P3 |

---

## Competitor Feature Analysis

Relevant reference points for the three feature areas:

| Feature Area | Anki / RemNote | Duolingo | Our Approach |
|-------------|----------------|----------|--------------|
| **Review session UI** | Show question → "Show Answer" → Again/Hard/Good/Easy | "Tap the correct answer" (no flip) | Anki model — question flip + 4-button rating. Quiz question as the card face |
| **Due today count** | Deck list shows count badge | "Daily lesson" counter | Dashboard widget with count + direct link to `/review` |
| **Empty queue state** | "Congratulations! You finished this deck" | Celebratory animation | "All caught up" message with next-due time hint |
| **Content generation** | Manual card creation | Professional content team | Claude API CLI pipeline — AI-authored MDX seeded into DB |
| **Auth model** | AnkiWeb account | Google/Apple SSO | Clerk — already scaffolded, single user, wire up middleware |

---

## Implementation Notes by Feature

### Clerk Auth — What Already Exists

The v1.0 codebase has:
- `@clerk/nextjs` installed and `ClerkProvider` wrapping the app (`src/app/layout.tsx`)
- `middleware.ts` with `clerkMiddleware()` but no route protection
- `user_id TEXT` on all user tables + RLS policies already written
- Supabase RLS using `current_setting('request.jwt.claims', true)::jsonb ->> 'sub'` for the Clerk user ID

What is missing: the middleware `createRouteMatcher()` + `auth.protect()` call, the `/sign-in` page file, and the three environment variables.

### FSRS — New Table Required

The v1.0 schema has `quiz_attempts` (immutable attempt records) and `progress`. FSRS needs a new mutable table:

```sql
CREATE TABLE review_cards (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        TEXT        NOT NULL,                    -- Clerk user ID
  question_id    UUID        NOT NULL REFERENCES quiz_questions(id),
  -- FSRS card state (ts-fsrs Card type fields)
  due            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stability      FLOAT       NOT NULL DEFAULT 0,
  difficulty     FLOAT       NOT NULL DEFAULT 0,
  elapsed_days   INTEGER     NOT NULL DEFAULT 0,
  scheduled_days INTEGER     NOT NULL DEFAULT 0,
  reps           INTEGER     NOT NULL DEFAULT 0,
  lapses         INTEGER     NOT NULL DEFAULT 0,
  state          TEXT        NOT NULL DEFAULT 'New'       -- New/Learning/Review/Relearning
                             CHECK (state IN ('New', 'Learning', 'Review', 'Relearning')),
  last_review    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, question_id)                            -- one card per user per question
);
```

This is the ONLY new migration needed for FSRS. All review scheduling happens in TypeScript (ts-fsrs), not SQL.

### Content Generation — Where to Run

The CLI runs outside Next.js (not a server action, not a route handler). It's a standalone Node.js/TypeScript script in `scripts/generate.ts` that:
1. Reads the curriculum structure from Supabase (which pillars/semesters/courses/lessons exist)
2. Calls Claude API for each lesson without `mdx_content`
3. Validates the MDX output
4. Upserts into `lessons.mdx_content` and writes to `lesson_versions`

This separates generation from serving — the Next.js app only reads, the CLI only writes.

---

## Sources

- [ts-fsrs GitHub (open-spaced-repetition)](https://github.com/open-spaced-repetition/ts-fsrs) — Card state machine, Rating enum, repeat() API — **HIGH confidence**
- [ts-fsrs DeepWiki](https://deepwiki.com/open-spaced-repetition/ts-fsrs) — createEmptyCard(), fsrs.repeat(), session flow — **HIGH confidence**
- [Clerk Docs: Custom sign-in page (Next.js App Router)](https://clerk.com/docs/nextjs/guides/development/custom-sign-in-or-up-page) — File path, component, env vars — **HIGH confidence**
- [Clerk Docs: clerkMiddleware()](https://clerk.com/docs/reference/nextjs/clerk-middleware) — createRouteMatcher, auth.protect() — **HIGH confidence**
- [Clerk Docs: Customize redirect URLs](https://clerk.com/docs/guides/development/customize-redirect-urls) — Fallback vs force redirect — **HIGH confidence**
- [Anki Manual: Studying](https://docs.ankiweb.net/studying.html) — Again/Hard/Good/Easy UX, show-answer flow — **HIGH confidence**
- [Claude Sub-agents: Complete Guide (cursor-ide.com)](https://www.cursor-ide.com/blog/claude-subagents) — Orchestrator-worker pattern, Planner→Worker→Evaluator — **MEDIUM confidence** (third-party, corroborated by Anthropic patterns)
- [Multi-Agent Orchestration: 10+ Claude Instances in Parallel (dev.to)](https://dev.to/bredmond1019/multi-agent-orchestration-running-10-claude-instances-in-parallel-part-3-29da) — Parallel sub-agent generation patterns — **MEDIUM confidence**
- Project context: `.planning/PROJECT.md` — existing schema, tech stack, constraints — **HIGH confidence**
- Existing migration: `supabase/migrations/00001_initial_schema.sql` — confirms `quiz_attempts`, `quiz_questions`, `progress` table structure — **HIGH confidence**

---

*Feature research for: v2.0 Content & Retention milestone (content generation pipeline, FSRS, Clerk auth)*
*Researched: 2026-03-02*
