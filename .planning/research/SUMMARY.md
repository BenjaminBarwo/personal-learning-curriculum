# Project Research Summary

**Project:** Personal Learning Curriculum Platform — v2.0 Content & Retention Milestone
**Domain:** AI content generation pipeline + spaced repetition + auth wiring into an existing Next.js/Supabase learning platform
**Researched:** 2026-03-02
**Confidence:** HIGH — all four research files grounded in official docs, live codebase inspection, and verified npm registry versions

## Executive Summary

This v2.0 milestone adds three distinct feature areas to an already-working platform: a Node.js CLI pipeline that uses Claude to generate MDX lesson content and seeds it into Supabase; FSRS spaced repetition for flashcard-style review of quiz questions; and real Clerk auth enforcement to replace the hardcoded user pattern from v1.0. The stack additions are minimal and precise — `@anthropic-ai/sdk` for Claude API calls, `ts-fsrs` for the FSRS algorithm, and configuration-only Clerk wiring (the package is already installed). The architecture is well-defined: the content generation pipeline is a standalone Node.js CLI that writes directly to Supabase via the admin client, completely separate from the Next.js app which only reads.

The recommended execution order is not negotiable: Clerk auth must be wired and verified before FSRS UI is built (the review page calls `auth()`), and the FSRS database tables must exist before any FSRS server actions are written. The content generation CLI is fully independent and can be built in parallel. The critical risk across all three feature areas is the "looks done but isn't" failure pattern — middleware that runs but protects nothing, FSRS card state not persisted after `repeat()`, and MDX with unregistered component names seeded silently into the database.

The top mitigation strategy across the board is staged verification: wire one piece, test it in isolation, then extend. Do not replace `HARDCODED_USER_ID` globally before verifying RLS works with a real Clerk JWT. Do not bulk-generate all 598 lessons before running a pilot lesson per pillar and validating MDX component names, quiz question IDs, and content quality. Do not build the FSRS review page before confirming card state is actually persisted after a `repeat()` call.

---

## Key Findings

### Recommended Stack

The baseline stack (Next.js 16, Supabase, Clerk v6.39, Tailwind v4, next-mdx-remote-client) is in production and must not be changed. All new stack additions are narrowly scoped to the three new feature areas.

**Core technologies (new additions only):**
- `@anthropic-ai/sdk@^0.78.0`: Official Claude API client — supports tool use with Zod, streaming, automatic retries, and the Batch API. Must run in Node.js (not Edge Runtime). Reads `ANTHROPIC_API_KEY` from env automatically.
- `ts-fsrs@^5.2.3`: Official TypeScript FSRS implementation from the open-spaced-repetition org. Handles all four rating paths (Again/Hard/Good/Easy), card state serialization, and scheduling. Zero dependencies. Edge-compatible.
- `tsx@^4.x` (dev dep): Runs TypeScript CLI scripts directly via esbuild — the correct tool for the generation scripts directory that lives outside Next.js.
- `p-limit@^6.x`: Concurrency control for bulk lesson generation (cap at 3–5 concurrent Claude API calls to avoid rate limiting). ESM-only in v6.
- `commander@^12.x`: CLI argument parsing for the generation entry point.
- `zod@^3.x`: Schema validation for Claude output — generated MDX is `unknown` and must be validated before any database insert.

**Key version constraints:**
- `@anthropic-ai/sdk` requires Node.js 20 LTS+. Cannot run in Edge Runtime.
- `@clerk/nextjs@^6.39.0` already installed — v2.0 work is wiring only (middleware, sign-in page, env vars).
- `p-limit@^6` is ESM-only. Use dynamic import or add `"type": "module"` to CLI scripts if CJS conflicts arise.

**What NOT to install:** Vercel AI SDK (`ai`) for the CLI pipeline (streaming abstractions are unnecessary for batch DB writes), `fsrs.js` (deprecated in favor of `ts-fsrs`), `authMiddleware()` (deprecated in Clerk v5+).

See `.planning/research/STACK.md` for full alternatives analysis.

