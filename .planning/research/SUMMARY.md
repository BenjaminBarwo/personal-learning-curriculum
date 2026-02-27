# Project Research Summary

**Project:** Personal Learning Curriculum Platform
**Domain:** Self-directed learning platform (single-learner, AI-assisted content generation)
**Researched:** 2026-02-27
**Confidence:** HIGH (stack and architecture), MEDIUM (features)

## Executive Summary

This is a bespoke, single-learner curriculum platform — closest in spirit to a personal Khan Academy with Anki's retention engine and product-grade polish. Experts build this class of platform by treating the content rendering pipeline as the product: the quality of the lesson experience (MDX component system, typography, quiz feedback, progress continuity) determines whether learners return. Research confirms the proposed stack (Next.js 15 + Supabase + Clerk + Tailwind + MDX via next-mdx-remote + Claude API) is well-validated for 2025/2026. The App Router's server-first rendering model is a strong fit — MDX compiles server-side, interactive quiz and tooltip components hydrate as islands, and progress data fetches are never client-side.

The recommended approach is to build the content experience before any AI integration. Phase 1 must prove the lesson renders correctly, progress persists, and quizzes provide useful feedback — all with hand-written seed content. AI content generation (Phase 2) and spaced repetition (Phase 3) depend on Phase 1 being solid: AI generation requires a working MDX rendering pipeline to display generated content, and FSRS requires accumulated quiz attempt history. Deferring these is not a concession; it is the correct dependency order.

The primary risk is infrastructure complexity in Phase 1. Five critical pitfalls must be resolved before the first component is written: Clerk + Supabase JWT integration (without this, `auth.uid()` returns null and all RLS fails), service role key boundary enforcement, correct RLS policy design, the Server/Client component split, and MDX hydration validation. None of these are hard problems in isolation, but each can consume days if discovered reactively. The mitigation is simple: resolve them in order before writing any application code.

---

## Key Findings

### Recommended Stack

The stack is production-validated with high confidence across all categories. Next.js 15 App Router with React 19 is the current stable release and maps directly to the platform's three rendering concerns: static layout shell (server components), data-driven curriculum pages (async server components), and interactive lesson content (client component islands). Supabase provides Postgres, RLS, and storage — the `@supabase/ssr` package is the only correct integration for App Router; the legacy `@supabase/auth-helpers-nextjs` is deprecated. Clerk handles authentication with the least integration surface.

One architectural decision is non-negotiable before implementation starts: Clerk must be configured as the sole identity provider, and a Supabase JWT template must be created in the Clerk dashboard before any RLS policy is written. This one-time setup step is the dependency blocker for all data access patterns.

**Core technologies:**
- **Next.js 15 + App Router**: Framework — React 19, Turbopack, async route APIs; `cookies()` and `params` are now async in v15
- **Supabase + `@supabase/ssr`**: Database and storage — Postgres, RLS, PostgREST; `@supabase/auth-helpers-nextjs` is deprecated, do not use
- **Clerk `@clerk/nextjs` v6**: Authentication — OAuth, magic links, middleware protection; v6 is App Router-native
- **Tailwind CSS v4 + Shadcn/ui**: Styling — CSS-first config, Oxide engine; `@tailwindcss/typography` (`prose`) is mandatory for MDX content
- **next-mdx-remote v5 (RSC entrypoint)**: MDX rendering — required for App Router; v4 and `@next/mdx` are incompatible with database-stored MDX
- **Vercel AI SDK v4 + `@anthropic-ai/sdk`**: AI integration — `streamText()` for generation, `useChat()` for tutor; `claude-sonnet-4-6` for lessons, `claude-haiku-3` for hints
- **Zustand v5**: Client state — right-sized for quiz state and UI preferences; Redux is over-engineered for this scope
- **Vitest + Playwright + MSW**: Testing — Vitest replaces Jest; MSW mocks Supabase and Claude API calls without a real server
- **react-hook-form + zod**: Forms and validation — standard pairing; zod validates AI-generated content before DB storage

**Explicit rejections:** Prisma (Supabase client is sufficient), tRPC (Server Actions cover RPC), NextAuth.js (Clerk replaces it), Supabase Auth (conflicts with Clerk), Redux Toolkit (Zustand is sufficient), GraphQL/Apollo (PostgREST covers it), CSS Modules (Tailwind covers it).

