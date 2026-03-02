# Phase 6: Seed Content - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Seed all 7 learning pillars into the database and create 2 complete, real lessons for Pillar 1 (AI & Agentic Engineering). Validate the full learning loop end-to-end: open lesson → read content → take quiz → mark complete → see progress update on dashboard. Display estimated reading time on lesson cards.

This phase does NOT include AI content generation pipelines, content for Pillars 2-7, or spaced repetition integration.

</domain>

<decisions>
## Implementation Decisions

### The 7 Pillars
- All 7 pillars seeded as database rows with name, color, description, sort_order
- Claude picks a cohesive, dark-mode-friendly color palette (the deep-dive analysis suggests: Electric Blue, Emerald, Amber, Purple, Rose, Cyan, Slate)
- Full descriptions from the project brief used in the `description` field (multi-line, 5-8 lines per pillar)
- Pillar names exactly as defined in project brief:
  1. AI & Agentic Engineering
  2. Technical Systems & Data Infrastructure
  3. Robotics (Conceptual & Strategic)
  4. Full-Spectrum Business Competence
  5. Human Behavior & Power Dynamics
  6. Systems Thinking (Meta-Pillar)
  7. Communication & Domain Fluency (Cross-Cutting)

### Pillar 1 Hierarchy
- Seed Semester 1: "Foundations" with all 3 courses:
  - Course 1.1: Mathematical Foundations for AI
  - Course 1.2: Neural Network Fundamentals
  - Course 1.3: PyTorch Fundamentals
- Pillars 2-7 get pillar rows only — no semesters or courses yet
- Lessons placed in Course 1.2 (Neural Network Fundamentals)

### Lesson Topics
- Lesson 1: "How Transformers Work" — the transformer architecture, encoder/decoder structure, why transformers replaced RNNs
- Lesson 2: "Attention Mechanisms Explained" — scaled dot-product attention, multi-head attention, self-attention vs cross-attention
- Both lessons placed in Course 1.2: Neural Network Fundamentals

### Lesson Authoring
- Claude writes the full lesson MDX content, following the design template and curriculum research as source material
- Content follows the lesson design principles: conversational but precise, "like a smart friend explaining something"
- Direct address ("you/we"), real-world case studies as hooks, humor where appropriate
- Domain terminology introduced in context, bolded on first use with inline Definition components

### Lesson Structure Per Lesson
- 4-5 ConceptBlocks per lesson (3-4 sentences each)
- 5 quiz questions per lesson — mix of recall, application, analysis, comparison types
- Mermaid diagrams included where they aid understanding (transformer architecture, attention flow)
- Substantial DeepDive section (3-4 paragraphs of additional detail)
- Real, doable Exercise section with scenario, deliverable, and success criteria
- Takeaways with key points and new terms learned

### Reading Time
- Calculated via word count formula (~200-250 words/minute on MDX text content)
- Computed at application level when inserting/updating lesson content (not a database trigger)
- Stored in existing `estimated_minutes` column on lessons table
- Displayed on lesson cards as "X min read" — minutes only, clean format

### Claude's Discretion
- Specific pillar color hex values (using the suggested palette as a starting point)
- Mermaid diagram complexity and layout choices
- Exact hook stories and case studies for each lesson
- Exercise difficulty level and specific deliverables
- Whether to include Definition components for every technical term or just key ones

</decisions>

<specifics>
## Specific Ideas

- Lesson design template from `lesson-design-principles.md`: Hook → ConceptBlocks → Quiz → DeepDive → Exercise → Takeaways
- MDX content schema from `content-format-standards.md` — use exact component tags: `<Hook>`, `<ConceptBlock>`, `<Quiz>`, `<Question>`, `<Option>`, `<Explanation>`, `<DeepDive>`, `<Exercise>`, `<Takeaways>`, `<Definition>`, `<Diagram>`
- Curriculum research in `curriculum-research/01-ai-agentic-engineering.md` provides source material for lesson content
- Deep-dive analysis color palette suggestion: AI=Electric Blue #3B82F6, Technical=Emerald #10B981, Robotics=Amber #F59E0B, Business=Purple #8B5CF6, Human Behavior=Rose #F43F5E, Systems Thinking=Cyan #06B6D4, Communication=Slate #64748B
- Quiz questions must also be inserted into the `quiz_questions` table (not just embedded in MDX) for future FSRS integration

</specifics>

<deferred>
## Deferred Ideas

- AI Content Generation Pipeline — spawning research agents per subject to build deep, well-sourced lessons at scale. This maps to v2 requirements AIGEN-01 through AIGEN-05.
- Content for Pillars 2-7 — after Pillar 1 is battle-tested
- Full semester/course hierarchy for Pillars 2-7 — seed when content pipeline is ready
- Semesters 2-4 for Pillar 1 — seed when Semester 1 content is complete

</deferred>

---

*Phase: 06-seed-content*
*Context gathered: 2026-03-01*
