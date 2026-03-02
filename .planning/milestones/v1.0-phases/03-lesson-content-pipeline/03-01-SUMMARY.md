---
phase: 03-lesson-content-pipeline
plan: 01
subsystem: ui
tags: [mdx, next-mdx-remote-client, mermaid, react-player, tailwindcss-typography, rehype-pretty-code, shiki]

requires:
  - phase: 02-app-shell-navigation
    provides: Surface token palette, dark-first globals.css, project component conventions

provides:
  - 8 custom MDX lesson components (Hook, ConceptBlock, DeepDive, Exercise, Takeaways, Definition, Diagram, Video)
  - DeepDiveProvider context for one-open-at-a-time accordion behavior
  - DefinitionProvider context for inline term expansion with click-outside dismiss
  - mdxComponents map in src/lib/mdx-components.ts ready for MDXRemote components prop
  - Tailwind Typography plugin configured via CSS-first @plugin pattern

affects:
  - 03-02-lesson-page (uses mdxComponents, all 8 components, MDXRemote integration)

tech-stack:
  added:
    - next-mdx-remote-client@^2.1.9 (MDX RSC rendering from DB strings)
    - rehype-pretty-code@^0.14.1 (server-side syntax highlighting)
    - shiki@^3.23.0 (tokenizer for rehype-pretty-code, pinned for peer compat)
    - react-player@^3.4.0 (video embed with click-to-play)
    - mermaid@^11.12.3 (diagram rendering to SVG)
    - "@tailwindcss/typography@^0.5.19" (prose baseline styles)
    - "@types/mdx@^2.0.13" (MDXComponents TypeScript type)
  patterns:
    - DeepDiveContext: shared client context for accordion one-open-at-a-time
    - DefinitionContext: shared client context with document click-outside listener
    - Dynamic mermaid import inside useEffect (never at module level — prevents SSR crash)
    - mounted guard in Diagram to prevent useTheme undefined on first render
    - react-player v3 uses src prop (not url), VideoElementProps API

key-files:
  created:
    - src/components/lesson/Hook.tsx
    - src/components/lesson/ConceptBlock.tsx
    - src/components/lesson/DeepDive.tsx
    - src/components/lesson/Exercise.tsx
    - src/components/lesson/Takeaways.tsx
    - src/components/lesson/Definition.tsx
    - src/components/lesson/Diagram.tsx
    - src/components/lesson/Video.tsx
    - src/components/lesson/index.ts
    - src/lib/mdx-components.ts
  modified:
    - src/app/globals.css (added @plugin "@tailwindcss/typography")
    - package.json (added 7 dependencies)

key-decisions:
  - "react-player v3.4.0 uses src prop (not url) and VideoElementProps API — breaking change from v2 research references; Video.tsx updated accordingly"
  - "react-player/lazy subpath does not exist in v3.4.0; import from react-player main instead"
  - "shiki pinned to ^3.23.0 — v4.0.0 not yet supported by rehype-pretty-code@0.14.1 peer range"
  - "@types/mdx added as dev dependency for MDXComponents type (mdx/types module)"
  - "DeepDiveProvider and DefinitionProvider exported from their component files and re-exported from index.ts for use as lesson page wrappers"

patterns-established:
  - "Lesson component pattern: server components for static display (Hook, ConceptBlock, Exercise, Takeaways); client components with context for interactivity (DeepDive, Definition, Diagram, Video)"
  - "Context provider pattern: each interactive group gets a Context + Provider exported from the same file as the component"
  - "Mermaid SSR safety: always await import('mermaid') inside useEffect, never at module level; mounted guard prevents undefined resolvedTheme"
  - "Tailwind Typography: added via @plugin in globals.css; prose classes applied at consumption site (lesson page), not here"

requirements-completed: [CONT-01, CONT-02, CONT-03, CONT-05]

duration: 4min
completed: 2026-02-28
---

# Phase 03 Plan 01: MDX Lesson Component Library Summary

**8 custom MDX components (Hook, ConceptBlock, DeepDive, Exercise, Takeaways, Definition, Diagram, Video) with accordion/inline-expand contexts, Mermaid SVG rendering, and Tailwind Typography configured for the lesson rendering pipeline**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-28T00:50:56Z
- **Completed:** 2026-02-28T00:54:55Z
- **Tasks:** 2
- **Files modified:** 12 (10 created, 2 modified)

## Accomplishments

- Installed all 6 MDX pipeline dependencies (next-mdx-remote-client, rehype-pretty-code, shiki, react-player, mermaid, @tailwindcss/typography) and configured Tailwind Typography plugin in CSS-first v4 pattern
- Built all 8 custom lesson components: 4 server components (Hook, ConceptBlock, Exercise, Takeaways) and 4 client components (DeepDive, Definition, Diagram, Video) with correct directive placement
- Implemented DeepDiveProvider context for one-open-at-a-time accordion and DefinitionProvider context with click-outside dismiss for inline term expansion
- Diagram component uses dynamic mermaid import inside useEffect with mounted guard and theme switching via next-themes
- MDX components map exported from src/lib/mdx-components.ts, ready to pass as components prop to MDXRemote

## Task Commits

