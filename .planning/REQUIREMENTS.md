# Requirements: Personal Learning Curriculum Platform

**Defined:** 2026-03-02
**Core Value:** Every lesson must be so frictionless to start and so engaging to continue that the learner never talks themselves out of opening one.

## v2.0 Requirements

Requirements for v2.0 Content & Retention milestone. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can sign in via Clerk sign-in page at `/sign-in`
- [x] **AUTH-02**: Unauthenticated user is redirected to `/sign-in` from any protected route
- [x] **AUTH-03**: User is redirected to `/dashboard` after successful sign-in

### FSRS Spaced Repetition

- [x] **FSRS-01**: `review_cards` table exists in Supabase with FSRS card state fields (due, stability, difficulty, state, reps, lapses)
- [x] **FSRS-02**: Review cards are auto-seeded from quiz questions when a lesson is completed
- [x] **FSRS-03**: Dashboard shows "X due today" widget with link to review page
- [ ] **FSRS-04**: User can review due cards on `/review` page with card-flip flow (question → show answer → rate)
- [ ] **FSRS-05**: Rating buttons show interval hints per option (e.g., "Good → 4 days")
- [ ] **FSRS-06**: Card state is persisted to Supabase after each rating
- [ ] **FSRS-07**: User sees "All caught up" state when no cards are due with next review time

### Content Generation Pipeline

- [ ] **GEN-01**: CLI entry point (`pnpm generate`) accepts scope flags for pillar, semester, or course
- [ ] **GEN-02**: Generated MDX is validated against lesson template (required components: Hook, ConceptBlock, Quiz, DeepDive, Exercise, Takeaways)
- [ ] **GEN-03**: Generated content is seeded into `lessons.mdx_content` with `lesson_versions` history
- [ ] **GEN-04**: CLI reports progress per lesson during generation (e.g., `[3/12] Generating: "Topic Name"...`)
- [ ] **GEN-05**: Pipeline skips already-generated lessons by default with `--force` flag to override
- [ ] **GEN-06**: Dry-run mode (`--dry-run`) validates output without writing to database
- [ ] **GEN-07**: Retry with exponential backoff on API rate limit errors (429/529)
- [ ] **GEN-08**: Orchestrator + research sub-agent pattern produces deep, topic-specific lesson content

### Content

- [ ] **CONT-01**: All ~598 remaining lessons across Pillars 2-7 are generated and seeded in Supabase

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Auth Hardening

- **AUTH-04**: Supabase RLS enforced via real Clerk JWT (replace admin client pattern with user-scoped client)
- **AUTH-05**: UserButton (avatar + sign-out) displayed in header

### FSRS Enhancements

- **FSRS-08**: Session summary after review batch (cards reviewed, accuracy)
- **FSRS-09**: "New cards today" count alongside "Due today" on dashboard
- **FSRS-10**: FSRS parameter optimization per user after 500+ reviews

### Content Generation Enhancements

- **GEN-09**: Content quality scoring (pedagogical depth, not just structural validation)
- **GEN-10**: Batch API support for cost optimization on bulk generation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| On-demand lesson generation (in-app) | 5-15s latency violates "frictionless to start" core value |
| FSRS from vocabulary terms | Quiz questions already have Q/A structure; vocabulary lacks it |
| Anki import/export | Review cards tied to lesson context; imported decks have none |
| Review notifications (push/email) | Requires notification infrastructure; dashboard widget is sufficient |
| SM-2 fallback | FSRS strictly dominates; maintaining two algorithms doubles complexity |
| Multi-user roles / org management | Single-user platform; user_id + RLS is future-ready without org overhead |
| Streaming generation to browser | CLI pre-gen avoids partial content / version collision issues |
| Real-time collaboration | Async self-directed learning is the model |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 8 | Complete |
| AUTH-02 | Phase 8 | Complete |
| AUTH-03 | Phase 8 | Complete |
| FSRS-01 | Phase 9 | Complete |
| FSRS-02 | Phase 9 | Complete |
| FSRS-03 | Phase 10 | Complete |
| FSRS-04 | Phase 10 | Pending |
| FSRS-05 | Phase 10 | Pending |
| FSRS-06 | Phase 10 | Pending |
| FSRS-07 | Phase 10 | Pending |
| GEN-01 | Phase 11 | Pending |
| GEN-02 | Phase 11 | Pending |
| GEN-03 | Phase 11 | Pending |
| GEN-04 | Phase 11 | Pending |
| GEN-05 | Phase 11 | Pending |
| GEN-06 | Phase 11 | Pending |
| GEN-07 | Phase 11 | Pending |
| GEN-08 | Phase 11 | Pending |
| CONT-01 | Phase 12 | Pending |

**Coverage:**
- v2.0 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after roadmap creation — all 19 requirements mapped*
