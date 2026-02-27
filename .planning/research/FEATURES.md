# Feature Landscape

**Domain:** Personal learning curriculum platform (self-directed, single learner)
**Researched:** 2026-02-27
**Confidence:** MEDIUM — training data from comparable platforms (Duolingo, Khan Academy, Coursera, Anki, RemNote, Obsidian, Readwise, Linear, Roam Research). External search tools unavailable; findings drawn from known platform patterns and project-specific context from PROJECT.md. Flagged where verification is needed.

---

## Table Stakes

Features the learner will expect on first use. Missing any of these and the platform feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Lesson rendering** | The core contract — content must display correctly | Med | MDX with custom components; `next-mdx-remote` server-side compilation already decided |
| **Progress tracking** (started / completed per lesson) | Without this, the learner has no continuity between sessions | Low-Med | Supabase table, mark on interaction; must persist across devices via auth |
| **"Continue where you left off"** | First thing every returning user wants | Low | Requires progress tracking; last-opened lesson pointer |
| **Hierarchical navigation** (Pillar → Semester → Course → Lesson) | The curriculum has 600+ lessons; learner must be able to orient | Med | Breadcrumbs, sidebar, or drill-down — disorientation kills sessions |
| **Inline quizzes with immediate feedback** | Core retention mechanism; expected from any educational platform | Med | Custom engine already decided; multiple question types needed |
| **Estimated lesson time** | Learner decides "do I have time for this now?" without opening it | Low | Stored on lesson record; displayed on card/preview |
| **Completion indicators** at every nav level | Visual proof of progress — critical for motivation | Low | Checkmarks, rings, percent complete; computed from lesson completion |
| **Mobile-responsive design** | Learner will access on phone; broken mobile = abandoned session | Med | Tailwind responsive classes; custom MDX components must be tested on small viewports |
| **Dark mode (primary)** | Stated as primary; light mode secondary | Low | Tailwind `dark:` classes; CSS variable theming |
| **Authentication** | Content gating; progress belongs to a user | Low | Clerk already decided; redirect unauthenticated users |
| **Persistent state across sessions** | All progress, quiz scores survive page refresh and login | Low | DB-backed; no ephemeral localStorage-only state |
| **Readable typography** | Walls of text are friction; line length, size, spacing matter | Low | Prose styles; learner profile explicitly notes low reading tolerance |
| **Loading and error states** | Broken/blank pages create distrust | Low | Every async fetch needs loading skeleton + error boundary |
| **Empty states** | "No lessons yet" needs a clear message, not a blank div | Low | Each empty list needs messaging + next action |

---

## Differentiators

Features that set this platform apart from generic LMS tools. Not universally expected, but create meaningful competitive advantage for the learner's experience.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Custom MDX component system** (`Hook`, `ConceptBlock`, `Quiz`, `DeepDive`, `Exercise`, `Takeaways`, `Definition`) | Lessons feel like a designed product, not a rendered text file | High | Each component needs its own styling contract and interaction model; this IS the product |
| **Pillar color-coding system** | Instant visual context — learner knows which domain they're in at a glance | Low | 7 distinct brand colors; propagated via CSS custom properties or Tailwind config |
| **Collapsible DeepDive sections** | Respects learner autonomy — go deeper only when curious; reduces default cognitive load | Low-Med | Accordion pattern; state can be ephemeral (not persisted) |
| **Domain terminology highlighting with hover/tap definitions** | Builds vocabulary in context; learner never has to leave the lesson to understand a term | Med | `<Definition>` component; requires term-to-definition map per pillar |
| **Completion-based semester progression with manual override** | Structure (locked progression) without rigidity (override exists); mirrors real curricula | Med | Unlock logic in DB or computed on fetch; manual override flag per user |
| **Cross-pillar lesson connections** | Systems Thinking lens; learner sees how concepts connect across domains | Med-High | `lesson_connections` junction table already designed; UI needs to surface links without overwhelming |
| **Content versioning with rollback** | AI-generated content can degrade; version history + rollback is safety net | Med | `content_version` integer + rollback table already planned |
| **Lesson Hook component** (real-world case study opener) | Solves the "why should I care?" problem before any teaching happens | Low | Part of MDX component system; no special logic — design and copy quality is the differentiator |
| **Quiz question type diversity** | Multiple-choice, recall, application, analysis, comparison — not just trivia | Med | Recall and application types require open-ended or structured inputs; harder to auto-grade |
| **Spaced repetition (FSRS algorithm)** | 20-30% fewer reviews for equivalent retention vs SM-2; matters at scale across hundreds of terms | High | Phase 3; algorithm is well-documented in open source; integration complexity is the challenge |
| **AI-powered content generation** | Entire courses created from a topic input; scales curriculum without manual authoring | Very High | Phase 2; Claude API, pre-generate and cache; latency management is critical constraint |
| **AI tutor chat** | On-demand explanation within lesson context; fills gaps quicker than re-reading | Very High | Phase 3; context window management (which lesson, which concept, quiz state) is complex |
| **Adaptive difficulty** | Quiz difficulty adjusts to demonstrated understanding | High | Phase 4; requires sufficient quiz history and a scoring model |
| **Streak tracking** | Behavioral psychology — daily visit habit formation | Low | Phase 4; date comparison logic; needs careful design to avoid anxiety-inducing friction |
| **Gamification (XP, badges, milestones)** | Dopamine loop for motivation; needs restraint — over-gamification feels patronizing | Med | Phase 4; trophy/milestone events are highest value; points systems lowest |
| **PDF export** | Lesson as portable reference; study offline | Med | Phase 4; MDX → clean PDF is non-trivial; puppeteer or react-pdf |
| **Study scheduling / calendar integration** | Planned sessions appear in calendar; reduces decision fatigue | High | Phase 4; OAuth scopes for Google/Apple Calendar; significant scope |
| **Diagram component** (`<Diagram>`) | Visual explanations for complex systems; worth more than paragraphs | Med | Already listed in component set; needs rendering strategy (Mermaid, static SVG, or custom) |

