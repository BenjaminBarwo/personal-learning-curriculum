# Phase 11: Content Generation CLI - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

A developer-run CLI pipeline (`pnpm generate`) that uses Claude API to generate validated MDX lessons for any scope (pillar / semester / course / lesson) and seeds them idempotently into Supabase. The CLI handles research, generation, validation, review, and seeding in a single pipeline. Lesson rendering, quiz interactivity, and progress tracking are handled by existing phases.

</domain>

<decisions>
## Implementation Decisions

### AI Generation Strategy
- **Research approach**: Two sources — web search per topic (using Claude's built-in web search) AND course-level reference materials
- **Reference material handling**: Each course can have a `references/` folder or config entry (auto-loaded). Additional refs via `--refs` flag per run. Both work together
- **Research transparency**: Log but don't block — research sources saved alongside each lesson for traceability, generation proceeds automatically without approval gates
- **Model selection**: Default to `claude-sonnet-4-6`. Override with `--model opus` flag when maximum depth is needed on specific topics
- **Sequential generation**: One lesson at a time (no parallel generation). Simpler to track, lower API concurrency
- **Lesson continuity**: Each lesson gets context about prior lessons in the course — terms already defined, concepts already covered. Later lessons build on earlier ones, avoiding re-explanation

### Content Level & Progression
- **Assume zero knowledge**: First lessons in any course assume the learner knows nothing about the domain. No unexplained jargon
- **Semester-based difficulty**: Semester 1 = beginner across all pillars. Semester 2 = intermediate. Semester number drives complexity level
- **Terminology handling**: Always spell out on first use within each lesson with a `<Definition>` component. Later semesters can use abbreviations more freely in running text after the first definition per lesson
- **Two-pass quality control**: First pass generates content. Second pass reviews against prior lessons for consistency, prerequisite coverage, and difficulty progression

### Lesson Structure & Depth
- **ConceptBlock count**: Varies by complexity — simple topics get 2-3 blocks, complex topics get 4-5. Content dictates structure
- **Quiz questions**: 3-5 questions per lesson checkpoint (thorough reinforcement)
- **Exercise type**: Mix based on pillar — technical pillars (AI, Systems) get hands-on projects; non-technical pillars (Business, Human Behavior) get thought exercises
- **Cross-domain connections**: Woven organically into ConceptBlocks AND summarized in Takeaways. Leverage AI's strength at drawing unexpected connections across pillars
- **Tone**: Smart friend explaining — conversational, uses "you" and "we", confident but not condescending. Per existing lesson design principles

### CLI Workflow & Scope
- **Primary usage**: Pillar-level generation (`pnpm generate --pillar 2`)
- **All scope flags available**: `--pillar`, `--semester`, `--course`, `--lesson` for granular control
- **Idempotency**: Skip existing lessons by default, log what was skipped. Use `--force` to regenerate
- **Progress output**: Verbose with pipeline stages per lesson:
  ```
  [3/12] 'Causal Loop Diagrams'
    ├ Researching... done (12s)
    ├ Generating... done (38s)
    ├ Reviewing... done (15s)
    └ Seeding... done
  ```

### Output & Review
- **Post-run report**: CLI outputs a summary report (lessons generated, skipped, warnings, quality flags). Plus spot-check specific lessons on the site
- **Dry-run behavior**: Single lessons print to stdout; batch runs save to local output directory
- **Usage documentation**: Include a clear USAGE.md with plain-language, step-by-step instructions on how to run the CLI reliably

### Claude's Discretion
- Validation failure handling (recommended: auto-retry once, then skip and log)
- Version history on --force regeneration (recommended: keep versions per existing schema)
- Generation log persistence (recommended: save markdown report to logs/ directory)
- Cross-domain connection summary in reports (recommended: include in end-of-run report)
- Dry-run output format details
- Search query construction for web research

</decisions>

<specifics>
## Specific Ideas

- "Given that your curriculum spans systems thinking, technical systems, business competence, and human behavior, the cross-domain linking is where you'll get the most value. That's actually something AI can do better than most human curriculum designers — drawing unexpected connections across domains — if you prompt for it."
- Lessons should feel like a well-designed app, not a PDF — content broken into small, digestible sections, never walls of text
- Existing lesson design principles doc and content format standards doc should be fed into the generation prompt as the template contract
- A complete example lesson should be included in the system prompt as a few-shot reference (per content-format-standards.md)

</specifics>

<deferred>
## Deferred Ideas

- **Wipe and revise existing seeded data** — Current seeded content needs to be cleared and regenerated to match the "assume zero knowledge" approach and proper difficulty progression. This should happen as a separate action (likely run the CLI against existing courses with --force after Phase 11 is built)
- **Existing content revision** — Seeded lessons from v1.0 Phase 6 need terminology and complexity review to match the new content standards

</deferred>

---

*Phase: 11-content-generation-cli*
*Context gathered: 2026-03-03*
