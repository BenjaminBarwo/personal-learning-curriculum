---
phase: 06-seed-content
plan: 01
subsystem: database
tags: [supabase, sql, mdx, seed-data, quiz, transformers, attention]

requires:
  - phase: 05-progress-dashboard
    provides: "Fully built learning platform with lesson pages, quiz engine, and progress tracking"
  - phase: 04-quiz-engine
    provides: "quiz_questions table, Quiz component with questionId prop, QuizProvider context"
  - phase: 03-lesson-content-pipeline
    provides: "MDX rendering pipeline with registered components (Hook, ConceptBlock, Definition, Diagram, Quiz, DeepDive, Exercise, Takeaways)"

provides:
  - "Production seed SQL: 7 pillars with project-brief-accurate names, 5-8 line descriptions, and hex colors"
  - "Pillar 1 hierarchy: Semester 'Foundations' + 3 courses (Mathematical Foundations for AI, Neural Network Fundamentals, PyTorch Fundamentals)"
  - "Lesson 1 'How Transformers Work' in Course 1.2 with full MDX (Hook, 4 ConceptBlocks, Diagram, DeepDive, Exercise, Takeaways) and 5 quiz questions"
  - "Lesson 2 'Attention Mechanisms Explained' in Course 1.2 with full MDX (Hook, 5 ConceptBlocks, Diagram, DeepDive, Exercise, Takeaways) and 5 quiz questions"
  - "10 quiz_questions rows with JSONB options schema, UUID-coordinated with MDX Quiz questionId tags"
  - "estimated_minutes set from actual prose word count (Lesson 1: 7 min / 1503 words; Lesson 2: 10 min / 2071 words)"

affects:
  - "Content consumers: any phase that reads pillars, semesters, courses, or lessons tables"
  - "Quiz engine: quiz_questions rows must remain in sync with MDX Quiz questionId references"
  - "Progress dashboard: lesson completion flows require lesson rows to exist"

tech-stack:
  added: []
  patterns:
    - "ON CONFLICT (slug) DO UPDATE SET for pillar upserts — preserves FK-referenced UUIDs in production"
    - "Subquery-based hierarchy inserts (INSERT INTO courses SELECT ... FROM semesters JOIN pillars) — no hardcoded UUIDs"
    - "Pre-computed fixed UUIDs for quiz questions — coordinates quiz_questions INSERT with MDX Quiz questionId tags without chicken-and-egg problem"
    - "PL/pgSQL DO $$ block with DECLARE for lesson + quiz insertion — enables variable reuse across MDX string and SQL INSERTs"
    - "Dollar-quoting for MDX content ($lesson1$...$lesson1$) — handles single quotes, angle brackets, and special chars safely"
    - "ON CONFLICT (id) DO NOTHING for quiz_questions — idempotent even on re-run without losing existing attempt data"

key-files:
  created:
    - "supabase/seed-phase-06.sql"
  modified: []

key-decisions:
  - "Fixed pre-computed UUIDs for quiz questions (d290f1ee series for Lesson 1, e390f1ee series for Lesson 2) — eliminates UUID coordination problem between SQL INSERT and MDX Quiz tags; makes file fully idempotent"
  - "estimated_minutes calculated from actual prose word count after MDX authored: strip component tags, Mermaid chart, Quiz tags; divide by 225 and round up (Lesson 1: 1503 words = 7 min; Lesson 2: 2071 words = 10 min)"
  - "Lesson 2 uses 5 ConceptBlocks (vs 4 in Lesson 1) — attention mechanisms require more structural decomposition: context vector bottleneck, scaled dot-product, multi-head, self vs cross, modern variants"
  - "Both lessons placed in Course 1.2 Neural Network Fundamentals at display_order 1 and 2 — per CONTEXT.md specification; Course 1.1 and 1.3 left empty for future content phases"
  - "Zero deprecated MDX components used: no <Question>, <Option>, <Explanation> tags; correct <Quiz questionId='...' /> pattern throughout"

patterns-established:
  - "SQL seed file pattern: Section comments, pillar upserts first, hierarchy via subqueries, lessons in DO $$ blocks with DECLARE"
  - "MDX lesson structure: Hook -> ConceptBlocks (3-4 sentences each) -> interspersed Quiz refs -> Diagram -> DeepDive (3-4 paragraphs) -> Exercise (Scenario/Deliverable/Success Criteria) -> Takeaways"
  - "Definition component used for first-use of key technical terms within ConceptBlock children"

requirements-completed: [SEED-01, SEED-02]

duration: 6min
completed: 2026-03-02
---

# Phase 6 Plan 01: Seed Content Summary

