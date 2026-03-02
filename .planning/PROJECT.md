# Personal Learning Curriculum Platform

## What This Is

A self-directed, university-grade learning platform built on Next.js and hosted on Vercel. It delivers a personalized curriculum across 7 knowledge pillars with the depth of Harvard-level semesters. Lessons feel like a product, not a textbook: real-world hooks, chunked MDX content, inline quizzes with 5 question types, and progress tracking at every level. Two hand-written Pillar 1 lessons validate the full end-to-end learning loop.

## Core Value

Every lesson must be so frictionless to start and so engaging to continue that the learner never talks themselves out of opening one. If the content looks like a college textbook, engagement drops — the platform must feel like a product, not a PDF.

## Requirements

### Validated

- ✓ Dashboard with pillar overview, progress rings, and "continue where you left off" — v1.0
- ✓ Pillar → Semester → Course → Lesson navigation with breadcrumbs — v1.0
- ✓ Lesson pages rendering MDX with custom components (Hook, ConceptBlock, Quiz, DeepDive, Exercise, Takeaways, Definition) — v1.0
- ✓ Inline quizzes with immediate feedback (multiple choice, recall, application, analysis, comparison types) — v1.0
- ✓ Progress tracking — mark lessons started/completed, track quiz scores — v1.0
- ✓ Completion-based semester progression with manual override — v1.0
- ✓ Pillar color-coding system across UI (7 distinct colors) — v1.0
- ✓ Dark mode as primary, light mode supported — v1.0
- ✓ Mobile-responsive design — v1.0
- ✓ Clerk auth scaffolding with user_id on all tables and Supabase RLS — v1.0
- ✓ Seed content: 2 complete hand-written lessons for Pillar 1 (AI & Agentic Engineering) — v1.0
- ✓ Collapsible deep-dive sections in lessons — v1.0
- ✓ Domain terminology highlighting with hover/tap definitions — v1.0
- ✓ Lesson estimated time displayed before opening — v1.0
- ✓ Completion checkmarks visible at every navigation level — v1.0
- ✓ Content versioning with rollback capability — v1.0
- ✓ Mermaid diagrams rendered inline — v1.0
- ✓ 11-table Postgres schema with RLS deployed to production — v1.0
- ✓ Vercel deployment with Supabase + Clerk integration — v1.0

### Active

- [ ] AI-powered course generation from topic input (Claude API)
- [ ] Spaced repetition system using FSRS algorithm
- [ ] Clerk sign-in UI with protected routes
- [ ] Content for Pillars 2-7 (AI-generated)

### Out of Scope

- AI tutor chat — needs content generation pipeline first
- Adaptive difficulty — requires substantial quiz history
- Streak tracking / gamification — core content must be compelling without it
- PDF export — niche use case; MDX → PDF is non-trivial
- Study scheduling / calendar — significant OAuth scope; different product surface
- Drag-and-drop quiz type — high complexity for marginal pedagogical gain
- Social features — single-user platform by design
- Video hosting — storage/bandwidth costs; link to external if needed
- Real-time collaboration — async self-directed learning is the model
- User-generated content — author is system (AI or hand-written); not learner
- Cross-pillar connections UI — needs 2+ pillars with content to be meaningful

## Context

### Current State

Shipped v1.0 MVP with 4,272 LOC TypeScript across 118 files.
Tech stack: Next.js 16, Supabase (PostgreSQL), Clerk, Tailwind CSS v4, MDX via next-mdx-remote-client.
Production: https://learning-platform-three-omega.vercel.app

Two hand-written lessons live (How Transformers Work, Attention Mechanisms Explained) — full learning loop validated end-to-end. Quiz engine supports 5 question types. Progress tracking works at all hierarchy levels.

### Curriculum Structure

7 knowledge pillars, ~21 semesters, ~74 courses, ~600 lessons total across all pillars:

1. **AI & Agentic Engineering** — LLMs, transformers, agentic workflows, prompt engineering (4 semesters, 13 courses)
2. **Technical Systems & Data** — Distributed systems, data pipelines, ML fundamentals, databases (4 semesters, 12 courses)
3. **Robotics (Conceptual)** — Industry landscape, AI + physical-world intersection (2 semesters, 9 courses)
4. **Business Competence** — Finance, valuation, operations, growth, legal, leadership (4 semesters, 14 courses)
5. **Human Behavior & Power** — Incentives, negotiation, persuasion, power dynamics (4 semesters, 12 courses)
6. **Systems Thinking (Meta-Pillar)** — Feedback loops, mental models, emergent behavior (3 semesters, 14 courses)
7. **Communication (Cross-Cutting)** — Domain fluency, code-switching, terminology in context

