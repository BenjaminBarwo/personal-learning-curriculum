# Phase 3: Lesson Content Pipeline - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Render rich MDX lesson content with custom components (Hook, ConceptBlock, DeepDive, Exercise, Takeaways, Definition, Diagram, Video) and content versioning. This phase delivers the lesson reading experience — how content is displayed and interacted with. Content sourcing, generation, and quiz functionality belong in other phases.

</domain>

<decisions>
## Implementation Decisions

### Component Visual Style
- Exercise component uses a warm/action accent color (amber/orange) with distinct colored section
- Takeaways component uses a success accent color (green) with distinct colored section
- Fixed content palette across all lessons — NOT pillar-specific accent colors
- Pillar colors used only on lesson header/breadcrumb, not on content components

### Hook Component
- Claude's discretion on visual treatment (bold hero, callout, or conversational)

### ConceptBlock Component
- Claude's discretion on visual treatment (cards, numbered sections, etc.)

### Definition Terms
- Inline expansion — clicking a term expands the definition right below the word in the text flow
- One definition open at a time — expanding a new one auto-collapses the previous
- Dismiss by clicking anywhere outside the expanded definition
- Visual styling of definition terms at Claude's discretion (must work in dark and light mode)

### DeepDive Sections
- Collapsed by default — learner sees a teaser and actively chooses to expand
- Accordion behavior — one DeepDive open at a time, opening one collapses the previous
- Show estimated reading time (~X min read) next to the expand trigger
- Expand/collapse interaction pattern at Claude's discretion

### Video Embed Component
- Support any video URL — YouTube, Vimeo, or direct mp4/webm links
- Click-to-play thumbnail — show a poster image, only load iframe/player on click
- Wrapper and caption at Claude's discretion

### Reading Experience
- Medium content width (~75-80ch) for lesson body
- No scroll progress indicator
- No table of contents — lessons are read top-to-bottom
- Estimated reading time displayed at the top of the lesson
- Code blocks with syntax highlighting only — no copy button
- Next/Previous lesson navigation buttons at the bottom of the lesson
- Manual "Mark as complete" button at the end of the lesson
- Visual separators between major sections at Claude's discretion

### Diagram Presentation
- Mermaid diagrams only — no static image diagram component
- Auto-themed to match dark/light mode (dark colors on dark, light on light)
- Optional caption below diagrams (MDX author can specify)
- Mobile behavior at Claude's discretion

### Claude's Discretion
- Hook component visual treatment
- ConceptBlock component visual treatment
- DeepDive expand/collapse animation style
- Definition term visual indicator styling
- Video embed wrapper/caption design
- Visual separators/spacing between lesson sections
- Diagram mobile behavior
- Loading skeleton design for lesson content
- Error state handling for failed MDX rendering

</decisions>

<specifics>
## Specific Ideas

- Exercise and Takeaways should feel visually distinct from body content — colored sections that clearly signal "this is an action item" and "this is a summary"
- Reading time on DeepDive sections helps learners decide whether to go deeper
- Click-to-play for videos prevents slow page loads on content-heavy lessons
- One-at-a-time pattern for both Definitions and DeepDives keeps the page focused and scannable

</specifics>

<deferred>
## Deferred Ideas

- Web-sourcing agents to find educational videos and materials automatically — future phase or v2 AI-generation feature
- Copy button on code blocks — could add later if learners need it

</deferred>

---

*Phase: 03-lesson-content-pipeline*
*Context gathered: 2026-02-27*