**Production seed SQL with 7 pillar upserts, Pillar 1 semester/course hierarchy, and 2 complete MDX lessons ("How Transformers Work" and "Attention Mechanisms Explained") with 10 quiz questions using pre-computed UUIDs coordinated with MDX Quiz tags**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-02T17:09:08Z
- **Completed:** 2026-03-02T17:14:52Z
- **Tasks:** 2
- **Files modified:** 1 (created)

## Accomplishments

- Created `supabase/seed-phase-06.sql` — a complete, idempotent seed file ready to run against production Supabase via SQL Editor
- 7 pillar upserts with production-quality multi-line descriptions (5-8 lines each) matching the project brief exactly; uses `ON CONFLICT (slug) DO UPDATE` to safely replace placeholder data without breaking FK chains
- Pillar 1 hierarchy: Semester "Foundations" + 3 courses inserted via subquery-based pattern (no hardcoded UUIDs)
- Lesson 1 "How Transformers Work" (display_order 1): Hook, 4 ConceptBlocks, Diagram (flowchart LR), DeepDive (4 paragraphs on positional encoding variants and transfer learning), Exercise (LSTM-to-transformer migration memo), Takeaways; 5 quiz questions across multiple_choice, application, recall, analysis, comparison types
- Lesson 2 "Attention Mechanisms Explained" (display_order 2): Hook, 5 ConceptBlocks, Diagram (flowchart TD attention computation), DeepDive (3 paragraphs on sqrt scaling, head specialization, Flash Attention), Exercise (debugging long-sequence translation failure), Takeaways; 5 quiz questions
- All 10 quiz questions use pre-computed fixed UUIDs coordinated with `<Quiz questionId="..."/>` tags — zero UUID mismatch risk
- estimated_minutes verified against actual prose word count (word count / 225, ceil): Lesson 1 = 7 min (1503 words), Lesson 2 = 10 min (2071 words)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create seed SQL — pillars, hierarchy, and Lesson 1** - `bed7c07` (feat)
2. **Task 2: Append Lesson 2 + fix estimated_minutes** - `d84ee8e` (feat)

## Files Created/Modified

- `supabase/seed-phase-06.sql` — Production seed SQL: 7 pillar upserts, 1 semester, 3 courses, 2 complete lessons with MDX and 10 quiz questions; ~750 lines

## Decisions Made

- **Fixed UUIDs for quiz questions**: Pre-computed UUID series (d290f1ee-... for Lesson 1, e390f1ee-... for Lesson 2) hard-coded in both DECLARE block and MDX Quiz tags. Eliminates the chicken-and-egg problem of coordinating DB-generated UUIDs with MDX string content. File is fully idempotent.
- **estimated_minutes corrected after authoring**: Initial values (10, 11) were estimates. After authoring the MDX, actual prose word counts were measured (stripping component tags, Mermaid DSL, Quiz tags) giving 1503 and 2071 words respectively. Final values: 7 min and 10 min. Committed separately in Task 2.
- **5 ConceptBlocks for Lesson 2 vs 4 for Lesson 1**: Attention mechanisms require more structural decomposition — five distinct concepts (bottleneck problem, scaled dot-product, multi-head, self vs cross, modern variants in practice) each needed their own section. Lesson 1's transformer overview fit in 4 blocks.

## Deviations from Plan

None — plan executed exactly as written. The estimated_minutes correction was expected behavior (plan specified "count actual words in the MDX you write and calculate accordingly").

## Issues Encountered

None. The pre-computed UUID pattern and dollar-quoting approach worked cleanly.

## User Setup Required

**Run the seed file against production Supabase.** The file is ready but requires manual execution:

1. Open Supabase SQL Editor at your project dashboard
2. Paste the contents of `supabase/seed-phase-06.sql`
3. Run the SQL
4. Verify with: `SELECT name, slug, color FROM pillars ORDER BY display_order;`
5. Verify lesson MDX: `SELECT name, estimated_minutes, array_length(learning_objectives, 1) FROM lessons WHERE slug IN ('how-transformers-work', 'attention-mechanisms-explained');`
6. Verify quiz questions: `SELECT COUNT(*) FROM quiz_questions WHERE lesson_id IN (SELECT id FROM lessons WHERE slug IN ('how-transformers-work', 'attention-mechanisms-explained'));` — should return 10

After running, navigate to your production URL and open the AI & Agentic Engineering pillar to verify the full learning loop: open lesson -> read content -> take quiz -> mark complete -> see progress update.

## Next Phase Readiness

- All seed data ready for production execution via Supabase SQL Editor
- End-to-end learning loop can be verified once SQL is run: pillar navigation -> semester -> course -> lesson -> quiz -> progress
- Pillar 1 Course 1.1 (Mathematical Foundations for AI) and Course 1.3 (PyTorch Fundamentals) have no lessons yet — ready for future content phases
- Pillars 2-7 have pillar rows only — no semester/course hierarchy yet

---
*Phase: 06-seed-content*
*Completed: 2026-03-02*