See `/Users/benjaminbarwo/Downloads/Learning/.planning/research/STACK.md` for full package list and version rationale.

### Expected Features

The platform has a clear three-tier feature hierarchy. Table stakes features define the minimum acceptable product for Phase 1. Differentiators form a feature backlog that maps to Phases 2-4. Several anti-features are worth making explicit because they could easily be scoped in by mistake.

**Must have (table stakes — Phase 1):**
- Lesson rendering with full custom MDX component system (`Hook`, `ConceptBlock`, `Quiz`, `DeepDive`, `Exercise`, `Takeaways`, `Definition`)
- Hierarchical navigation (Pillar → Semester → Course → Lesson) with breadcrumbs and completion indicators at every level
- Progress tracking (started/completed per lesson, quiz scores persisted) with "continue where you left off"
- Inline quizzes with immediate feedback (multiple-choice and recall types minimum)
- Pillar color-coding system, dark mode (primary), mobile-responsive design
- Loading, error, and empty states on every async fetch
- Estimated lesson time on lesson cards
- Authentication (Clerk) with route protection

**Should have (differentiators — Phase 2-3):**
- AI content generation with pre-generation pipeline (not on-demand; 5-15s latency on open is a non-starter)
- Content versioning with rollback (safety net before AI generation can overwrite hand-written content)
- Collapsible DeepDive sections and domain terminology highlighting (Phase 1 stretch goals)
- Cross-pillar lesson connections UI (after 2+ pillars have content)
- Spaced repetition via FSRS algorithm (Phase 3; requires accumulated quiz history)
- AI tutor chat within lesson context (Phase 3; context window management is the complexity)

**Defer (Phase 4+):**
- Adaptive difficulty (requires substantial quiz history)
- Gamification, streaks, XP (motivation layer; core content must be compelling without it)
- PDF export, study scheduling, drag-and-drop quiz types

**Anti-features (do not build):**
- Social features, real-time collaboration, marketplace, video hosting — wrong product category
- On-demand AI generation per lesson open — latency violates UX contract; pre-generate and cache
- Filesystem-based content — breaks AI generation model; MDX belongs in Supabase
- SM-2 spaced repetition — FSRS is 20-30% more efficient; implement FSRS or defer entirely

See `/Users/benjaminbarwo/Downloads/Learning/.planning/research/FEATURES.md` for full feature dependency tree.

### Architecture Approach

The platform maps cleanly onto three rendering layers enabled by the App Router: a static shell (layouts, navigation chrome) rendered as server components with no data dependency; data-driven pages (dashboard, curriculum lists) as async server components; and interactive lesson islands (`<Quiz>`, `<DeepDive>`, `<Definition>`) hydrated as client components embedded inside server-rendered MDX. The key insight is that `next-mdx-remote/rsc` handles the server/client split inside MDX: display-only lesson blocks (`Hook`, `ConceptBlock`, `Exercise`, `Takeaways`) are server components in the RSC payload; interactive blocks are client islands. This gives optimal bundle size and correct rendering semantics without manual splitting.

All mutations flow through Server Actions (`app/actions/*.ts`) — never from client components directly to Supabase. All queries live in `lib/data/*.ts` wrapped with `React.cache()` for per-request deduplication. The Supabase client is created per-request in `lib/supabase/server.ts` using `@supabase/ssr` with the async cookies API. Pillar color tokens are injected as CSS custom properties in the `[pillarId]/layout.tsx` server component — no JavaScript, no context.

**Major components:**
1. **`middleware.ts`** — Clerk auth gate at the edge; protects all `/dashboard`, `/pillars/*` routes before any server component runs
2. **`app/(app)/layout.tsx`** — Authenticated app shell; sidebar, breadcrumbs, pillar color context
3. **`lib/data/*.ts`** — Data access layer; all Supabase queries, wrapped in `React.cache()`
4. **`app/actions/*.ts`** — Server Actions for all mutations; progress marking, quiz scoring
5. **`LessonRenderer`** — Server component wrapping `compileMDX`; MDX string in, React tree out
6. **`<Quiz>` / `<DeepDive>` / `<Definition>`** — Client component islands; `useActionState` for quiz, `useState` for toggles
7. **`ProgressRings` / `LessonProgressTracker`** — Client components; animation and fire-and-forget progress writes

