# Roadmap: Personal Learning Curriculum Platform

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-03-02)
- 🚧 **v2.0 Content & Retention** — Phases 8-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-7) — SHIPPED 2026-03-02</summary>

- [x] Phase 1: Infrastructure (3/3 plans) — completed 2026-02-27
- [x] Phase 2: App Shell + Navigation (2/2 plans) — completed 2026-02-27
- [x] Phase 3: Lesson Content Pipeline (2/2 plans) — completed 2026-02-28
- [x] Phase 4: Quiz Engine (2/2 plans) — completed 2026-03-01
- [x] Phase 5: Progress + Dashboard (2/2 plans) — completed 2026-03-01
- [x] Phase 7: Verification + Code Cleanup (1/1 plan) — completed 2026-03-01
- [x] Phase 6: Seed Content (2/2 plans) — completed 2026-03-02

Full details: `milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v2.0 Content & Retention (In Progress)

**Milestone Goal:** Fill all 7 pillars with AI-generated content via a reusable CLI pipeline, add spaced repetition for long-term retention, and wire up authentication.

- [x] **Phase 8: Clerk Auth Wiring** — Real auth enforcement: sign-in page, middleware protection, remove hardcoded user (completed 2026-03-03)
- [x] **Phase 9: FSRS Data Layer** — FSRS tables in Supabase, auto-seed cards from lesson completion, server actions (completed 2026-03-03)
- [ ] **Phase 10: FSRS Review UI** — Review page with flashcard flow, rating buttons, dashboard due-today widget
- [ ] **Phase 11: Content Generation CLI** — CLI pipeline: Claude API orchestrator + writer, MDX validation, idempotent seeding
- [ ] **Phase 12: Bulk Content Generation** — All ~598 remaining lessons across Pillars 2-7 generated and seeded

## Phase Details

### Phase 8: Clerk Auth Wiring
**Goal**: Users are authenticated via Clerk — protected routes redirect unauthenticated visitors to `/sign-in`, and the platform uses the real Clerk userId everywhere
**Depends on**: Nothing (builds on v1.0 Clerk scaffolding already in place)
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. An unauthenticated user visiting any non-public route (e.g., `/dashboard`, `/pillars/any-slug`) is redirected to `/sign-in`
  2. The `/sign-in` page renders the Clerk `<SignIn />` component and is publicly accessible
  3. After signing in, the user lands on `/dashboard` — not the root `/`
  4. Progress writes recorded in Supabase show the real Clerk userId (not a hardcoded string), confirmed by inspecting the `progress` table
**Plans**: 1 plan
- [ ] 08-01-PLAN.md — Middleware route protection, sign-in page, and userId replacement

### Phase 9: FSRS Data Layer
**Goal**: FSRS card state lives in Supabase and review cards are automatically created when a lesson is completed
**Depends on**: Phase 8
**Requirements**: FSRS-01, FSRS-02
**Success Criteria** (what must be TRUE):
  1. The `fsrs_cards` and `fsrs_review_logs` tables exist in Supabase with the correct schema (due, stability, difficulty, state, reps, lapses) and RLS policies
  2. Completing a lesson causes quiz questions from that lesson to appear as new rows in `fsrs_cards`
  3. Calling `submitFsrsReview()` on a card increments its `reps` counter in the database and advances its due date — confirmed by querying the table directly
  4. Calling `getDueCardCount()` returns 0 when no cards are due and a positive integer after cards are seeded
**Plans**: 2 plans
- [ ] 09-01-PLAN.md — Install ts-fsrs, create FSRS migration, add TypeScript types
- [ ] 09-02-PLAN.md — Extend markLessonComplete() card seeding, create fsrs.ts server actions

### Phase 10: FSRS Review UI
**Goal**: Users can review due flashcards on a dedicated page and track their review queue on the dashboard
**Depends on**: Phase 9
**Requirements**: FSRS-03, FSRS-04, FSRS-05, FSRS-06, FSRS-07
**Success Criteria** (what must be TRUE):
  1. The dashboard shows an "X due today" widget that links to `/review` — widget is absent when zero cards are due
  2. The `/review` page presents cards one at a time: question shown first, answer revealed on tap, four rating buttons (Again / Hard / Good / Easy) with interval hints (e.g., "Good — 4 days")
  3. Rating a card advances to the next card and the dashboard due count decreases accordingly
  4. Card state (reps, due date, stability) is persisted to `fsrs_cards` in Supabase after each rating
  5. When no cards are due, `/review` shows an "All caught up" state with the time until the next card is due
**Plans**: 2 plans
- [ ] 10-01-PLAN.md — getDueCardsForReview/getNextDueCard server actions + dashboard due-today widget
- [ ] 10-02-PLAN.md — /review page with ReviewSession card-flip flow + "All caught up" state

### Phase 11: Content Generation CLI
**Goal**: A developer-run CLI pipeline can generate validated MDX lessons for any scope (pillar / semester / course) and seed them idempotently into Supabase
**Depends on**: Nothing (fully independent — can run in parallel with Phases 8-10)
**Requirements**: GEN-01, GEN-02, GEN-03, GEN-04, GEN-05, GEN-06, GEN-07, GEN-08
**Success Criteria** (what must be TRUE):
  1. Running `pnpm generate --pillar 2 --course some-course-slug` generates a lesson, validates its MDX against the component allowlist, and upserts it into `lessons.mdx_content` — the lesson renders correctly at its URL
  2. Running the same command twice does not duplicate the lesson — the second run is a no-op unless `--force` is passed
  3. Running with `--dry-run` prints the validated MDX to stdout and writes nothing to the database
  4. The CLI prints per-lesson progress (e.g., `[3/12] Generating: "Topic Name"...`) throughout execution
  5. API rate limit errors (429/529) trigger automatic retry with exponential backoff rather than crashing the CLI
**Plans**: TBD

### Phase 12: Bulk Content Generation
**Goal**: All ~598 remaining lessons across Pillars 2-7 are generated, validated, and seeded into Supabase — the full curriculum is available for learners
**Depends on**: Phase 11
**Requirements**: CONT-01
**Success Criteria** (what must be TRUE):
  1. Every course in Pillars 2-7 has all its lessons present in Supabase with non-empty `mdx_content`
  2. A pilot lesson per new pillar renders correctly at its URL with all MDX components displaying (Hook, ConceptBlock, Quiz, DeepDive, Exercise, Takeaways)
  3. Pillar progress rings on the dashboard reflect real lesson counts for all 7 pillars
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Infrastructure | v1.0 | 3/3 | Complete | 2026-02-27 |
| 2. App Shell + Navigation | v1.0 | 2/2 | Complete | 2026-02-27 |
| 3. Lesson Content Pipeline | v1.0 | 2/2 | Complete | 2026-02-28 |
| 4. Quiz Engine | v1.0 | 2/2 | Complete | 2026-03-01 |
| 5. Progress + Dashboard | v1.0 | 2/2 | Complete | 2026-03-01 |
| 7. Verification + Cleanup | v1.0 | 1/1 | Complete | 2026-03-01 |
| 6. Seed Content | v1.0 | 2/2 | Complete | 2026-03-02 |
| 8. Clerk Auth Wiring | 1/1 | Complete   | 2026-03-03 | - |
| 9. FSRS Data Layer | 2/2 | Complete   | 2026-03-03 | - |
| 10. FSRS Review UI | 1/2 | In Progress|  | - |
| 11. Content Generation CLI | v2.0 | 0/? | Not started | - |
| 12. Bulk Content Generation | v2.0 | 0/? | Not started | - |