1. **Task 1: Install dependencies and configure Tailwind Typography** - `808f2fe` (feat)
2. **Task 2: Build all 8 custom lesson components and MDX components map** - `b16ac1c` (feat)

## Files Created/Modified

- `src/components/lesson/Hook.tsx` - Lesson opener callout with decorative accent bar, server component
- `src/components/lesson/ConceptBlock.tsx` - Concept explanation card with icon header, server component
- `src/components/lesson/Exercise.tsx` - Amber/orange accent practice section, server component
- `src/components/lesson/Takeaways.tsx` - Emerald/green accent summary section, server component
- `src/components/lesson/DeepDive.tsx` - Accordion client component with DeepDiveContext; one-open-at-a-time via shared state
- `src/components/lesson/Definition.tsx` - Inline term expansion client component with DefinitionContext and document click-outside listener
- `src/components/lesson/Diagram.tsx` - Client-only Mermaid renderer with dynamic import, mounted guard, and resolvedTheme switching
- `src/components/lesson/Video.tsx` - react-player client component with click-to-play light mode (v3 src prop API)
- `src/components/lesson/index.ts` - Re-exports all 8 components plus DeepDiveProvider and DefinitionProvider
- `src/lib/mdx-components.ts` - MDXComponents map for MDXRemote components prop
- `src/app/globals.css` - Added @plugin "@tailwindcss/typography" after @import "tailwindcss"
- `package.json` - Added 7 production and dev dependencies

## Decisions Made

- Used `react-player` main import (not `react-player/lazy`) because the lazy subpath does not exist in v3.4.0
- Pinned shiki to ^3.x because shiki v4.0.0 is outside rehype-pretty-code@0.14.1 peer range (^1||^2||^3)
- Added `@types/mdx` as dev dependency to satisfy `import type { MDXComponents } from 'mdx/types'`
- DeepDiveProvider and DefinitionProvider are exported from their component files and barrel-exported from index.ts — the lesson page (Plan 03-02) will wrap MDX content with both providers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Downgraded shiki from 4.0.0 to ^3.23.0 for peer compatibility**
- **Found during:** Task 1 (dependency installation)
- **Issue:** shiki 4.0.0 installed by default but outside rehype-pretty-code@0.14.1 peer range of ^1||^2||^3; pnpm reported unmet peer warning
- **Fix:** Ran `pnpm add shiki@^3.0.0` to install shiki 3.23.0
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** pnpm list shows shiki@3.23.0; no peer warnings
- **Committed in:** 808f2fe (Task 1 commit)

**2. [Rule 1 - Bug] Fixed react-player import path: lazy subpath does not exist in v3**
- **Found during:** Task 2 (Video.tsx creation)
- **Issue:** `import ReactPlayer from 'react-player/lazy'` caused TS2307 — module not found; react-player v3.4.0 has no lazy subpath
- **Fix:** Changed import to `import ReactPlayer from 'react-player'`
- **Files modified:** src/components/lesson/Video.tsx
- **Verification:** TypeScript compiles without error
- **Committed in:** b16ac1c (Task 2 commit)

**3. [Rule 1 - Bug] Fixed react-player v3 prop API: url -> src**
- **Found during:** Task 2 (Video.tsx type checking)
- **Issue:** react-player v3 uses VideoElementProps (HTML video attributes) — `url` prop does not exist; `src` is the correct prop in v3
- **Fix:** Changed `url={url}` to `src={url}` and `playsinline` to `playsInline` (camelCase for React)
- **Files modified:** src/components/lesson/Video.tsx
- **Verification:** TypeScript compiles without error; ReactPlayerProps confirmed in node_modules/react-player/dist/types.d.ts
- **Committed in:** b16ac1c (Task 2 commit)

**4. [Rule 3 - Blocking] Installed @types/mdx for MDXComponents type**
- **Found during:** Task 2 (mdx-components.ts creation)
- **Issue:** `import type { MDXComponents } from 'mdx/types'` failed with TS2307 — mdx module not installed
- **Fix:** Ran `pnpm add -D @types/mdx`
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** TypeScript compiles without error
- **Committed in:** b16ac1c (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (2 blocking, 2 bugs)
**Impact on plan:** All auto-fixes necessary for type safety and correct package versions. react-player v3 API change is the only behavioral change — click-to-play light mode still works via `light={true}` prop which exists in ReactPlayerProps. No scope creep.

## Issues Encountered

- react-player v3 is a major breaking change from v2 — the research referenced v2 API (`url` prop, `react-player/lazy` subpath). v3 wraps native HTML video elements and custom video web components (youtube-video-element, vimeo-video-element) instead of React-level abstractions. The `light={true}` click-to-play behavior is preserved via `PreviewProps`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 8 MDX components are built and type-checked, ready for Plan 03-02 (lesson page integration)
- Plan 03-02 will use MDXRemote from next-mdx-remote-client/rsc with mdxComponents from src/lib/mdx-components.ts
- Plan 03-02 needs to wrap MDX content with DeepDiveProvider and DefinitionProvider
- Plan 03-02 will apply prose className to the article wrapper (not done here per plan spec)
- rehype-pretty-code plugin wiring (Pitfall 7 from research) is Plan 03-02 responsibility

---
*Phase: 03-lesson-content-pipeline*
*Completed: 2026-02-28*
