# Phase 6: Seed Content - Research

**Researched:** 2026-03-01
**Domain:** Database seeding, MDX content authoring, SQL data insertion, reading-time calculation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- All 7 pillars seeded as database rows with name, color, description, sort_order
- Color palette chosen from the deep-dive analysis suggestion (Electric Blue, Emerald, Amber, Purple, Rose, Cyan, Slate)
- Full descriptions from the project brief used in the `description` field (multi-line, 5-8 lines per pillar)
- Pillar names exactly as defined in project brief:
  1. AI & Agentic Engineering
  2. Technical Systems & Data Infrastructure
  3. Robotics (Conceptual & Strategic)
  4. Full-Spectrum Business Competence
  5. Human Behavior & Power Dynamics
  6. Systems Thinking (Meta-Pillar)
  7. Communication & Domain Fluency (Cross-Cutting)
- Seed Semester 1: "Foundations" with all 3 courses: Course 1.1 (Mathematical Foundations for AI), Course 1.2 (Neural Network Fundamentals), Course 1.3 (PyTorch Fundamentals)
- Pillars 2-7 get pillar rows only — no semesters or courses yet
- Lessons placed in Course 1.2 (Neural Network Fundamentals)
- Lesson 1: "How Transformers Work" — transformer architecture, encoder/decoder structure, why transformers replaced RNNs
- Lesson 2: "Attention Mechanisms Explained" — scaled dot-product attention, multi-head attention, self-attention vs cross-attention
- Claude writes the full lesson MDX content
- Content tone: conversational but precise, "like a smart friend explaining something"
- Direct address ("you/we"), real-world case studies as hooks, humor where appropriate
- Domain terminology introduced in context, bolded on first use with inline Definition components
- 4-5 ConceptBlocks per lesson (3-4 sentences each)
- 5 quiz questions per lesson — mix of recall, application, analysis, comparison types
- Mermaid diagrams included where they aid understanding
- Substantial DeepDive section (3-4 paragraphs of additional detail)
- Real, doable Exercise section with scenario, deliverable, and success criteria
- Takeaways with key points and new terms learned
- Reading time calculated via word count formula (~200-250 words/minute on MDX text)
- Computed at application level when inserting/updating lesson content (not a database trigger)
- Stored in existing `estimated_minutes` column on lessons table
- Displayed on lesson cards as "X min read"
- Quiz questions also inserted into the `quiz_questions` table (not just embedded in MDX)

### Claude's Discretion

- Specific pillar color hex values (using the suggested palette as a starting point)
- Mermaid diagram complexity and layout choices
- Exact hook stories and case studies for each lesson
- Exercise difficulty level and specific deliverables
- Whether to include Definition components for every technical term or just key ones

### Deferred Ideas (OUT OF SCOPE)

- AI Content Generation Pipeline — AIGEN-01 through AIGEN-05
- Content for Pillars 2-7
- Full semester/course hierarchy for Pillars 2-7
- Semesters 2-4 for Pillar 1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEED-01 | 2 complete hand-written lessons for Pillar 1 (AI & Agentic Engineering) following the lesson design template (Hook → ConceptBlocks → Quiz → DeepDive → Exercise → Takeaways) | MDX authoring patterns, component API signatures, quiz_questions DB insert schema, reading-time formula |
| SEED-02 | All 7 pillars seeded in database with names, colors, descriptions | SQL INSERT patterns, existing seed.sql audit (pillars already partially seeded), idempotent upsert strategy |
</phase_requirements>

---

## Summary

Phase 6 is a **pure content and data authoring phase** — no new React components, no schema migrations, no infrastructure changes. The platform is fully built. The task is to populate it with real, high-quality data so the end-to-end learning loop can be exercised for the first time.

The two primary workstreams are: (1) write a new SQL seed script that replaces the Phase 1 placeholder data with production-quality pillar records matching the project brief exactly, plus a full Pillar 1 semester/course hierarchy; and (2) author two complete MDX lessons ("How Transformers Work" and "Attention Mechanisms Explained") with all six structural sections, matching Mermaid diagrams, and 5 quiz questions each inserted into the `quiz_questions` table in the correct JSONB schema.

The critical insight from reading the codebase: **the existing `supabase/seed.sql` already contains 7 pillars and extensive semesters/courses/lessons, but they are placeholder data that does not match the project brief names, descriptions, or hierarchy**. Phase 6 must either replace these rows (truncate + re-insert) or upsert them using slug-based conflict resolution. The approach matters because production data is live in Vercel/Supabase — a destructive approach risks breaking deployed navigation URLs.