### Learner Profile

- Theory first, then application
- Deep dives preferred over surface skimming
- Real-world case studies over textbook explanations
- Low reading tolerance — walls of text create friction
- Quizzes actively help retention
- Structured projects force application

### Lesson Design Template

Every lesson follows: Hook (real-world case study) → Core Concepts (3-5 chunked blocks) → Checkpoint Quiz (2-3 questions) → Deep Dive (optional, collapsible) → Application Exercise (10-30 min) → Key Takeaways (3-5 bullets)

### Content Format

MDX strings stored in Supabase, rendered via `next-mdx-remote-client`. Custom React components: `<Hook>`, `<ConceptBlock>`, `<Quiz>`, `<Question>`, `<Option>`, `<Explanation>`, `<DeepDive>`, `<Exercise>`, `<Takeaways>`, `<Definition>`, `<Diagram>`. Content versioning via `content_version` integer with rollback table.

### Cross-Pillar Connections

A `lesson_connections` junction table links related lessons across pillars (prerequisite, related, systems-thinking-lens, vocabulary-shared). Systems Thinking is both standalone and woven into every other pillar.

### Known Tech Debt

- No Clerk sign-in UI — all routes publicly accessible, RLS bypassed via admin client (intentional for single-user v1.0)
- `active_vocabulary` view defined but unused — Definition component uses inline MDX content, not DB-driven terms
- `lesson_versions` table capture-only — no retrieval/rollback UI

## Constraints

- **Tech stack**: Next.js 16 (App Router), Supabase (PostgreSQL), Clerk, Tailwind CSS v4, MDX via next-mdx-remote-client — established
- **Hosting**: Vercel — established
- **Content storage**: MDX in database, not filesystem — established
- **Quiz engine**: Custom built (~300 lines), no third-party library — established
- **Spaced repetition**: FSRS algorithm (not SM-2) — decided, for next milestone
- **AI generation**: Pre-generate and cache (on-demand for AI tutor only) — decided, for next milestone
- **Auth model**: Single user now with multi-user scaffolding (user_id on all tables, RLS from day one) — established

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MDX in Supabase (not filesystem) | AI generates content dynamically; filesystem coupling breaks this | ✓ Good — MDX rendering from DB works seamlessly |
| Custom quiz engine (not third-party) | Only needs render, accept, check, feedback. ~300 lines | ✓ Good — 5 question types, session persistence, clean |
| FSRS over SM-2 | 20-30% fewer reviews for same retention | — Pending (v2) |
| Pre-generate content (not on-demand) | 5-15s latency per lesson violates core UX principle | — Pending (v2) |
| Clerk auth (not NextAuth) | Free tier covers single user. user_id scaffolding ready | ✓ Good — JWT integration with Supabase RLS works |
| Start with Pillar 1 only | Battle-test content pipeline and components before scaling | ✓ Good — found and fixed issues with real content |
| Completion-based semester progression | Finish Semester N to unlock N+1, with manual override | ✓ Good — simple, effective, non-punitive |
| Clerk JWT sub claim for RLS (not auth.uid()) | Clerk JWTs don't populate auth.uid() in Supabase | ✓ Good — required for Clerk integration |
| Two Supabase client factories (browser vs server) | Separate auth contexts; admin isolated to server | ✓ Good — evolved to admin-only pattern by Phase 5 |
| Dark-first design with Tailwind v4 @custom-variant | Dark is primary; light override via class strategy | ✓ Good — clean, no dark: prefix needed |
| BreadcrumbContext over per-page Header | Single Header reads from context; pages push state | ✓ Good — no prop-drilling through layouts |
| Server actions for mutations (not client Supabase) | Admin client on server avoids RLS/auth gaps | ✓ Good — emerged organically in Phase 5 |
| force-dynamic on data pages | Vercel was caching stale progress queries | ✓ Good — simple fix for ISR caching issue |

---
*Last updated: 2026-03-02 after v1.0 milestone*
