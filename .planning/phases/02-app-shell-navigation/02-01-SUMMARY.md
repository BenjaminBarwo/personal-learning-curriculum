---
phase: 02-app-shell-navigation
plan: 01
subsystem: ui
tags: [next-themes, tailwind-v4, dark-mode, react, components, breadcrumbs, navigation]

# Dependency graph
requires:
  - phase: 01-infrastructure
    provides: Root layout with ClerkProvider, Tailwind v4 CSS baseline, TypeScript setup

provides:
  - Tailwind v4 @custom-variant dark with 7 pillar color tokens and dark-first surface palette
  - ThemeProvider wrapping next-themes with dark default, class-based switching
  - Root layout with suppressHydrationWarning, ThemeProvider, Header, and responsive main wrapper
  - ThemeToggle with mounted guard, sun/moon SVG icons, 44px touch targets
  - Header (server component) with sticky positioning, logo, breadcrumb slot, theme toggle, mobile menu
  - Breadcrumbs (client) accepting BreadcrumbItem[] with mobile truncation and accentColor support
  - MobileMenu (client) with hamburger toggle, outside-click close, route-change close
  - ProgressBar with pillar color fill, aria progressbar role, sm/md size variants
  - PillarCard with accent bar, name, description, lesson count, progress as clickable Link
  - LoadingSkeleton exporting CardSkeleton, ListSkeleton, PageSkeleton with animate-pulse
  - navigation.ts with BreadcrumbItem interface and buildBreadcrumbs helper

affects:
  - 02-dashboard-pages
  - 02-pillar-pages
  - 03-content
  - 04-quiz
  - 05-progress

# Tech tracking
tech-stack:
  added:
    - next-themes@0.4.6
  patterns:
    - Tailwind v4 @custom-variant dark (class-based, not media query)
    - Dark-first CSS custom properties with .light override class
    - Mounted guard pattern for client-only theme hooks (prevents SSR hydration mismatch)
    - Server component Header with client sub-components (ThemeToggle, MobileMenu)
    - BreadcrumbItem[] passed as props from pages (not computed inside Breadcrumbs)

key-files:
  created:
    - src/lib/navigation.ts
    - src/lib/theme-provider.tsx
    - src/components/layout/ThemeToggle.tsx
    - src/components/layout/Header.tsx
    - src/components/layout/Breadcrumbs.tsx
    - src/components/layout/MobileMenu.tsx
    - src/components/ui/ProgressBar.tsx
    - src/components/ui/PillarCard.tsx
    - src/components/ui/LoadingSkeleton.tsx
  modified:
    - src/app/globals.css
    - src/app/layout.tsx
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Tailwind v4 uses @custom-variant dark not tailwind.config.js — class-based dark mode via next-themes attribute=class"
  - "Dark-first design: @theme block sets dark palette as default; .light class overrides to light palette — no dark: prefix needed on surface classes"
  - "ThemeProvider placed inside body (not wrapping html) to avoid hydration issues with ClerkProvider"
  - "Header is a server component; only ThemeToggle and MobileMenu are client components — minimizes client JS"
  - "Breadcrumbs receives pre-computed BreadcrumbItem[] from parent pages — component is presentational only"
  - "MobileMenu Phase 2 scope: Dashboard link only — full nav via breadcrumbs per design decision"

patterns-established:
  - "Surface palette pattern: use bg-surface-primary, bg-surface-card etc. for all backgrounds — never hardcode colors"
  - "Pillar colors: pass hex string as prop from DB data; use inline style for dynamic colors, Tailwind token for static"
  - "Mounted guard: 'use client' components reading useTheme must gate render on mounted state to prevent hydration mismatch"
  - "ProgressBar receives percent + color as props — caller owns the color (pillar hex)"
  - "PillarCard is the standard card unit for pillar-level content — all pillar grids use this component"

requirements-completed: [DESG-01, DESG-02, NAV-03]

# Metrics
duration: 12min
completed: 2026-02-27
---

# Phase 2 Plan 01: App Shell Navigation Summary