**Primary recommendation:** Author a new `supabase/seed-phase-06.sql` file that uses `ON CONFLICT (slug) DO UPDATE` to safely replace placeholder pillar data without destroying existing progress records, then inserts the Pillar 1 hierarchy and lesson MDX content. Run it via Supabase SQL Editor against the production database.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase SQL Editor / `supabase db execute` | CLI 2.76.15 | Execute seed SQL against production | Already configured; admin access available |
| `next-mdx-remote-client` | 2.1.9 | Renders MDX stored in DB at request time | Already installed; lessonpage uses it |
| Mermaid | 11.12.3 | Diagram rendering in `<Diagram chart="">` | Already installed; `Diagram.tsx` component built |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase JS client (admin) | 2.98.0 | Service-role inserts that bypass RLS | Content tables have no user-facing insert policy; all content writes go through admin client |
| `@tailwindcss/typography` | 0.5.19 | Prose styling for markdown inside lesson | Already configured in lesson page |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw SQL seed file | TypeScript migration script | SQL is simpler for pure data; TS adds complexity with no benefit for static seed content |
| Truncate + re-insert | ON CONFLICT upsert | Upsert is safer: does not cascade-delete progress records or break FK references; preferred |
| Inline quiz questions in MDX only | Both MDX + quiz_questions table | Must be both — MDX references questions by ID via `<Quiz questionId="...">`, quiz_questions table enables FSRS persistence |

---

## Architecture Patterns

### Recommended Project Structure

```
supabase/
├── seed.sql                     # Phase 1 placeholder data (do not modify)
└── seed-phase-06.sql            # NEW: production seed for Phase 6
```

No new source files needed. All changes are data-only.

### Pattern 1: Pillar Upsert — Idempotent by Slug

**What:** Use `ON CONFLICT (slug) DO UPDATE SET` to safely replace placeholder pillar rows with production values. This preserves UUIDs assigned in production — which matters because semester.pillar_id foreign keys reference those UUIDs.

**When to use:** Anytime existing rows exist in production and must be updated without breaking FK chains.

**Example:**
```sql
INSERT INTO pillars (name, slug, description, color, icon, display_order)
VALUES (
  'AI & Agentic Engineering',
  'ai-engineering',
  'The most consequential engineering discipline of our era...',
  '#3B82F6',
  'brain',
  1
)
ON CONFLICT (slug) DO UPDATE SET
  name         = EXCLUDED.name,
  description  = EXCLUDED.description,
  color        = EXCLUDED.color,
  display_order = EXCLUDED.display_order,
  updated_at   = NOW();
```

### Pattern 2: Hierarchy Insert with Subqueries

**What:** Insert semesters/courses/lessons by looking up parent UUIDs from slug, avoiding hardcoded UUIDs that differ between environments.

**When to use:** Every child-of-parent insert in the hierarchy.

**Example:**
```sql
-- Insert semester under AI pillar
INSERT INTO semesters (pillar_id, name, slug, description, display_order)
SELECT p.id, 'Foundations', 'foundations', 'Core mathematical and neural network foundations.', 1
FROM pillars p WHERE p.slug = 'ai-engineering'
ON CONFLICT (pillar_id, slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at  = NOW();

-- Insert course under that semester
INSERT INTO courses (semester_id, name, slug, description, display_order)
SELECT s.id, 'Neural Network Fundamentals', 'neural-network-fundamentals',
       'Perceptrons to transformers — the essential neural architecture toolkit.', 2
FROM semesters s
JOIN pillars p ON s.pillar_id = p.id
WHERE p.slug = 'ai-engineering' AND s.slug = 'foundations'
ON CONFLICT (semester_id, slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at  = NOW();
```

### Pattern 3: Lesson Insert with MDX Content

**What:** Insert a lesson row including the raw MDX string, estimated_minutes, and learning_objectives array.

**Key constraint:** The `lessons` table has a content_versioning trigger (`00002_lesson_versioning_trigger.sql`) that fires `IS DISTINCT FROM` on mdx_content. First insert will NOT trigger a lesson_versions write (trigger guards against NOT NULL on first insert). This is correct per the existing trigger logic.