**Suggested build order (architecture-derived):**
Database schema → Auth layer → Supabase data access layer → Server Actions → Layout shell → Navigation routes → MDX rendering pipeline → Display-only MDX components → Interactive MDX components → Dashboard + progress tracking → Seed content

See `/Users/benjaminbarwo/Downloads/Learning/.planning/research/ARCHITECTURE.md` for full component boundary table, data flow diagrams, and code patterns.

### Critical Pitfalls

Twenty-three specific pitfalls were identified. Seven are classified CRITICAL — any one of them can block progress for days if encountered reactively.

**Top 5 pitfalls with prevention:**

1. **Clerk + Supabase JWT integration broken (P2.3)** — Without the Clerk "Supabase" JWT template configured in the Clerk dashboard, `auth.uid()` returns null in every RLS policy, silently blocking all user-specific data access. Resolution: configure the JWT template on day one, verify with a raw `SELECT auth.uid()` query before writing any data access code.

2. **Service role key exposed to client (P2.2)** — The Supabase service role key bypasses all RLS. It must never appear in a `NEXT_PUBLIC_` variable or be imported by any file with `"use client"`. Resolution: establish two Supabase client factories (`createServerSupabaseClient` for server-only, `createAdminClient` for service role) before any Supabase code is written. Use `import 'server-only'` in any file using the service role client.

3. **RLS enabled without correct policies (P2.1)** — Enabling RLS on a table without policies returns zero rows (not an error), causing developers to add client-side `user_id` filters as a "fix" — defeating RLS entirely. Resolution: write the RLS policy for every table at the same time the table is created, never after.

4. **MDX serialization / hydration errors with client components (P3.3)** — Interactive MDX components (`Quiz`, `DeepDive`, `Definition`) must be `"use client"` and passed through the `components` map to `compileMDX`. Getting this wrong produces hydration mismatches and state loss on render. Resolution: prototype the full MDX hydration cycle — server compiles, client hydrates, user interacts, no console errors — before storing any real content.

5. **Content versioning not designed before first lesson stored (P2.5)** — The first MDX lesson stored in Supabase without a versioning table means Phase 2 AI generation can overwrite hand-written content with no rollback. Resolution: implement `lesson_content_versions` table in the Phase 1 schema, before seeding any content.

**Additional high-priority pitfalls for Phase 1:**
- Server/Client component boundary confusion (P1.1) — decide the split before writing the first component
- N+1 queries in navigation hierarchy (P2.4) — use Supabase embedded selects from the start
- MDX compiled on every request without caching (P3.1) — cache by `lesson_id + content_version`
- Quiz attempts not persisted for Phase 3 FSRS data (P5.2) — `quiz_attempts` table must be in Phase 1 schema
- Environment variables not set in Vercel production (P7.1) — verify on first deployment

See `/Users/benjaminbarwo/Downloads/Learning/.planning/research/PITFALLS.md` for all 23 pitfalls with warning signs and detailed prevention strategies.

---

## Implications for Roadmap

Research points clearly to a four-phase structure. The dependency graph is strict: rendering before AI, quiz data before spaced repetition, content quality before engagement features.

### Phase 1: Foundation — Content Experience
**Rationale:** Everything else depends on the MDX rendering pipeline, database schema, and auth integration being correct. This is the highest-risk phase because it contains all five CRITICAL pitfalls. No AI, no spaced repetition, no gamification — validate the core contract first: can a learner open a lesson, read structured content, answer a quiz, and have their progress remembered?
**Delivers:** Authenticated lesson experience with custom MDX components, inline quizzes, progress tracking, hierarchical navigation, pillar color system, dark mode, and mobile-responsive design. Seed content: 2 complete hand-written lessons for Pillar 1.
**Addresses (from FEATURES.md):** All 14 table stakes features plus 2 Phase 1 differentiators (collapsible DeepDive, terminology highlighting)
**Avoids (from PITFALLS.md):** P2.3 (JWT integration), P2.2 (service role key), P2.1 (RLS policies), P1.1 (component boundary), P3.3 (MDX hydration), P2.5 (content versioning schema), P5.2 (quiz attempts schema)
**Build order (architecture-derived):** Schema first → Auth layer → Data access layer → Server Actions → Layout shell → Routes → MDX pipeline → Display components → Interactive components → Dashboard → Seed content