### Expected Features

All three feature areas have clear MVP definitions verified against official Anki UX patterns, Clerk docs, and the existing v1.0 codebase.

**Must have (table stakes — v2.0 is not shippable without these):**
- Clerk middleware protecting all non-public routes — currently the middleware runs but protects nothing
- Sign-in page at `/sign-in` rendering `<SignIn />` with three Clerk environment variables set
- `fsrs_cards` and `fsrs_review_logs` Supabase migration — new tables, not in v1.0 schema
- Dashboard "Due today" widget with count and link to `/review`
- Review page at `/review` with question-flip flow, four rating buttons (Again/Hard/Good/Easy), and FSRS state persistence after each rating
- Auto-seeding of FSRS cards when a lesson is marked complete (bridge from existing quiz engine to FSRS)
- Content generation CLI that validates MDX, handles idempotency, and upserts to Supabase
- Pillars 2–7 content generated (all ~598 lessons with `mdx_content` populated)

**Should have (add after v2.0 core is stable):**
- Interval hint per rating button (shows "Good — 4 days" before tapping) — low cost, high trust value
- Force-redirect to `/dashboard` post-sign-in instead of `/`
- `UserButton` (sign-out) in the header
- `--dry-run` CLI flag for auditing generated quality without writing to DB
- Per-pillar scope flag (`--pillar N`) on the CLI
- Session summary screen after review batch completes
- Orchestrator + research sub-agent content generation (upgrade from flat generation if quality is insufficient)
- Retry with exponential backoff on Claude API rate limit errors

**Explicitly deferred to v3+ or permanently out of scope:**
- On-demand lesson generation (5–15s latency per lesson page open violates core UX)
- FSRS parameter optimization per user (needs 500+ reviews; not meaningful at v2.0 launch)
- Real Supabase RLS enforcement via Clerk JWT (significant refactor; schedule as a hardening milestone)
- Anki import/export, SM-2 fallback, review push/email notifications

See `.planning/research/FEATURES.md` for the full prioritization matrix and feature dependency graph.

### Architecture Approach

The v2.0 architecture follows a clean separation: a standalone Node.js CLI pipeline writes content to Supabase, and the Next.js app reads and serves it. This separation is correct because content generation takes 30–120 seconds per lesson (incompatible with serverless function limits) and is triggered by the developer, not the user. The review session splits cleanly into a Server Component page (fetches due cards, passes to client) and a Client Component (manages flashcard state, calls server actions on each rating).

**Major components:**
1. **Content Generation CLI** (`scripts/` directory, Node.js) — orchestrator calls Claude API (opus for research, sonnet for MDX writing), validates output, upserts to `lessons` table. Fully separate from Next.js. Uses admin Supabase client.
2. **Clerk Middleware** (`src/middleware.ts`, Edge) — `clerkMiddleware()` + `createRouteMatcher()` + `auth.protect()`. Blocks unauthenticated access to all routes except `/sign-in`.
3. **FSRS Server Actions** (`src/lib/actions/fsrs.ts`) — `submitFsrsReview()`, `getDueCardCount()`, `getDueCards()`. The only layer that calls `ts-fsrs` and writes to `fsrs_cards` + `fsrs_review_logs`.
4. **ReviewSession Client Component** (`src/components/fsrs/ReviewSession.tsx`) — stateful flashcard UI (question, reveal, four rating buttons). Calls server actions on each rating.
5. **FSRS Database** (migration `00004_fsrs_tables.sql`) — `fsrs_cards` (mutable, one per user per question) + `fsrs_review_logs` (append-only). Critical index on `(user_id, due)` for the due-today query.
6. **Dashboard Widget** (`src/components/fsrs/FsrsWidget.tsx`, Server Component) — single query for due count, conditional render above the pillar grid.

**Build order constraint (non-negotiable):**
- Phase A (Auth wiring) must complete and be verified before Phase C (FSRS UI) — the review page calls `auth()`
- Phase B (FSRS tables + actions) must complete before Phase C (FSRS UI) — UI depends on server actions that depend on table existence
- Phase E (Content CLI) is fully independent — can run in parallel with Phases A–D

