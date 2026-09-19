# Personal Learning Curriculum

A self-directed, university-structured learning platform. Seven knowledge pillars, organised into semesters, courses and lessons, with MDX-authored content, inline quizzes, and progress tracking at every level of the hierarchy.

Built solo and used daily — this is the platform I taught myself software engineering on.

**Live:** https://learning-platform-three-omega.vercel.app

---

## Why it exists

Self-teaching fails on structure, not on material. Everything is available; almost none of it is sequenced, and nothing tracks whether you actually retained it.

The design constraint was engagement rather than completeness: a lesson has to be frictionless enough to start and interesting enough to continue that you don't talk yourself out of opening it. If it reads like a textbook, it doesn't get opened. So lessons open on a real-world hook, content is chunked, and quizzes are inline with immediate feedback rather than saved for the end.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 |
| Language | TypeScript |
| Database | Supabase (PostgreSQL), 11 tables with row-level security |
| Auth | Clerk, `user_id` scoped across all tables |
| Styling | Tailwind CSS v4 |
| Content | MDX via `next-mdx-remote-client` |
| Diagrams | Mermaid, rendered inline |
| Hosting | Vercel |

**Scale:** ~4,272 lines of TypeScript across 118 files at v1.0.

---

## What's built (v1.0)

**Navigation and structure**
- Dashboard with pillar overview, progress rings, and resume-where-you-left-off
- Pillar → Semester → Course → Lesson hierarchy with breadcrumbs
- Completion checkmarks at every navigation level
- Completion-gated semester progression, with manual override
- Seven-colour pillar system carried consistently through the UI

**Lessons**
- MDX rendering with custom components: `Hook`, `ConceptBlock`, `Quiz`, `DeepDive`, `Exercise`, `Takeaways`, `Definition`
- Collapsible deep-dive sections for optional depth
- Domain terminology highlighting with hover and tap definitions
- Estimated time shown before opening
- Inline Mermaid diagrams

**Assessment and progress**
- Inline quizzes with immediate feedback, five question types: multiple choice, recall, application, analysis, comparison
- Lesson state tracking (started / completed) and quiz scoring
- Content versioning with rollback

**Platform**
- Dark mode as the primary theme, light mode supported
- Mobile-responsive throughout
- 11-table Postgres schema with RLS, deployed to production

Two hand-written lessons — *How Transformers Work* and *Attention Mechanisms Explained* — validate the full loop end to end.

---

## Curriculum model

Seven pillars, roughly 21 semesters, 74 courses and 600 lessons at full scope:

1. **AI & Agentic Engineering** — LLMs, transformers, agentic workflows, prompt engineering
2. **Technical Systems & Data** — distributed systems, data pipelines, ML fundamentals, databases
3. **Robotics (conceptual)** — industry landscape, AI meeting the physical world
4. **Business Competence** — finance, valuation, operations, growth, legal, leadership
5. **Human Behavior**
6. *(see `.planning/PROJECT.md` for the full structure)*

---

## In progress (v2.0)

- **Content generation pipeline** — a CLI driving the Claude API with sub-agents to research topics, produce full MDX lessons against the lesson template, and seed them into Supabase. This is what makes 600 lessons tractable for one person.
- **FSRS spaced repetition** — quiz questions become review cards, with a dashboard widget and a standalone review flow with difficulty rating
- **Clerk sign-in UI** — sign-in page and protected routes wired to the existing scaffolding

---

## How it was built

Development runs on a versioned planning protocol in `.planning/`, used to drive AI coding agents across sessions without losing context:

```
PROJECT.md         What it is, core value, scope boundaries
REQUIREMENTS.md    Validated / active / out-of-scope, tracked per version
ROADMAP.md         Sequenced delivery plan
STATE.md           Build state, carried between sessions
phases/            Per-phase specifications
research/          Investigation notes feeding design decisions
```

Requirements move from **active** to **validated** only once shipped, and the out-of-scope list is maintained as deliberately as the in-scope one. Streaks and gamification, AI tutor chat, adaptive difficulty, social features, PDF export and calendar integration were all considered and explicitly rejected with reasons — the core content has to work without them.

---

## Running locally

```bash
npm install
npm run dev
```

Requires Supabase and Clerk credentials — see `.env.example`.

---

Built by [Benjamin Barwo](https://github.com/BenjaminBarwo).