**Example:**
```sql
INSERT INTO lessons (
  course_id, name, slug, description,
  mdx_content, learning_objectives, estimated_minutes, display_order
)
SELECT
  c.id,
  'How Transformers Work',
  'how-transformers-work',
  'Understand the architecture that powers every modern language model.',
  $mdx_content$
  <Hook>
  ...full MDX here...
  </Hook>
  $mdx_content$,
  ARRAY[
    'Explain why transformers replaced RNNs for sequence modeling',
    'Describe the encoder-decoder architecture at a conceptual level',
    'Identify the role of self-attention in transformers'
  ],
  18,
  1
FROM courses c
JOIN semesters s ON c.semester_id = s.id
JOIN pillars p ON s.pillar_id = p.id
WHERE p.slug = 'ai-engineering'
  AND s.slug = 'foundations'
  AND c.slug = 'neural-network-fundamentals'
ON CONFLICT (course_id, slug) DO UPDATE SET
  mdx_content          = EXCLUDED.mdx_content,
  estimated_minutes    = EXCLUDED.estimated_minutes,
  learning_objectives  = EXCLUDED.learning_objectives,
  content_version      = lessons.content_version + 1,
  updated_at           = NOW();
```

### Pattern 4: Quiz Question Insert (JSONB Options Schema)

**What:** Insert quiz questions for a lesson. The `options` column is JSONB and must follow the `QuizOption` interface: `[{"id":"a","text":"...","isCorrect":false}, ...]`. The `Quiz.tsx` component receives question IDs from `LessonPage` via `quizQuestions` prop and renders via `<Quiz questionId="...">` in MDX.

**Critical:** The MDX component `<Quiz questionId="...">` references the `id` column of `quiz_questions`. Therefore the lesson's MDX must use question IDs that match inserted rows. The recommended approach is to insert quiz questions first (using a known UUID or letting DB assign one), then embed those UUIDs in the MDX string. Alternatively, use question_text matching at query time — but the existing architecture uses questionId (the row UUID) from context (QuizProvider pre-loads all questions for the lesson by lesson_id; the `<Quiz questionId="">` tag just picks from context). This means **MDX must embed the exact UUID of each quiz_question row**.

**Pattern to handle the UUID coordination:**
1. Insert all 5 quiz questions for a lesson using explicit UUIDs (generated ahead of time with `gen_random_uuid()` or pre-computed).
2. Reference those UUIDs in the MDX `<Quiz questionId="...">` tags.
3. The SQL seed file generates these UUIDs deterministically or lists them as SQL variables.

**Example:**
```sql
DO $$
DECLARE
  v_lesson_id uuid;
  v_q1_id uuid := gen_random_uuid();
  v_q2_id uuid := gen_random_uuid();
BEGIN
  SELECT l.id INTO v_lesson_id
  FROM lessons l
  JOIN courses c ON l.course_id = c.id
  JOIN semesters s ON c.semester_id = s.id
  JOIN pillars p ON s.pillar_id = p.id
  WHERE p.slug = 'ai-engineering'
    AND s.slug = 'foundations'
    AND c.slug = 'neural-network-fundamentals'
    AND l.slug = 'how-transformers-work';

  INSERT INTO quiz_questions (
    id, lesson_id, question_type, question_text,
    options, correct_answer, explanation, display_order
  ) VALUES (
    v_q1_id,
    v_lesson_id,
    'multiple_choice',
    'What fundamental limitation of RNNs did the transformer architecture solve?',
    '[{"id":"a","text":"Cannot process variable-length inputs","isCorrect":false},
      {"id":"b","text":"Sequential processing prevents parallelization during training","isCorrect":true},
      {"id":"c","text":"Unable to handle text data","isCorrect":false},
      {"id":"d","text":"Require too many training examples","isCorrect":false}]'::jsonb,
    'Sequential processing prevents parallelization during training',
    'RNNs must process tokens sequentially — each hidden state depends on the previous — making training slow and preventing GPU parallelism. Transformers use attention across all positions simultaneously, enabling massively parallel training.',
    1
  )
  ON CONFLICT (id) DO NOTHING;

  -- Then update lesson MDX to embed v_q1_id, v_q2_id, etc.
  -- (Easier to pre-compute UUIDs and hard-code them in the seed file)
END;
$$;
```