See `.planning/research/ARCHITECTURE.md` for the full component boundary table, all code patterns, and the complete build sequence.

### Critical Pitfalls

Research identified 13 named pitfalls across three domains. The most critical (those marked CRITICAL in PITFALLS.md) are:

1. **Middleware runs but protects nothing (C1)** — the existing `clerkMiddleware()` skeleton protects zero routes by default. Must add `createRouteMatcher` + `auth.protect()` AND verify with an incognito window hitting a protected route. Recovery is easy; the problem is it is invisible without explicit verification.

2. **FSRS card state not persisted after `repeat()` (B2)** — `ts-fsrs` does not mutate state in place or write to any database. The developer must explicitly upsert `fsrs_cards` AND insert to `fsrs_review_logs` after every rating. Symptom: `reps` column never advances past 1, due dates never advance. Build a round-trip integration test before building the review UI.

3. **AI generates MDX with unregistered component names (A1)** — Claude hallucinates `<HookSection>` instead of `<Hook>`, and `next-mdx-remote` renders nothing for unregistered components with no error or warning. Fix: include exact JSX signatures in the system prompt as a non-negotiable contract, and build a post-generation validator that cross-references all JSX component names against a hardcoded allowlist before any Supabase insert.

4. **Malformed JSX crashes all lesson pages (A2)** — unclosed tags or invalid props in generated MDX cause `compileMDX` to throw at request time, giving every visitor a 500 error. Fix: the CLI must attempt `compileMDX` on generated content in a sandbox before inserting to the database.

5. **Progress writes break when switching from admin client to real `auth()` (C2)** — RLS policies exist but were never tested with a real Clerk JWT because the admin client was always used. The Supabase third-party auth dashboard configuration may be missing. Verify the RLS integration works before replacing `HARDCODED_USER_ID` anywhere.

See `.planning/research/PITFALLS.md` for the full pitfall catalog, the "Looks Done But Isn't" checklist, and recovery strategies per pitfall.

---

## Implications for Roadmap

Based on the architecture's explicit build order and the feature dependency graph, the natural phase structure is five phases matching the ARCHITECTURE.md build phases A through E.

### Phase 1: Clerk Auth Wiring

**Rationale:** Auth is a prerequisite for all user-scoped data. The review page calls `auth()`. FSRS cards are keyed on `user_id`. All data-fetching pages currently hardcode a user ID that must be replaced with the real Clerk user once middleware is enforced. This must be first — building anything else on top of the hardcoded user pattern creates rework.

**Delivers:** Real auth enforcement. Unauthenticated users hit `/sign-in`. Authenticated users proceed. All server actions and data pages use the real Clerk `userId` from `auth()`. Post-sign-in redirect to `/dashboard`.

**Implements features:** Clerk middleware with `createRouteMatcher` + `auth.protect()`, sign-in page at `app/sign-in/[[...sign-in]]/page.tsx`, `HARDCODED_USER_ID` replacement in `progress.ts` and all data pages, three Clerk environment variables in `.env.local` and Vercel.

**Critical pitfall avoidance:** C1 (middleware protects nothing — verify with incognito), C2 (progress writes break on client switch — test RLS with real JWT first), C3 (Supabase dashboard not configured for Clerk — verify this before writing any code), C4 (sign-in URL env vars missing), C5 (prefetch errors on protected links from public pages).

**Verification gate:** Incognito window hitting `/pillars/[any-slug]` must redirect to `/sign-in`. After sign-in, progress must write to Supabase under the real Clerk userId — not the hardcoded string — confirmed by inspecting the `progress` table.

### Phase 2: FSRS Database and Server Actions

**Rationale:** The FSRS tables and server actions are the foundation the review UI depends on. Building them before the UI allows isolated testing of the data layer — confirm `getDueCardCount()` returns 0 (no cards yet), confirm `submitFsrsReview()` advances the `reps` counter in the database. This isolation prevents discovering data layer bugs through UI symptoms.