**Tailwind v4 dark-first theme system with class-based switching, sticky header with breadcrumb navigation, and full UI component library (PillarCard, ProgressBar, LoadingSkeleton) using next-themes 0.4.6**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-27T22:27:55Z
- **Completed:** 2026-02-27T22:39:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Dark-first Tailwind v4 theme with 7 pillar color tokens, surface palette, and @custom-variant dark — no media queries, no dark: prefixes needed on surfaces
- Full app shell: sticky header with logo, responsive breadcrumb navigation, sun/moon theme toggle, and hamburger mobile menu — all with proper aria attributes and 44px touch targets
- Complete UI component library ready for page composition: PillarCard with accent bar and progress, ProgressBar with pillar color fill, and three LoadingSkeleton variants

## Task Commits

Each task was committed atomically:

1. **Task 1: Dark mode theme system and root layout** - `1f30052` (feat)
2. **Task 2: Header, Breadcrumbs, and reusable UI components** - `2883ad8` (feat)

**Plan metadata:** `071d05a` (docs: complete plan)

## Files Created/Modified

- `src/app/globals.css` - Replaced with Tailwind v4 @custom-variant dark, pillar color tokens, dark-first surface palette with .light overrides
- `src/app/layout.tsx` - Added suppressHydrationWarning, ThemeProvider, Header, responsive main wrapper
- `src/lib/theme-provider.tsx` - next-themes ThemeProvider with dark default, class attribute, system disabled
- `src/components/layout/ThemeToggle.tsx` - Sun/moon toggle with mounted guard, aria-label, 44px touch target
- `src/components/layout/Header.tsx` - Sticky server component header with logo, breadcrumb slot, theme toggle, mobile row
- `src/components/layout/Breadcrumbs.tsx` - Client breadcrumb nav with BreadcrumbItem[] props, mobile truncation, accentColor
- `src/components/layout/MobileMenu.tsx` - Hamburger menu with outside-click close, route-change close, Dashboard link
- `src/components/ui/ProgressBar.tsx` - Horizontal fill with pillar color, percentage label, progressbar role, sm/md size
- `src/components/ui/PillarCard.tsx` - Accent bar card with name, description, lesson count, progress bar as Link
- `src/components/ui/LoadingSkeleton.tsx` - CardSkeleton, ListSkeleton, PageSkeleton with animate-pulse
- `src/lib/navigation.ts` - BreadcrumbItem interface and buildBreadcrumbs helper for full 4-level hierarchy

## Decisions Made

- Tailwind v4 @custom-variant dark uses class strategy not media queries — integrates with next-themes attribute="class"
- ThemeProvider wraps inside body rather than outside html to play nicely with ClerkProvider wrapping html
- Header is a server component with client sub-components ThemeToggle and MobileMenu — keeps client JS minimal
- Breadcrumbs receives pre-computed items from parent pages, not a usePathname-based auto-detector — gives pages full control over labels resolved from DB slugs
- MobileMenu limited to Dashboard link in Phase 2 — full navigation happens via breadcrumbs per design decision

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created Header stub in Task 1 to unblock layout.tsx**
- **Found during:** Task 1 (Root layout update)
- **Issue:** layout.tsx imports Header but Header was planned for Task 2 — would cause a build failure
- **Fix:** Created minimal Header stub in Task 1 with same exports; replaced with full implementation in Task 2
- **Files modified:** src/components/layout/Header.tsx
- **Verification:** pnpm build passed after Task 1 and again after Task 2
- **Committed in:** 1f30052 (stub in Task 1), 2883ad8 (full implementation in Task 2)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to keep builds passing between tasks. No scope creep. Full Header implemented in Task 2 exactly as specified.

## Issues Encountered

None — both tasks executed cleanly. Build succeeded with zero errors after each task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- App shell complete — all pages in Phase 2 will inherit themed header with breadcrumb navigation automatically
- BreadcrumbItem[] props pattern established — page components pass resolved names, Header renders them
- PillarCard, ProgressBar, and LoadingSkeleton ready for use in dashboard and pillar pages
- Theme system operational — dark default, toggle working, no hydration mismatch

---
*Phase: 02-app-shell-navigation*
*Completed: 2026-02-27*