**Simpler approach in practice:** Pre-generate 10 UUIDs (5 per lesson) before writing the seed file. Hard-code them in the SQL as DECLARE'd constants. This avoids the chicken-and-egg problem cleanly.

### Pattern 5: Reading Time Calculation

**What:** Word count formula to compute `estimated_minutes`. Strip MDX tags before counting — only prose text counts.

**Formula (confirmed in CONTEXT.md):** ~200-250 words/minute. Use 225 as midpoint.

```
estimated_minutes = CEIL(word_count / 225)
```

**What counts as words:**
- Text inside Hook, ConceptBlock, DeepDive, Exercise, Takeaways — yes
- Text inside quiz question_text and explanations — no (these are interactive, not read linearly)
- Mermaid chart strings — no
- Component tag attributes (title="...", questionId="...") — no

**Practical approach:** Write the MDX, strip component tags manually or by counting prose paragraphs, count words, divide by 225. For a standard 4-ConceptBlock lesson with DeepDive and Exercise, expect 1,200-2,000 prose words = 5-9 minutes. With an 18-minute value for Transformers, that suggests a longer/richer lesson (~4,000 words including DeepDive and Exercise prose).

### MDX Component API Reference (from actual source)

All components are registered in `src/lib/mdx-components.ts` and confirmed in their respective `.tsx` files:

| Component | Props | Notes |
|-----------|-------|-------|
| `<Hook>` | `children: ReactNode` | Wraps in styled card; children are rendered as prose |
| `<ConceptBlock title="...">` | `title: string`, `children: ReactNode` | Title displayed in header bar |
| `<Definition term="...">` | `term: string`, `children: ReactNode` | Inline tooltip; term shown as button, children as definition popup |
| `<Diagram chart="...">` | `chart: string`, `caption?: string` | Mermaid DSL in `chart` prop; renders client-side |
| `<Quiz questionId="...">` | `questionId: string` | UUID of `quiz_questions` row; reads from QuizProvider context |
| `<DeepDive>` | `children: ReactNode` | Collapsible section |
| `<Exercise>` | `children: ReactNode` | Styled amber exercise block |
| `<Takeaways>` | `children: ReactNode` | Styled emerald takeaways block |

**Critical MDX syntax notes:**
- `<Diagram chart="...">` receives the mermaid DSL as a **string prop** (not children). Multi-line mermaid must be escaped or use template literals in JSX — but in MDX stored as a database string, use a single-line prop with `\n` escapes, or keep diagrams compact.
- `<Definition term="...">` takes the term as a string prop and the definition text as children.
- `<Quiz questionId="...">` takes the UUID as a string prop. No children.
- `<Exercise>` renders children as markdown prose (heading, paragraphs). Use markdown `##` headers inside it for Scenario/Deliverable/Success Criteria subsections.

### Anti-Patterns to Avoid

- **Inventing component props that don't exist:** `<Exercise estimated="20 min">` is shown in the content-format-standards.md but the actual `Exercise.tsx` only accepts `children`. Do NOT add an `estimated` prop — there is no handler for it. The reading time is on the lesson card, not inside the Exercise component.
- **Using `<Question>`, `<Option>`, `<Explanation>` tags in MDX:** These are shown in content-format-standards.md as the "schema" but are NOT registered React components in the codebase. The actual implementation uses `<Quiz questionId="...">` referencing the database table. Do NOT use the schema-doc component names — use the actual `<Quiz questionId="...">` pattern.
- **Referencing question IDs before they exist in DB:** The MDX must embed UUIDs that match `quiz_questions.id` values. Pre-generate IDs and coordinate between quiz inserts and MDX content.
- **Forgetting the existing seed data:** The production database already has 7 pillars seeded from the Phase 1 `seed.sql`. The upsert pattern is essential — plain INSERT will fail on slug uniqueness constraint.
- **Putting quiz question text only in MDX and not in DB:** Quiz attempts (`quiz_attempts` table) reference `question_id` (the DB UUID). The quiz engine's `persistQuizAttempt` server action inserts a `quiz_attempts` row. If a question is only in MDX and not in DB, attempt persistence fails with FK violation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mermaid diagram rendering | Custom SVG generation | `<Diagram chart="...">` + existing `Diagram.tsx` | Already built; handles dark/light themes, loading states, error fallback |
| Quiz interactivity | New quiz component | `<Quiz questionId="...">` + existing `Quiz.tsx` | Already built; handles all 5 question types, submit, feedback, DB persistence |
| Content versioning | Manually write lesson_versions rows | Existing trigger `00002_lesson_versioning_trigger.sql` | Trigger auto-fires on UPDATE to mdx_content IS DISTINCT FROM old value; handles it transparently |
| Progress initialization | Custom progress insert in seed | Existing `markLessonInProgress` in `src/lib/progress.ts` | Progress rows auto-created when user opens lesson page |