### Phase 2: AI Content Generation
**Rationale:** Phase 2 requires Phase 1's MDX rendering pipeline to display generated content, and requires the content versioning table designed in Phase 1 as a safety net before any AI-generated content overwrites hand-written lessons. Pre-generation pipeline (not on-demand) must be designed to avoid the 5-15s latency anti-pattern.
**Delivers:** AI-assisted lesson generation for Pillars 2-7; pre-generation pipeline that caches compiled MDX in Supabase; content versioning with rollback; cross-pillar lesson connections (with 2+ pillars of content); admin tooling for content management
**Uses (from STACK.md):** `@anthropic-ai/sdk`, Vercel AI SDK `streamText()`, `claude-sonnet-4-6` for lessons / `claude-haiku-3` for ancillary content
**Implements (from ARCHITECTURE.md):** AI Route Handlers with Edge Runtime for streaming; `generated_content` cache table; MDX validation pipeline before DB storage (addresses P3.4)
**Avoids (from PITFALLS.md):** P3.4 (MDX validation before storage), P3.1 (cache compiled output)

### Phase 3: Retention — Spaced Repetition + AI Tutor
**Rationale:** FSRS spaced repetition requires accumulated quiz attempt history from at least Pillar 1's lessons being completed — this is why Phase 3 cannot move earlier. The AI tutor requires the Claude API integration from Phase 2 and adds context window management complexity (which lesson, which section, quiz state). Both features require Phase 2's content breadth to be meaningful.
**Delivers:** FSRS spaced repetition review system seeded from quiz attempt history; AI tutor chat with lesson context; application quiz types beyond multiple-choice (recall, analysis)
**Uses (from STACK.md):** FSRS open-source algorithm implementation; Vercel AI SDK `useChat()` for tutor streaming; `claude-sonnet-4-6` with lesson context in system prompt
**Avoids (from PITFALLS.md):** SM-2 algorithm (FSRS is 20-30% more efficient — confirm via open-benchmarks/fsrs before implementation)

### Phase 4: Engagement and Polish
**Rationale:** Motivation and convenience features that add value only after the core content experience is proven. Streak tracking, gamification, and adaptive difficulty all require the quiz history and user behavior data accumulated in Phases 1-3 to be meaningful.
**Delivers:** Streak tracking, milestone/trophy system (XP is lower priority than milestone events), adaptive quiz difficulty, PDF export, study scheduling / calendar integration
**Avoids (from FEATURES.md):** Over-gamification (patronizing), social features (wrong product category), points systems without milestone events

### Phase Ordering Rationale

- **Schema first in Phase 1** — the `lesson_content_versions` table and `quiz_attempts` table must exist before the first lesson is stored or the first quiz is answered; retrofitting these tables loses early data and requires migration
- **Auth before data access** — Clerk JWT template configuration must precede any RLS policy; RLS must precede any user data; this is a hard sequential dependency
- **Display components before interactive components** — MDX pipeline must work before quiz state machines are wired to it; validates the serialization model without the hydration complexity
- **Phase 2 requires Phase 1 MDX pipeline** — AI generates MDX strings; those strings must render correctly before the generation pipeline is meaningful
- **Phase 3 requires quiz history** — FSRS with zero or sparse history produces poor review schedules; at least one complete pillar's lessons and quiz attempts are needed before spaced repetition is useful

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (FSRS implementation):** Algorithm integration complexity is well-documented but the specific library choices (open source FSRS implementations for JavaScript/TypeScript) should be evaluated against the `quiz_attempts` schema before Phase 3 planning begins. Verify retention improvement claims (20-30% vs SM-2) against open-benchmarks/fsrs repository.
- **Phase 3 (AI tutor context management):** Claude API context window strategy for lesson-aware tutoring (which lesson, which section, what quiz state) needs a specific design pass. The general streaming pattern is well-established; the context packaging is project-specific.
- **Phase 2 (pre-generation pipeline design):** The batch generation architecture (when to trigger, how to queue, how to cache) needs a design pass before implementation. Vercel's background job support (via `experimental.after` in next.config.ts or a separate queue) should be evaluated.

