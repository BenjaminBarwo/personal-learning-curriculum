# Roadmap: Personal Learning Curriculum Platform

## Overview

Six phases from bare repository to a live, authenticated learning platform. The sequence follows a strict dependency order: schema before data access, auth before RLS, display components before interactive components, content pipeline before quiz engine, progress tracking before dashboard, and seed content last (to validate everything end-to-end with real lessons). Every phase delivers something independently verifiable. No phase is busywork.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Infrastructure** - Database schema, Supabase, Vercel deployment, single-user scaffolding
- [x] **Phase 2: App Shell + Navigation** - Layout, routing, pillar color system, breadcrumbs, dark mode, mobile (completed 2026-02-27)
- [x] **Phase 3: Lesson Content Pipeline** - MDX rendering, all display and interactive components, content versioning (completed 2026-02-28)
- [x] **Phase 4: Quiz Engine** - Quiz rendering, all question types, attempt persistence (completed 2026-02-28)
- [x] **Phase 5: Progress + Dashboard** - Lesson progress tracking, progress rings, semester unlock, "continue" logic (completed 2026-03-01)
- [ ] **Phase 6: Seed Content** - Two complete hand-written lessons and all 7 pillars seeded; end-to-end validation

## Phase Details

### Phase 1: Infrastructure
**Goal**: The data layer is live, Clerk-ready, and safe to build on
**Depends on**: Nothing (first phase)
**Requirements**: INFR-01, INFR-02, INFR-03
**Success Criteria** (what must be TRUE):
  1. Supabase database exists with all core tables (pillars, semesters, courses, lessons, progress, quiz_questions, quiz_attempts, vocabulary, lesson_versions) and correct schema
  2. Row-Level Security is enabled on every user-data table with correct policies — a query without auth returns zero rows, not an error
  3. The Clerk JWT template for Supabase is configured; `SELECT auth.uid()` returns a non-null value for an authenticated user
  4. The application deploys to Vercel without build errors and environment variables are set in production
  5. All tables include `user_id` with a hardcoded single user constant (Clerk user ID string); no Supabase Auth user table needed
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Next.js scaffolding, dependencies, Clerk middleware, Supabase client factories
- [x] 01-02-PLAN.md — Complete database schema migration (11 tables, RLS, indexes, triggers, views, types)
- [x] 01-03-PLAN.md — Vercel deployment, Supabase schema push, Clerk third-party auth configuration

### Phase 2: App Shell + Navigation
**Goal**: The learner can navigate the full Pillar → Semester → Course → Lesson hierarchy in a polished, mobile-responsive shell
**Depends on**: Phase 1
**Requirements**: NAV-01, NAV-02, NAV-03, DESG-01, DESG-02
**Success Criteria** (what must be TRUE):
  1. User can see the dashboard with all 7 pillars displayed, each in its correct color
  2. User can navigate from dashboard → pillar → semester → course → lesson with a breadcrumb trail showing current location at each level
  3. Every page renders correctly in dark mode (primary) and light mode (toggled)
  4. Every page is usable on a mobile screen (no horizontal scroll, tap targets adequate)
  5. Completion indicators are visible at every level of the navigation hierarchy (pillar, semester, course)
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — Theme system, layout shell (header, breadcrumbs, theme toggle), reusable UI components (PillarCard, ProgressBar, LoadingSkeleton)
- [ ] 02-02-PLAN.md — Dashboard page, Pillar/Semester/Course/Lesson hierarchy pages with Supabase data fetching, breadcrumb wiring, visual verification

### Phase 3: Lesson Content Pipeline
**Goal**: A lesson page renders rich MDX content with all custom components functional and content versioning in place
**Depends on**: Phase 2
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05
**Success Criteria** (what must be TRUE):
  1. A lesson page renders MDX from the database using all display components: Hook, ConceptBlock, Exercise, Takeaways — no hydration errors in console
  2. User can expand and collapse a DeepDive section within a lesson
  3. User can hover or tap a domain term to see its inline definition
  4. Mermaid diagrams render inline within lesson content
  5. Lesson content is versioned; a previous version can be retrieved from lesson_versions without data loss
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md — Install MDX dependencies, configure Tailwind Typography, build all 8 custom lesson components (Hook, ConceptBlock, DeepDive, Exercise, Takeaways, Definition, Diagram, Video) and MDX components map
- [ ] 03-02-PLAN.md — Integrate MDX rendering into lesson page, add next/previous navigation, mark-as-complete button, content versioning trigger, visual verification

### Phase 4: Quiz Engine
**Goal**: Learners can complete inline quizzes with immediate feedback and all quiz attempts are persisted for future spaced repetition
**Depends on**: Phase 3
**Requirements**: QUIZ-01, QUIZ-02, QUIZ-03
**Success Criteria** (what must be TRUE):
  1. User can answer a multiple-choice question and immediately see whether they were correct, with an explanation shown regardless of outcome
  2. User can answer at least four question types: multiple-choice, recall, application, and analysis
  3. Every quiz attempt (question ID, selected answer, correct/incorrect, timestamp) is written to the database
  4. Quiz state does not reset if the user scrolls away and returns to the quiz within the same session
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md — QuizProvider context, Quiz component (all 5 question types), LessonBody + page.tsx + mdx-components integration, seed test quiz questions
- [ ] 04-02-PLAN.md — Human verification of quiz rendering, feedback, state persistence, and database attempt records

### Phase 5: Progress + Dashboard
**Goal**: The learner's progress is tracked, visible at every level, and the dashboard surfaces exactly where to continue
**Depends on**: Phase 4
**Requirements**: PROG-01, PROG-02, PROG-03
**Success Criteria** (what must be TRUE):
  1. A lesson's status (not_started, in_progress, completed) updates correctly and persists across sessions
  2. Dashboard shows a "continue where you left off" card pointing to the most recently accessed incomplete lesson
  3. Progress rings or bars reflect actual completion percentage at both pillar and course levels
  4. Semester N+1 is locked until Semester N is completed; a manual override unlocks it without completing the prior semester
**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md — Progress data layer: progress computation helpers, MarkCompleteButton wiring, mark-in-progress on lesson load, semester unlock migration
- [ ] 05-02-PLAN.md — Hierarchy progress display: dashboard continue card, real progress bars at all levels, semester lock/unlock UI, lesson status icons, human verification

### Phase 6: Seed Content
**Goal**: Two complete, hand-written lessons for Pillar 1 are live in the database and the full platform works end-to-end with real content
**Depends on**: Phase 5
**Requirements**: SEED-01, SEED-02
**Success Criteria** (what must be TRUE):
  1. All 7 pillars exist in the database with correct names, colors, and descriptions; the dashboard renders all 7
  2. Two complete Pillar 1 lessons follow the full design template (Hook → ConceptBlocks → Quiz → DeepDive → Exercise → Takeaways) and render without errors
  3. A learner can open a lesson, answer quizzes, mark it complete, and see progress update on the dashboard — the entire learning loop works end-to-end
  4. Estimated reading time is displayed on lesson cards before a lesson is opened
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure | 3/3 | Complete | 2026-02-27 |
| 2. App Shell + Navigation | 2/2 | Complete   | 2026-02-27 |
| 3. Lesson Content Pipeline | 2/2 | Complete   | 2026-02-28 |
| 4. Quiz Engine | 2/2 | Complete   | 2026-03-01 |
| 5. Progress + Dashboard | 2/2 | Complete   | 2026-03-01 |
| 6. Seed Content | 0/TBD | Not started | - |
