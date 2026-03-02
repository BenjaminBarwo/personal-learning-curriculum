# Phase 2: App Shell + Navigation - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the app shell, routing, and navigation for the Pillar → Semester → Course → Lesson hierarchy. Includes dark/light mode theming, pillar color system, breadcrumbs, mobile responsiveness, and completion indicators at every level. Does NOT include lesson content rendering, quiz functionality, or progress tracking logic — those are later phases.

</domain>

<decisions>
## Implementation Decisions

### Dashboard & pillar cards
- Card grid layout: 3 columns desktop, 2 tablet, 1 mobile
- Rich cards showing: pillar name, short description, color accent, progress indicator, lesson count
- Color accent bar (left or top border) in pillar color; rest of card is neutral
- Cards link to pillar detail pages

### Navigation pattern
- Top header only — no sidebar
- Each hierarchy level is its own page (nested pages pattern):
  - Dashboard → Pillar page → Semester page → Course page → Lesson page
- Full breadcrumb trail always visible in header (Dashboard › Pillar › Semester › Course › Lesson)
- Every breadcrumb segment is clickable
- Breadcrumbs are the only back-navigation mechanism — no separate back button

### Color & theming
- Dark mode is primary; dark gray backgrounds (not true black) — softer on eyes for long study sessions
- Light mode supported via toggle
- Sun/moon toggle icon in top-right corner of header
- 7 pillar colors (from deep-dive analysis):
  - AI & Agentic Engineering: Electric Blue #3B82F6
  - Technical Systems: Emerald #10B981
  - Robotics: Amber #F59E0B
  - Business: Purple #8B5CF6
  - Human Behavior: Rose #F43F5E
  - Systems Thinking: Cyan #06B6D4
  - Communication: Slate #64748B
- Accent threading: pillar color appears throughout its pages (breadcrumb highlights, section headers, progress bar fill)
- Warm pillar colors (Rose, Amber) restricted to navigation and headers — lesson content areas lean into blue/green tones regardless of pillar

### Completion indicators
- Progress bars (horizontal fill) at pillar and course levels
- Bar shows percentage text (e.g., "75%")
- Note: actual progress tracking logic is Phase 5 — this phase builds the visual indicator components with placeholder/mock data

### Claude's Discretion
- Dashboard empty state approach (all cards at 0% vs guided start highlighting Pillar 1)
- Individual lesson completion status style in course lists (icon indicators vs badges)
- Progress bar color strategy (pillar accent color vs consistent color)
- Loading skeleton design
- Exact spacing, typography, and responsive breakpoints
- Error state handling
- Mobile touch target sizing

</decisions>

<specifics>
## Specific Ideas

- Pillar cards should feel clean and modern — accent bar provides color without overwhelming
- Lesson content area should use blue/green tones for backgrounds/accents regardless of pillar — warmer pillar colors for nav/headers only (user's cognitive ergonomics preference)
- Dark gray aesthetic (like #1a1a2e range) — optimized for reading during study sessions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-app-shell-navigation*
*Context gathered: 2026-02-27*