Phases with standard patterns (research not needed):
- **Phase 1 (entire phase):** All patterns are well-documented in official Next.js 15 docs and the Clerk + Supabase integration guide. Architecture research confirms the patterns are current. No novel territory.
- **Phase 2 (AI streaming):** Vercel AI SDK + Claude API streaming is well-documented; `streamText()` and `toDataStreamResponse()` are the established patterns.
- **Phase 4 (streak tracking, gamification):** Date comparison logic and milestone events are standard patterns; no research needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages are current stable releases; official docs verified (Next.js 15, Clerk v6, Supabase SSR). Two decisions need confirmation before implementation: Clerk JWT template setup and MDX content storage format (raw MDX string vs JSON AST — raw MDX is recommended). |
| Features | MEDIUM | Feature list derived from comparable platforms (Khan Academy, Duolingo, Anki, Coursera) via training data. PROJECT.md is the high-confidence primary source. External search was unavailable during research; FSRS retention improvement claims (20-30% vs SM-2) need verification before Phase 3 planning. |
| Architecture | HIGH | Patterns sourced from official Next.js 15 documentation verified 2026-02-24. Clerk + Supabase JWT integration pattern is MEDIUM confidence — pattern is known but must be verified in Clerk dashboard at build time. |
| Pitfalls | HIGH | All 23 pitfalls are grounded in concrete failure modes observed across Next.js + Supabase + Clerk projects. CRITICAL pitfalls are well-documented failure patterns, not speculative risks. |

**Overall confidence:** HIGH — the domain is well-understood, the stack is production-validated, and the architecture patterns are sourced from official documentation. The primary uncertainty is in Phase 3 specifics (FSRS implementation, AI tutor context management) which are deferred by design.

### Gaps to Address

- **Clerk JWT template for Supabase:** This one-time configuration step is not in the codebase — it happens in the Clerk dashboard. It must be completed and verified (`SELECT auth.uid()` returning non-null) before any data access code is written. Flag as a Day 0 task.
- **MDX content storage format decision:** Raw MDX string in `lessons.mdx_content` (recommended, simpler) vs JSON AST (enables partial updates, more complex). This decision affects the schema and the AI generation output format. Decide before the schema is finalized.
- **Edge vs Node.js Runtime for AI generation routes:** Edge Runtime for streaming chat/hints (lower cold-start); Node.js for batch lesson generation (longer timeouts). Decide per-route based on payload size requirements before Phase 2 is planned.
- **FSRS JavaScript library selection:** Evaluate open-source FSRS implementations for TypeScript compatibility with the `quiz_attempts` schema before Phase 3 planning. Do not assume a specific library — verify availability and maintenance status.
- **Users table decision:** Does the schema need a `users` table in Supabase (for preferences and foreign keys), or can `user_id` be a bare Clerk user ID string in all tables? For single-user Phase 1, the bare string approach avoids webhook complexity. Decide at schema design time.

---

## Sources

### Primary (HIGH confidence)
- Next.js 15 official documentation (verified 2026-02-24): Server/Client Components, Data Fetching, Caching, Server Actions, Layouts, Route Groups, MDX Guide — `https://nextjs.org/docs/app/`
- `/Users/benjaminbarwo/Downloads/Learning/.planning/PROJECT.md` — project-specific context and requirements (primary source for feature decisions)

### Secondary (MEDIUM confidence)
- Anthropic Claude API + Vercel AI SDK v4 integration patterns — training data through August 2025; streaming patterns are established
- Clerk + Supabase JWT integration pattern — pattern documented in Clerk and Supabase docs; template configuration must be verified in Clerk dashboard at build time
- next-mdx-remote RSC import path (`/rsc` entrypoint) — training data; verify against installed package at build time
- Platform feature analysis (Duolingo, Khan Academy, Coursera, Anki, RemNote, Readwise) — training data through August 2025

### Tertiary (LOW confidence, needs verification)
- FSRS algorithm vs SM-2 retention improvement (20-30% claim) — verify at `https://github.com/open-spaced-repetition/fsrs-benchmark` before Phase 3 planning
- FSRS TypeScript library availability and maintenance status — verify on npm before Phase 3 planning

---
*Research completed: 2026-02-27*
*Ready for roadmap: yes*
