# Phase 1: Infrastructure - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Database schema (Supabase), Clerk-ready auth scaffolding with hardcoded single user, Vercel deployment, and Next.js project setup. This phase delivers the data layer and deployment pipeline that all subsequent phases build on. No UI beyond confirming the app builds and deploys.

</domain>

<decisions>
## Implementation Decisions

### Learning Hierarchy
- Strict sequence: lessons must be completed in order within a course
- Hierarchy size varies widely per pillar (some may have 2 semesters, others 8+)
- Semesters and courses carry light metadata: name, short description, display order
- Fixed ordering at creation — no reordering support needed
- Soft delete on all content tables (archived/deleted_at field, not hard delete)
- Pillar definitions (names, colors, descriptions) deferred to Phase 6 — schema just needs to support 7+ pillars

### Vocabulary
- Terms are shared globally across the platform (one definition per term, reused across lessons)
- Terms are pillar-scoped: same word can have different definitions in different pillars (e.g., "model" in ML vs business)
- Junction table needed to link terms to lessons they appear in

### Lesson Data Model
- Learning objectives required on every lesson (list of "after this lesson you will..." statements)
- MDX storage approach, versioning strategy, and additional metadata fields at Claude's discretion

### Quiz Question Schema
- 5 question types in v1: multiple-choice, recall, application, analysis, comparison
- Recall questions are fill-in-the-blank with accepted answer set (not free-text)
- Application and analysis questions are structured multiple-choice with scenario/context
- Comparison questions included from start
- Full attempt data capture: question_id, selected_answer, correct_answer, is_correct, timestamp, time_spent
- 70% passing score required for lesson completion
- Failed quiz requires scrolling through lesson content before retry (retry-after-review pattern)
- All attempts recorded; best score determines pass status

### Project Tooling
- Next.js with App Router (v14+)
- Tailwind CSS + shadcn/ui component library
- pnpm as package manager
- Database client approach at Claude's discretion

### Claude's Discretion
- Hierarchy depth flexibility (whether to allow skipping levels like semesters)
- Prerequisites beyond semester-level locking
- Pillar metadata fields beyond name + color + description
- Timestamps strategy (every table vs only where needed)
- MDX content storage approach (DB text column vs file-based)
- Learning objectives storage (JSON array column vs MDX section)
- Content versioning model (keep-all vs limited, draft/publish vs always-live)
- Quiz table structure (single table with type discriminator vs separate tables)
- Quiz storage approach (inline MDX vs separate DB records)
- Quiz explanation display strategy (same for correct/incorrect vs differentiated)
- Database client choice (Supabase JS client vs Drizzle ORM)

</decisions>

<specifics>
## Specific Ideas

- Core value from requirements: "Every lesson must be so frictionless to start and so engaging to continue that the learner never talks themselves out of opening one"
- Quiz retry-after-review is intentional pedagogical design — forces re-engagement with content before retaking
- Pillar-scoped vocabulary supports domain-specific terminology without confusion across subjects
- Schema must support v2 FSRS spaced repetition — quiz attempt data should be rich enough to feed the algorithm

</specifics>

<deferred>
## Deferred Ideas

- Research-backed pillar creation: user wants proper research done when defining each learning pillar's content structure and curriculum — capture during Phase 6 (Seed Content)
- Pillar names, colors, and descriptions — Phase 6

</deferred>

---

*Phase: 01-infrastructure*
*Context gathered: 2026-02-27*