---

## Anti-Features

Features to explicitly NOT build — either because they conflict with the platform's purpose or create disproportionate complexity for zero learner value.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Social features** (comments, discussion forums, leaderboards, shared decks) | This is a single-learner platform by design; social infrastructure is massive scope for no benefit | Stay single-user; multi-user scaffolding (user_id, RLS) is enough for the future |
| **Real-time collaboration** | Multiplayer document editing adds WebSocket/CRDT complexity; zero use case here | Not planned; explicitly out of scope |
| **Drag-and-drop quiz type (Phase 1)** | High complexity for marginal pedagogical gain vs multiple-choice and recall; distraction from core | Add in Phase 3+ if recall quiz types prove insufficient |
| **Marketplace / content selling** | Scope explosion; monetization model not the goal | Not planned |
| **Video hosting** | Storage costs, player complexity, accessibility burden; MDX format is the content model | Link to external video if needed (YouTube embed); do not host |
| **Community/cohort features** (cohorts, live sessions, office hours) | Async self-directed learning is the model; live scheduling is a different product | Not planned |
| **User-generated content** (learner adding their own lessons) | Author of content is the system (AI-generated or hand-written); learner notes ≠ lesson content | Notes/annotations are a possible Phase 4 feature if evidence demands it |
| **Third-party quiz libraries** | Libraries optimize for the wrong use case; 200-line custom engine already planned | Custom engine covers all needed types; avoid dependency for something this central |
| **On-demand AI generation per lesson open** | 5-15s latency per open violates the core UX principle ("frictionless to start") | Pre-generate and cache; on-demand only for AI tutor |
| **Filesystem-based content** | Breaks AI generation model; MDX-in-DB already decided | Supabase MDX storage via `next-mdx-remote` |
| **SM-2 spaced repetition** | FSRS is 20-30% more efficient; no reason to implement the inferior algorithm | FSRS already decided for Phase 3 |
| **Global/unauthenticated access** | Progress is meaningless without identity; everything requires auth | Redirect to Clerk login; no guest mode |

---

## Feature Dependencies

```
Authentication (Clerk)
  → Progress tracking (needs user_id)
    → "Continue where you left off" (needs progress records)
    → Completion indicators at all nav levels (aggregates progress)
    → Semester progression unlock (computed from lesson completions)
    → Spaced repetition (Phase 3) (review schedule per user)

Lesson rendering (MDX + custom components)
  → Hook, ConceptBlock, Quiz, DeepDive, Exercise, Takeaways, Definition (all depend on render engine)
  → Collapsible DeepDive (depends on DeepDive component)
  → Domain terminology highlighting (depends on Definition component + term map)
  → Inline quizzes (depends on Quiz/Question/Option/Explanation components)
    → Quiz scores stored (depends on auth + DB)
    → Adaptive difficulty (Phase 4) (depends on quiz score history)

Content versioning
  → AI content generation (Phase 2) (AI writes new versions; rollback is safety net)

Cross-pillar lesson connections
  → lesson_connections table
  → Sufficient content in 2+ pillars to surface connections

Spaced repetition (Phase 3)
  → Quiz vocabulary/term data from completed lessons (at least Pillar 1 complete)
  → FSRS scheduling algorithm implementation

AI content generation (Phase 2)
  → Claude API integration
  → Pre-generation pipeline (not on-demand)
  → Content versioning (generated content needs version tracking)

AI tutor chat (Phase 3)
  → Lesson context (which lesson, which section)
  → Claude API integration (shared with generation)
```

