# Personal Learning Curriculum Platform

## What This Is

A self-directed, university-grade learning platform built on Next.js and hosted on Vercel. It delivers a fully personalized curriculum across 7 knowledge pillars — with the depth and structure of Harvard-level semesters, but containing only what the learner wants to master. Lessons feel like a well-designed app, not a textbook: real-world hooks, chunked content, inline quizzes, and spaced repetition. AI-powered content generation means entire courses can be created from a topic input.

## Core Value

Every lesson must be so frictionless to start and so engaging to continue that the learner never talks themselves out of opening one. If the content looks like a college textbook, engagement drops — the platform must feel like a product, not a PDF.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Dashboard with pillar overview, progress rings, and "continue where you left off"
- [ ] Pillar → Semester → Course → Lesson navigation with breadcrumbs
- [ ] Lesson pages rendering MDX with custom components (Hook, ConceptBlock, Quiz, DeepDive, Exercise, Takeaways, Definition)
- [ ] Inline quizzes with immediate feedback (multiple choice, recall, application, analysis, comparison types)
- [ ] Progress tracking — mark lessons started/completed, track quiz scores
- [ ] Completion-based semester progression with manual override
- [ ] Pillar color-coding system across UI (7 distinct colors)
- [ ] Dark mode as primary, light mode supported
- [ ] Mobile-responsive design
- [ ] Clerk authentication with user_id on all tables and Supabase RLS
- [ ] Seed content: 2 complete hand-written lessons for Pillar 1 (AI & Agentic Engineering)
- [ ] Collapsible deep-dive sections in lessons
- [ ] Domain terminology highlighting with hover/tap definitions
- [ ] Lesson estimated time displayed before opening
- [ ] Completion checkmarks visible at every navigation level

### Out of Scope

- Claude API content generation — Phase 2 (get rendering right first)
- Spaced repetition system — Phase 3
- AI tutor chat — Phase 3
- Adaptive difficulty — Phase 4
- Streak tracking and gamification — Phase 4
- PDF export — Phase 4
- Study scheduling / calendar integration — Phase 4
- Drag-and-drop quiz type — Phase 3+
- Content for Pillars 2-7 — after Pillar 1 is proven
- Real-time collaboration or social features — not planned

## Context

### Curriculum Structure

7 knowledge pillars, ~21 semesters, ~74 courses, ~600 lessons total across all pillars:

1. **AI & Agentic Engineering** — LLMs, transformers, agentic workflows, prompt engineering (4 semesters, 13 courses)
2. **Technical Systems & Data** — Distributed systems, data pipelines, ML fundamentals, databases (4 semesters, 12 courses)
3. **Robotics (Conceptual)** — Industry landscape, AI + physical-world intersection (2 semesters, 9 courses)
4. **Business Competence** — Finance, valuation, operations, growth, legal, leadership (4 semesters, 14 courses)
5. **Human Behavior & Power** — Incentives, negotiation, persuasion, power dynamics (4 semesters, 12 courses)
6. **Systems Thinking (Meta-Pillar)** — Feedback loops, mental models, emergent behavior; woven into all other pillars AND standalone (3 semesters, 14 courses)
7. **Communication (Cross-Cutting)** — Domain fluency, code-switching, terminology in context; embedded in every lesson, not standalone

### Learner Profile

- Theory first, then application
- Deep dives preferred over surface skimming
- Real-world case studies over textbook explanations
- Low reading tolerance — walls of text create friction
- Best retention from watching/doing, though reading works
- Quizzes actively help retention
- Structured projects force application

### Lesson Design Template

Every lesson follows: Hook (real-world case study) → Core Concepts (3-5 chunked blocks, 3-4 sentences each) → Checkpoint Quiz (2-3 questions) → Deep Dive (optional, collapsible) → Application Exercise (10-30 min) → Key Takeaways (3-5 bullets)

### Content Format

MDX strings stored in Supabase, rendered via `next-mdx-remote`. Custom React components: `<Hook>`, `<ConceptBlock>`, `<Quiz>`, `<Question>`, `<Option>`, `<Explanation>`, `<DeepDive>`, `<Exercise>`, `<Takeaways>`, `<Definition>`, `<Diagram>`. Content versioning via `content_version` integer with rollback table.

### Cross-Pillar Connections

A `lesson_connections` junction table links related lessons across pillars (prerequisite, related, systems-thinking-lens, vocabulary-shared). Systems Thinking is both standalone and woven into every other pillar.

### Build Priority

Start with Pillar 1 (AI & Agentic Engineering) only. Build every feature end-to-end for one pillar, then generalize. The data model supports all pillars from day one.

## Constraints

- **Tech stack**: Next.js 14+ (App Router), Supabase (PostgreSQL), Clerk, Tailwind CSS, MDX via next-mdx-remote — already decided
- **Hosting**: Vercel — already decided
- **Content storage**: MDX in database, not filesystem — already decided
- **Quiz engine**: Custom built (~200-300 lines), no third-party library — already decided
- **Spaced repetition**: FSRS algorithm (not SM-2) — already decided, but for Phase 3
- **AI generation**: Pre-generate and cache (on-demand for AI tutor only) — already decided, but for Phase 2
- **Auth model**: Single user now with multi-user scaffolding (user_id on all tables, RLS from day one) — already decided
- **State management**: Zustand or React Context — to be decided during implementation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MDX in Supabase (not filesystem) | AI generates content dynamically; filesystem coupling breaks this. next-mdx-remote compiles server-side | — Pending |
| Custom quiz engine (not third-party) | Only needs 4 things: render, accept, check, feedback. ~200 lines. Libraries optimize for wrong use case | — Pending |
| FSRS over SM-2 | 20-30% fewer reviews for same retention. Matters across hundreds of terms | — Pending |
| Pre-generate content (not on-demand) | 5-15s latency per lesson open violates core UX principle. Pre-gen = instant loads | — Pending |
| Clerk auth (not NextAuth) | Free tier covers single user. user_id scaffolding for future multi-user | — Pending |
| Start with Pillar 1 only | Battle-test content pipeline and components before scaling to 7 pillars | — Pending |
| Completion-based semester progression | Finish Semester N to unlock N+1, with manual override. Structure without prison | — Pending |

---
*Last updated: 2026-02-27 after initialization*