**Key insight:** This phase is 95% content authoring, 5% SQL. The infrastructure is done. The risk is getting the MDX format and SQL schema exactly right.

---

## Common Pitfalls

### Pitfall 1: MDX Component Mismatch with content-format-standards.md

**What goes wrong:** The `content-format-standards.md` shows components like `<Question type="recall">`, `<Option correct>`, `<Explanation>` that do NOT exist in the codebase. If authored into MDX, next-mdx-remote will treat them as unknown components and either error or render raw HTML.

**Why it happens:** The content-format-standards.md describes a *conceptual schema* not the actual implementation. The real implementation uses the database-backed `<Quiz questionId="...">` pattern.

**How to avoid:** Only use components registered in `src/lib/mdx-components.ts`: Hook, ConceptBlock, DeepDive, Exercise, Takeaways, Definition, Diagram, Video, Quiz.

**Warning signs:** MDX renders but quiz questions don't show the interactive widget — they show as plain text.

### Pitfall 2: Quiz UUID Coordination

**What goes wrong:** MDX is authored with `<Quiz questionId="abc-123">` but the inserted quiz_question row has a different UUID (e.g., DB-generated). Quiz component finds no matching question in QuizProvider context and shows "Question not available" fallback.

**Why it happens:** quiz_questions UUIDs are DB-generated unless explicitly set. MDX content is authored separately from SQL inserts.

**How to avoid:** Pre-compute 10 UUIDs (5 per lesson) before writing either the SQL or MDX. Hard-code them in the SQL `INSERT` statements and in the MDX `<Quiz questionId="...">` tags simultaneously.

**Warning signs:** Lesson renders but quiz sections show "Question not available" card.

### Pitfall 3: Existing Seed Data Conflict

**What goes wrong:** Running a plain `INSERT INTO pillars ...` fails with `duplicate key value violates unique constraint "pillars_slug_key"` because the Phase 1 seed already created these rows in production.

**Why it happens:** The Phase 1 seed.sql was run on production as part of Phase 1.

**How to avoid:** Use `ON CONFLICT (slug) DO UPDATE SET` for all pillar, semester, course, and lesson inserts.

**Warning signs:** SQL execution fails on first pillar insert.

### Pitfall 4: Mermaid Diagram Syntax Errors

**What goes wrong:** `<Diagram chart="...">` renders "Unable to render diagram" error in the lesson. Mermaid is strict about syntax, especially in the dark theme.

**Why it happens:** Mermaid DSL has version-specific quirks. Certain diagram types (especially `graph LR` with special characters) can fail silently or throw errors.

**How to avoid:** Keep diagrams simple. Use `flowchart LR` (not `graph LR` which is deprecated in Mermaid 11+). Test diagram syntax locally in the Mermaid live editor (mermaid.live) before embedding.

**Warning signs:** Diagram area shows loading state forever, then error fallback.

### Pitfall 5: Dollar-Quoting MDX in SQL

**What goes wrong:** The MDX content string contains single quotes, angle brackets, and special characters that break SQL string literals if enclosed in standard single quotes.

**Why it happens:** MDX content is rich — it contains prose, component tags, and Mermaid DSL.

**How to avoid:** Use PostgreSQL dollar-quoting: `$lesson_content$...your MDX...$lesson_content$`. Choose a unique dollar-quote tag for each lesson to avoid collision.

**Warning signs:** SQL execution fails with syntax error inside the MDX string.

### Pitfall 6: Slug Mismatch Breaking Navigation

**What goes wrong:** Dashboard and lesson navigation links are constructed from slugs. If a semester, course, or lesson slug in the seed file doesn't match what the nav functions expect, clicking a pillar card leads to a 404.

**Why it happens:** The seed.sql has specific slug values that embed in URLs. The `buildBreadcrumbs` and navigation functions in `src/lib/navigation.ts` use slugs from the DB.