---

## MVP Recommendation

The MVP (Phase 1) should prove the content experience is worth returning to. Everything else is enhancement.

**Prioritize for Phase 1:**

1. Authentication (Clerk) — gating prerequisite for everything
2. Lesson rendering with all custom MDX components — this IS the product; nothing else matters if the lesson is bad
3. Hierarchical navigation (Pillar → Semester → Course → Lesson) with breadcrumbs
4. Inline quizzes with immediate feedback (multiple-choice + recall types minimum)
5. Progress tracking (started/completed per lesson, quiz scores stored)
6. "Continue where you left off" dashboard widget
7. Completion indicators at every nav level
8. Estimated lesson time on lesson cards
9. Pillar color-coding system
10. Collapsible DeepDive sections
11. Domain terminology highlighting with hover/tap definitions
12. Dark mode (primary) + light mode + mobile-responsive
13. Loading, error, and empty states everywhere
14. Seed content: 2 complete hand-written lessons for Pillar 1

**Defer with confidence:**

| Feature | Defer Reason |
|---------|--------------|
| AI content generation | Phase 2; 5-15s latency problem requires pre-gen pipeline design; do rendering first |
| Spaced repetition (FSRS) | Phase 3; needs quiz history across completed lessons to be meaningful |
| AI tutor chat | Phase 3; context management complexity; validate lesson quality first |
| Adaptive difficulty | Phase 4; needs substantial quiz history |
| Gamification / streaks | Phase 4; adds motivation layer but core content must be compelling without it |
| Cross-pillar connections UI | After 2+ pillars have content (after Pillar 1 is proven) |
| Content for Pillars 2-7 | After Pillar 1 is battle-tested |
| Drag-and-drop quiz type | Phase 3+; recall and multiple-choice cover core needs |
| PDF export | Phase 4; niche use case |
| Study scheduling | Phase 4; significant OAuth scope |

---

## Platform Analogies and Where This Sits

For calibration, this platform borrows from:

| Platform | What to Borrow | What to Reject |
|----------|---------------|----------------|
| **Khan Academy** | Hierarchical curriculum structure, progress rings, mastery-based progression | Social features, generic content, one-size-fits-all pacing |
| **Duolingo** | Streak motivation, lesson-at-a-time atomic units, immediate quiz feedback | Over-gamification, shallow content, streak anxiety |
| **Anki / RemNote** | Spaced repetition model, card-based review | Raw flashcard UI (too spartan for lesson-level content) |
| **Coursera / edX** | Semester structure, video + reading + quiz format, certificates | Multi-author complexity, video-first content model, social forums |
| **Readwise Reader** | Domain highlighting, annotation-in-context | Passive reading focus (this platform is active) |
| **Linear** (non-edu) | Clean information hierarchy, keyboard-first, product-grade polish | Project management paradigm |

This platform is closest to **a bespoke Khan Academy for one person, with Anki's retention engine and the polish of a Linear-tier product.**

---

## Sources

- Training data: Platform feature analysis of Duolingo, Khan Academy, Coursera, Anki, RemNote, Readwise, Obsidian, Roam Research, Logseq (knowledge cutoff August 2025) — **MEDIUM confidence**
- Project-specific context: `/Users/benjaminbarwo/Downloads/Learning/.planning/PROJECT.md` — **HIGH confidence** (primary source)
- External search: unavailable during research session (WebSearch, WebFetch, Bash tools denied) — flagged where fresh verification would be valuable

**Verification recommended before Phase 3:**
- FSRS vs SM-2 retention improvement claims (20-30%) — check open-benchmarks/fsrs repo on GitHub
- AI tutor latency patterns — verify Claude API streaming capabilities and context window management patterns
- next-mdx-remote v4+ API surface for custom components — verify against official docs before implementation