**Delivers:** `fsrs_cards` and `fsrs_review_logs` tables deployed with correct RLS, indexes on `(user_id, due)`, and the updated-at trigger. TypeScript types added to `database.types.ts`. Server actions for `getDueCardCount()`, `getDueCards()`, and `submitFsrsReview()` implemented and integration-tested.

**Installs:** `ts-fsrs@^5.2.3`

**Critical pitfall avoidance:** B1 (FSRS state mistakenly added to the append-only `quiz_attempts` table — use a dedicated `fsrs_cards` table), B2 (card state not persisted after `repeat()` — integration test before UI is built), B4 (due count mismatch between widget and review page — share a single `getDueCards()` function from the start).

**Verification gate:** Manually invoke `getDueCardCount()` and confirm it returns 0. Rate a card via `submitFsrsReview()` and verify `reps` increments to 1 in the `fsrs_cards` table.

### Phase 3: FSRS Review UI and Dashboard Widget

**Rationale:** UI can only be built once the data layer is verified. The `ReviewSession` client component calls `submitFsrsReview()` on each rating — this server action must exist and work before the component can be built meaningfully. The dashboard widget is a single server component that reads `getDueCardCount()` — it can be added to `app/page.tsx` in minutes once the action exists.

**Delivers:** Review page at `/review` with flashcard flow (question shown, user thinks, reveals answer, rates with four buttons, advances to next card, completion screen). Dashboard widget showing "X cards due today" linking to `/review`.

**Implements features:** `ReviewSession.tsx` (Client Component with showAnswer toggle and four rating buttons), `app/review/page.tsx` (Server Component wrapper), `app/review/loading.tsx` (skeleton), `FsrsWidget.tsx` (Server Component in dashboard).

**Critical pitfall avoidance:** B3 (binary rating instead of 4-point FSRS scale — the review UX must be a distinct flashcard flow, not a reuse of the existing Quiz component), B5 (no bootstrap from quiz history — run the one-time `seed-fsrs-from-history.ts` script after tables are live so early quiz attempts are not discarded).

**Verification gate:** `/review` with no due cards shows the empty state. Dashboard widget shows 0 due. After `seed-fsrs-from-history.ts` runs, due cards appear and rating them advances their state. Dashboard due count decreases after completing a review session.

### Phase 4: FSRS Bootstrap from Quiz History

**Rationale:** The single user has accumulated quiz attempt history from v1.0. Without a bootstrap, every previously-answered question re-enters the queue as new on day one — a poor first impression that undermines trust in the review system. This is a one-time CLI script. It is listed as its own phase because it is a distinct deliverable with a distinct verification step, not because it requires a full planning cycle.

**Delivers:** `scripts/seed-fsrs-from-history.ts` — replays `quiz_attempts` through FSRS to create initial card states. Questions with multiple correct answers enter as `state = 'Review'`. Questions with one correct answer as `state = 'Learning'`. Unattempted questions remain `state = 'New'` and enter the queue only when their lesson is next completed.

**Critical pitfall avoidance:** B5 (FSRS bootstrap skipped — user re-learns all of Pillar 1 from scratch despite extensive quiz history).

**Verification gate:** After running the script, `fsrs_cards` has rows. Dashboard due count reflects the bootstrapped queue. `/review` shows the expected cards with non-zero stability values.

### Phase 5: Content Generation CLI and Bulk Content

**Rationale:** The CLI pipeline is fully independent of Phases 1–4 — it uses the admin Supabase client directly and has no dependency on Clerk auth or FSRS. It can be built concurrently with any of the above phases. It is listed last because bulk generation of ~598 lessons is the longest-running operation and should begin after the rendering pipeline is confirmed working (so generated lessons render correctly immediately after seeding).

**Delivers:** `scripts/generate-lesson.ts` CLI entry point, research agent (claude-opus-4-6), writer agent (claude-sonnet-4-6), MDX validator (component name allowlist plus `compileMDX` sandbox), Supabase seed function with version archiving. All Pillars 2–7 content generated and seeded.