**How to avoid:** Use URL-safe slugs (lowercase, hyphens only). For Phase 6: semester slug `foundations`, course slug `neural-network-fundamentals`, lesson slugs `how-transformers-work` and `attention-mechanisms-explained`.

---

## Code Examples

Verified patterns from the actual codebase:

### Correct MDX Structure for This Codebase

```mdx
<Hook>
In 2017, a paper with the humble title "Attention Is All You Need" quietly
ended ten years of RNN dominance. Eight Google researchers published it on a
Friday. By the following year, BERT had set a new record on every NLP
benchmark. By 2020, GPT-3 had generated convincing essays, code, and poetry.
Every language model you use today runs on the architecture in that paper.
Let's understand why it worked.
</Hook>

<ConceptBlock title="Why RNNs Hit a Wall">
Recurrent neural networks were the dominant architecture for sequences through
most of the 2010s. They processed tokens one at a time, maintaining a hidden
state that carried information forward. The problem: to understand word 500,
the network had to thread information through 499 previous hidden states.
Gradients vanished. Long-range dependencies became unreliable.

**Sequential processing** meant training couldn't be parallelized — the GPU
sat waiting for each token to finish before starting the next. Training a
large RNN was genuinely painful. The transformer eliminated both problems in
one move.
</ConceptBlock>

<ConceptBlock title="The Transformer's Core Insight">
Instead of processing tokens sequentially, the transformer looks at all tokens
simultaneously and computes relationships between every pair. This is
<Definition term="self-attention">A mechanism that allows each position in a
sequence to attend to all other positions, computing a weighted sum of their
representations based on learned relevance scores.</Definition>.

The computation is parallel across all positions — the GPU can process the
entire sequence at once. This is why training a transformer is orders of
magnitude faster than training an equivalent RNN.
</ConceptBlock>

<Diagram chart="flowchart LR
  Input[Input Tokens] --> Embed[Embeddings + Positional Encoding]
  Embed --> Enc[Encoder Stack]
  Enc --> Cross[Cross-Attention]
  Embed --> Dec[Decoder Stack]
  Cross --> Dec
  Dec --> Out[Output Tokens]" caption="Transformer encoder-decoder architecture" />

<Quiz questionId="11111111-1111-1111-1111-111111111111" />

<DeepDive>
The positional encoding problem is worth understanding in depth...
</DeepDive>

<Exercise>
## Scenario
You are advising an NLP team migrating from an LSTM-based text classifier
to a transformer. The current model processes 512-token documents.

## Deliverable
Write a one-page technical memo explaining: (1) what changes at the
architecture level, (2) what stays the same in the training loop, and
(3) what new hyperparameters they need to tune.

## Success Criteria
- Correctly identifies that positional encoding replaces the LSTM's
  implicit sequence tracking
- Names at least 3 transformer-specific hyperparameters (num_heads,
  num_layers, d_model)
- Addresses why the migration enables parallelization
</Exercise>

<Takeaways>
- Transformers replaced RNNs by processing all tokens simultaneously via
  **self-attention** rather than sequentially
- The encoder reads the full input; the decoder generates output one token
  at a time, attending to encoder output via **cross-attention**
- Parallelization during training is the transformer's practical superpower
  — not just accuracy, but training speed
- New terms: **self-attention**, **cross-attention**, **positional encoding**,
  **encoder-decoder architecture**
</Takeaways>
```

### SQL Pattern — Lesson with Dollar-Quoted MDX

