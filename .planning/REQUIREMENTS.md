# Requirements: Personal Learning Curriculum Platform

**Defined:** 2026-02-27
**Core Value:** Every lesson must be so frictionless to start and so engaging to continue that the learner never talks themselves out of opening one.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Navigation

- [x] **NAV-01**: User can view dashboard with pillar overview and "continue where you left off"
- [x] **NAV-02**: User can navigate Pillar → Semester → Course → Lesson hierarchy
- [x] **NAV-03**: User can see breadcrumb trail showing current location in hierarchy

### Lesson Content

- [x] **CONT-01**: User can view lessons rendered from MDX with custom components (Hook, ConceptBlock, DeepDive, Exercise, Takeaways)
- [x] **CONT-02**: User can expand/collapse DeepDive sections within lessons
- [x] **CONT-03**: User can hover/tap domain terminology to see inline definitions via Definition component
- [x] **CONT-04**: Lesson content is versioned with rollback capability (content_version + lesson_versions table)
- [x] **CONT-05**: User can view Mermaid diagrams rendered inline via Diagram component

### Quizzes

- [x] **QUIZ-01**: User can complete inline quizzes with immediate correct/incorrect feedback and explanations
- [x] **QUIZ-02**: User can answer multiple question types (multiple-choice, recall, application, analysis, comparison)
- [x] **QUIZ-03**: Quiz scores are persisted to database per attempt (feeds future FSRS)

### Progress

- [x] **PROG-01**: User's lesson progress (not_started/in_progress/completed) is tracked and persisted
- [x] **PROG-02**: User can see progress rings/bars at pillar and course levels
- [x] **PROG-03**: Semesters unlock when previous semester is completed, with manual override

### Infrastructure

- [x] **INFR-01**: Data model includes user_id on all tables with hardcoded single user (Clerk-ready scaffolding for later) — completed 01-02
- [x] **INFR-02**: Supabase database with core schema (pillars, semesters, courses, lessons, progress, quiz_questions, vocabulary, lesson_versions, quiz_attempts, lesson_connections) — completed 01-02
- [x] **INFR-03**: Deployed to Vercel *(scaffold complete in 01-01; full deployment in 01-03)* — completed 01-03

### Design

- [x] **DESG-01**: Dark mode as primary display mode, light mode supported
- [x] **DESG-02**: Mobile-responsive layout across all pages

### Seed Content

- [ ] **SEED-01**: 2 complete hand-written lessons for Pillar 1 (AI & Agentic Engineering) following the lesson design template (Hook → ConceptBlocks → Quiz → DeepDive → Exercise → Takeaways)
- [ ] **SEED-02**: All 7 pillars seeded in database with names, colors, descriptions

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### AI Content Generation

- **AIGEN-01**: User can generate full course structure from a topic via Claude API
- **AIGEN-02**: Lessons are pre-generated and cached in database (not on-demand)
- **AIGEN-03**: Generated content follows MDX component schema (Hook → ConceptBlocks → Quiz → DeepDive → Exercise → Takeaways)
- **AIGEN-04**: Quiz questions extracted from generated lessons into structured records
- **AIGEN-05**: Vocabulary terms extracted from generated lessons into vocabulary records

### Spaced Repetition

- **SRS-01**: Key concepts resurface as daily review questions using FSRS algorithm
- **SRS-02**: Review intervals adjust based on demonstrated mastery
- **SRS-03**: Daily review page with 5-10 minute sessions

### AI Tutor

- **TUTOR-01**: AI tutor chat per course scoped to subject context
- **TUTOR-02**: Can generate additional examples and practice problems

### Authentication

- **AUTH-01**: User can sign up and log in via Clerk
- **AUTH-02**: Protected routes redirect unauthenticated users
- **AUTH-03**: Supabase RLS policies enforce per-user data access

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Adaptive difficulty | Requires substantial quiz history; Phase 4 at earliest |
| Streak tracking / gamification | Motivation layer — core content must be compelling without it |
| PDF export | Niche use case; MDX → PDF is non-trivial |
| Study scheduling / calendar | Significant OAuth scope; different product surface |
| Drag-and-drop quiz type | High complexity for marginal pedagogical gain |
| Social features | Single-user platform by design |
| Video hosting | Storage/bandwidth costs; link to external if needed |
| Real-time collaboration | Async self-directed learning is the model |
| User-generated content | Author is system (AI or hand-written); not learner |
| Content for Pillars 2-7 | After Pillar 1 is battle-tested |
| Cross-pillar connections UI | Needs 2+ pillars with content to be meaningful |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | Phase 2 | Complete |
| NAV-02 | Phase 2 | Complete |
| NAV-03 | Phase 2 | Complete |
| CONT-01 | Phase 3 | Complete |
| CONT-02 | Phase 3 | Complete |
| CONT-03 | Phase 3 | Complete |
| CONT-04 | Phase 3 | Complete |
| CONT-05 | Phase 3 | Complete |
| QUIZ-01 | Phase 4 | Complete |
| QUIZ-02 | Phase 4 | Complete |
| QUIZ-03 | Phase 4 | Complete |
| PROG-01 | Phase 5 | Complete |
| PROG-02 | Phase 5 | Complete |
| PROG-03 | Phase 5 | Complete |
| INFR-01 | Phase 1 | Pending |
| INFR-02 | Phase 1 | Pending |
| INFR-03 | Phase 1 | Complete (01-03) |
| DESG-01 | Phase 2 | Complete |
| DESG-02 | Phase 2 | Complete |
| SEED-01 | Phase 6 | Pending |
| SEED-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 after 01-03 execution — INFR-03 complete (Vercel deployed, Supabase schema pushed, Clerk configured). Phase 1 all requirements complete.*