**Installs:** `@anthropic-ai/sdk@^0.78.0`, `commander@^12.x`, `p-limit@^6.x`, `tsx@^4.x` (dev dep), `zod@^3.x`

**Critical pitfall avoidance:** A1 (unregistered component names — validator with allowlist), A2 (malformed JSX — `compileMDX` sandbox before insert), A3 (non-idempotent pipeline — upsert on conflict plus `--skip-existing` flag), A4 (wrong `questionId` values — pre-generate UUIDs before calling Claude), A5 (flat pedagogical content — pilot one lesson per pillar before bulk run), A6 (cost overrun — estimate tokens per pillar, use Anthropic Batch API for 50% discount on bulk runs).

**Verification gate:** Run CLI on a single lesson end-to-end. Verify the lesson renders correctly at its URL. Verify the CLI is idempotent (re-running the same lesson does not duplicate it). Review a pilot lesson per new pillar for content quality before bulk generation begins.

### Phase Ordering Rationale

- Phases 1–4 are strictly sequenced by dependency: auth gates user-scoped data, tables gate server actions, actions gate UI components, bootstrap gates meaningful first-session UX.
- Phase 5 is parallel-capable but operationally best started after the platform is verified end-to-end (auth working, FSRS working, lessons rendering), so generated content is immediately reviewable and reviewable cards are immediately seedable.
- The FEATURES.md dependency graph confirms: Clerk auth gates FSRS (review cards require real `user_id`), and content generation amplifies FSRS (more completed lessons means more quiz questions entering the review queue), but FSRS is useful from day one with just Pillar 1's existing quiz questions.

### Research Flags

Phases with well-documented patterns — standard implementation, no additional research needed:

- **Phase 1 (Clerk Auth):** All patterns verified against official Clerk and Supabase docs. Middleware code, sign-in page file path, env variable names, and RLS verification steps are all confirmed. No research phase needed.
- **Phase 2 (FSRS Database):** SQL schema, indexes, RLS policy pattern, and ts-fsrs API are fully documented. No research phase needed.
- **Phase 3 (FSRS Review UI):** Component structure and data flow are fully designed. Standard Next.js Server/Client split. No research phase needed.
- **Phase 4 (FSRS Bootstrap):** One-time script with clear algorithm — replay `quiz_attempts` chronologically through ts-fsrs. No research phase needed.

Phases that benefit from a focused spike before execution:

- **Phase 5 (Content Generation CLI — bulk generation specifics):** The orchestrator + research sub-agent pattern is MEDIUM confidence (third-party sources, corroborated by Anthropic patterns). Recommend flat generation for the initial CLI (simpler, lower risk) and upgrading to the orchestrator pattern only if pilot quality is insufficient. A focused spike on `client.messages.batches` API behavior and Anthropic prompt caching before the first bulk pillar run is worthwhile — these two mechanisms reduce cost by 50–90% and the spike is less than an hour against official docs.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified against official npm registry and GitHub. Version compatibility confirmed. No community-sourced speculation. |
| Features | HIGH | Table stakes features verified against Anki UX patterns, Clerk docs, and the existing v1.0 codebase. Feature dependency graph confirmed against the actual schema migration. Anti-features are explicitly reasoned, not arbitrary. |
| Architecture | HIGH | Based on direct codebase inspection of v1.0 source (`middleware.ts`, `server.ts`, `progress.ts`, schema migration `00001`). Integration patterns confirmed against official Clerk and ts-fsrs docs. Build order is derived from actual file dependencies, not speculation. |
| Pitfalls | HIGH | CRITICAL pitfalls are grounded in the actual v1.0 code. C1 confirmed by inspecting the bare `clerkMiddleware()` call. C2 confirmed by tracing the admin client pattern through `progress.ts`. B2 is a documented ts-fsrs gotcha. A1 is a known LLM code generation failure mode. Not speculative. |

**Overall confidence:** HIGH

### Gaps to Address