```sql
DO $$
DECLARE
  v_course_id uuid;
  v_lesson_id uuid;
  v_q1 uuid := '11111111-1111-1111-1111-111111111111';
  v_q2 uuid := '22222222-2222-2222-2222-222222222222';
  v_q3 uuid := '33333333-3333-3333-3333-333333333333';
  v_q4 uuid := '44444444-4444-4444-4444-444444444444';
  v_q5 uuid := '55555555-5555-5555-5555-555555555555';
  v_mdx text;
BEGIN
  SELECT c.id INTO v_course_id
  FROM courses c
  JOIN semesters s ON c.semester_id = s.id
  JOIN pillars p ON s.pillar_id = p.id
  WHERE p.slug = 'ai-engineering'
    AND s.slug = 'foundations'
    AND c.slug = 'neural-network-fundamentals';

  v_mdx := $lesson_content$
<Hook>
...content here...
</Hook>
<Quiz questionId="11111111-1111-1111-1111-111111111111" />
  $lesson_content$;

  INSERT INTO lessons (
    course_id, name, slug, description, mdx_content,
    learning_objectives, estimated_minutes, display_order
  ) VALUES (
    v_course_id,
    'How Transformers Work',
    'how-transformers-work',
    'Understand the architecture that powers every modern language model.',
    v_mdx,
    ARRAY[
      'Explain why transformers replaced RNNs',
      'Describe encoder-decoder structure',
      'Identify the role of self-attention'
    ],
    18,
    1
  )
  ON CONFLICT (course_id, slug) DO UPDATE SET
    mdx_content         = EXCLUDED.mdx_content,
    estimated_minutes   = EXCLUDED.estimated_minutes,
    learning_objectives = EXCLUDED.learning_objectives,
    content_version     = lessons.content_version + 1,
    updated_at          = NOW()
  RETURNING id INTO v_lesson_id;

  -- Insert quiz questions
  INSERT INTO quiz_questions (
    id, lesson_id, question_type, question_text,
    options, correct_answer, explanation, display_order
  ) VALUES (
    v_q1, v_lesson_id, 'multiple_choice',
    'What fundamental limitation of RNNs did transformers solve?',
    '[{"id":"a","text":"Cannot handle variable-length sequences","isCorrect":false},
      {"id":"b","text":"Sequential processing prevents parallelization","isCorrect":true},
      {"id":"c","text":"Cannot represent long documents","isCorrect":false},
      {"id":"d","text":"Require too much labeled data","isCorrect":false}]'::jsonb,
    'Sequential processing prevents parallelization',
    'RNNs process tokens one at a time — each step depends on the previous hidden state. This prevents GPU parallelism. Transformers attend to all positions simultaneously, enabling massively parallel training.',
    1
  ) ON CONFLICT (id) DO NOTHING;
END;
$$;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `graph LR` Mermaid syntax | `flowchart LR` | Mermaid 10+ | Old syntax still works but deprecated; use `flowchart` |
| Hardcoded quiz questions in React component state | DB-backed quiz_questions table + QuizProvider context | Phase 4 | Quiz persistence, FSRS groundwork requires DB rows |

**Deprecated/outdated:**
- `<Question>`, `<Option>`, `<Explanation>` tags from content-format-standards.md: Described the design intention, never implemented as React components. Replaced by the `<Quiz questionId="...">` database-backed approach.
- `<Exercise estimated="20 min">`: The `estimated` prop is not implemented in `Exercise.tsx`. Estimated time is on the lesson card, not the Exercise component.

---

## Open Questions

1. **Existing seed data — what is currently in production DB?**
   - What we know: Phase 1 seed.sql was applied. It contains 7 pillars with different names/descriptions than the project brief (e.g., "Technical Systems" vs "Technical Systems & Data Infrastructure"). It also has semesters, courses, and lessons for a different hierarchy than the Phase 6 CONTEXT.md specifies.
   - What's unclear: Whether any progress data exists on those placeholder lesson rows. If so, dropping them would lose user progress.
   - Recommendation: Use upsert on pillars (slug-keyed). For semesters/courses/lessons: check if the Phase 1 slugs conflict with Phase 6 slugs. They likely do (e.g., Phase 1 has `foundations-ml` for AI semester; Phase 6 wants `foundations`). Handle by: either updating Phase 1 slug to match Phase 6, or inserting Phase 6 with a different slug. Simpler to align slugs in the seed file to avoid orphaned data.

2. **How to handle RETURNING id when ON CONFLICT fires?**
   - What we know: PostgreSQL's `INSERT ... ON CONFLICT DO UPDATE ... RETURNING id` returns the id whether inserted or updated. This pattern works cleanly.
   - What's unclear: Nothing — this is standard PostgreSQL behavior.
   - Recommendation: Use `RETURNING id INTO v_lesson_id` inside a DO block; it correctly captures the ID in both insert and update cases.

3. **Should the existing Phase 1 placeholder lessons be deleted or kept?**
   - What we know: Phase 1 has lesson rows like "What is Supervised Learning?", "Linear Regression", "The Perceptron", etc. These are in courses (supervised-learning, neural-networks) under semester `foundations-ml`.
   - What's unclear: Whether the user wants to preserve these as scaffold content or replace them.
   - Recommendation: The CONTEXT.md specifies Semester 1 slug as `foundations` (not `foundations-ml`) with specific course names (Course 1.1: Mathematical Foundations for AI, Course 1.2: Neural Network Fundamentals, Course 1.3: PyTorch Fundamentals). These do NOT match the Phase 1 seed. Insert the Phase 6 hierarchy in parallel — it occupies different slug space. The Phase 1 rows can remain (they don't conflict). This is the zero-risk approach.

---

## Key Findings About the Existing Codebase

These are verified facts from reading the source, not assumptions:

1. **The Quiz component uses `questionId` (UUID string) as its only prop** — it does NOT render question text itself. All question data is pre-loaded into QuizProvider context from the `quizQuestions` prop on LessonBody, which comes from a `active_quiz_questions` DB query filtered by `lesson_id`. MDX `<Quiz questionId="...">` is just a pointer into that pre-loaded map.

2. **`estimated_minutes` is already displayed on the lesson page header** — line 150 in `lessons/[lessonSlug]/page.tsx` reads `lesson.estimated_minutes ?? 5` and renders it as `{estimatedMinutes} min read`. The lesson card display needs verification — check PillarCard and course page to see if it's shown pre-opening. Based on the success criteria ("displayed on lesson cards before a lesson is opened"), the course page lesson list must also render it.

3. **The content versioning trigger auto-fires** — defined in `00002_lesson_versioning_trigger.sql`. The first `INSERT` of a lesson row with `mdx_content` does NOT trigger a version write (the trigger guards on `OLD.mdx_content IS NOT NULL`). Subsequent UPDATEs where content changes DO create a `lesson_versions` row. This is correct behavior.

4. **Content tables have no INSERT RLS policy for users** — content is written via admin client (service role) which bypasses RLS. The seed SQL runs via Supabase SQL Editor which uses admin privileges. No auth issues.

5. **`Diagram.tsx` uses a `chart` string prop (not `src`)** — the original `content-format-standards.md` shows `<Diagram src="..." alt="...">` but the actual component takes `chart` (Mermaid DSL string) and `caption`. Use the real component signature.

6. **`estimated_minutes` on lesson cards is already implemented** — the course page (`src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/courses/[courseSlug]/page.tsx`) already renders `{estimatedMinutes} min` with a clock icon on every lesson row (line 182: `const estimatedMinutes = lesson.estimated_minutes ?? 5`). Success criteria 4 ("displayed on lesson cards before a lesson is opened") is satisfied purely by seeding accurate `estimated_minutes` values — no code changes needed.

---

## Sources

### Primary (HIGH confidence)

- `/Users/benjaminbarwo/Downloads/Learning/src/components/lesson/` — All component source files read directly; props interfaces verified
- `/Users/benjaminbarwo/Downloads/Learning/src/lib/mdx-components.ts` — Registry of MDX components confirmed
- `/Users/benjaminbarwo/Downloads/Learning/src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/courses/[courseSlug]/lessons/[lessonSlug]/page.tsx` — Lesson page implementation verified
- `/Users/benjaminbarwo/Downloads/Learning/supabase/migrations/00001_initial_schema.sql` — Schema verified
- `/Users/benjaminbarwo/Downloads/Learning/supabase/seed.sql` — Existing seed data verified
- `/Users/benjaminbarwo/Downloads/Learning/src/types/database.types.ts` — TypeScript types confirmed
- `/Users/benjaminbarwo/Downloads/Learning/package.json` — Dependency versions confirmed

### Secondary (MEDIUM confidence)

- `/Users/benjaminbarwo/Downloads/Learning/curriculum-research/01-ai-agentic-engineering.md` — Curriculum research used for lesson content topics
- `/Users/benjaminbarwo/Downloads/Learning/lesson-design-principles.md` — Content structure principles
- `/Users/benjaminbarwo/Downloads/Learning/content-format-standards.md` — Content schema (Note: component names differ from implementation — use with caution)
- `/Users/benjaminbarwo/Downloads/Learning/deep-dive-analysis.md` — Color palette and architectural decisions

### Tertiary (LOW confidence / needs verification)

None. All findings have been verified against source files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed and in use
- Architecture patterns: HIGH — verified against actual component source files and DB schema
- Pitfalls: HIGH — discovered by reading actual implementation vs. content-format-standards mismatch
- MDX component API: HIGH — read source files directly
- SQL patterns: HIGH — verified against schema; upsert syntax is standard PostgreSQL

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable codebase; schema unlikely to change)