Two gaps require validation during implementation, not additional research:

- **Supabase third-party auth dashboard configuration for Clerk (Pitfall C3):** The code pattern is correct, but whether the Supabase dashboard has Clerk configured as a third-party auth provider cannot be confirmed from research alone. This is the first verification step in Phase 1 — run a simple user-scoped query before touching any application code.

- **Orchestrator + sub-agent content quality uplift:** The research sub-agent pattern is documented but the actual quality delta for this platform's specific lesson format is unverified. The recommendation is to pilot flat generation first and only invest in the orchestrator pattern if quality is visibly insufficient after reviewing a pilot lesson. This is a conditional execution path, not a design gap.

- **`p-limit` ESM compatibility with the `scripts/` directory:** If CJS/ESM conflicts arise when importing `p-limit@^6` in the CLI scripts, the fix is to use dynamic import. Minor implementation detail.

---

## Sources

### Primary (HIGH confidence)
- [github.com/anthropics/anthropic-sdk-typescript](https://github.com/anthropics/anthropic-sdk-typescript) — SDK streaming, tool use, batch API patterns
- [platform.claude.com/docs/en/api/sdks/typescript](https://platform.claude.com/docs/en/api/sdks/typescript) — tool runner, batch API, prompt caching
- [npmjs.com/package/@anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk) — version 0.78.0 confirmed
- [github.com/open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) — Card state machine, Rating enum, `repeat()` API, `createEmptyCard()`
- [npmjs.com/package/ts-fsrs](https://www.npmjs.com/package/ts-fsrs) — version 5.2.3, Node 18+ minimum confirmed
- [clerk.com/docs/reference/nextjs/clerk-middleware](https://clerk.com/docs/reference/nextjs/clerk-middleware) — `clerkMiddleware()`, `createRouteMatcher`, `auth.protect()`
- [clerk.com/docs/nextjs/guides/development/custom-sign-in-or-up-page](https://clerk.com/docs/nextjs/guides/development/custom-sign-in-or-up-page) — sign-in page route structure and required env vars
- [clerk.com/changelog/2025-03-31-supabase-integration](https://clerk.com/changelog/2025-03-31-supabase-integration) — native Supabase integration replacing the deprecated JWT template approach
- [supabase.com/docs/guides/auth/third-party/clerk](https://supabase.com/docs/guides/auth/third-party/clerk) — Supabase dashboard configuration for Clerk
- [docs.ankiweb.net/studying.html](https://docs.ankiweb.net/studying.html) — Again/Hard/Good/Easy UX pattern, show-answer flow reference
- v1.0 codebase inspection: `src/middleware.ts`, `src/lib/supabase/server.ts`, `src/lib/actions/progress.ts`, `src/constants/user.ts`, `supabase/migrations/00001_initial_schema.sql` — ground truth for integration points

### Secondary (MEDIUM confidence)
- [deepwiki.com/open-spaced-repetition/ts-fsrs](https://deepwiki.com/open-spaced-repetition/ts-fsrs) — `createEmptyCard()`, `fsrs.repeat()`, session flow patterns
- [github.com/ishiko732/ts-fsrs-demo](https://github.com/ishiko732/ts-fsrs-demo) — reference Next.js + PostgreSQL integration pattern
- [anthropic.com/engineering/multi-agent-research-system](https://www.anthropic.com/engineering/multi-agent-research-system) — orchestrator + sub-agent architecture pattern
- [cursor-ide.com/blog/claude-subagents](https://www.cursor-ide.com/blog/claude-subagents) — Planner-Worker-Evaluator multi-agent pattern (corroborated by Anthropic)

### Tertiary (LOW confidence, needs validation)
- [dev.to/bredmond1019/multi-agent-orchestration](https://dev.to/bredmond1019/multi-agent-orchestration-running-10-claude-instances-in-parallel-part-3-29da) — parallel sub-agent generation patterns (third-party; validate against actual Batch API behavior before using)

---

*Research completed: 2026-03-02*
*Ready for roadmap: yes*
