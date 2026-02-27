---
phase: 02-app-shell-navigation
plan: 02
subsystem: pages
tags: [next-js, supabase, breadcrumbs, context, server-components, dark-mode, navigation]

# Dependency graph
requires:
  - phase: 02-01
    provides: Header, BreadcrumbItem[], buildBreadcrumbs, PillarCard, ProgressBar, LoadingSkeleton, createServerSupabaseClient

provides:
  - BreadcrumbContext with BreadcrumbProvider, useBreadcrumbs, BreadcrumbSetter for context-based breadcrumb wiring
  - BreadcrumbsConnected client component reading from context for Header
  - Dashboard page with pillar grid, Start learning CTA, empty state
  - Pillar detail page with semester list and pillar color accent
  - Semester detail page with course list and progress bars
  - Course detail page with lesson list, reading time, status icons
  - Lesson stub page with learning objectives and MDX placeholder
  - Custom 404 not-found page matching dark/light theme
  - Error boundary page with retry button and Dashboard fallback
  - Root loading page using PageSkeleton

affects:
  - 03-content
  - 04-quiz
  - 05-progress

# Tech tracking
tech-stack:
  added: []
  patterns:
    - BreadcrumbContext pattern: server pages push breadcrumb state via BreadcrumbSetter (use client), Header reads via useBreadcrumbs
    - await params pattern: all dynamic server components use Promise<params> and await before accessing slugs (Next.js 15/16)
    - Active view queries: all data fetched from active_* views (soft-delete filtered), never raw tables
    - notFound() guard: slug lookup failures immediately call notFound() from next/navigation
    - CSS variable threading: --pillar-color set on page root main element for accent color inheritance
    - Type cast pattern: supabase view queries return {}[] inference — cast with as ActiveX[] after null coalescing

key-files:
  created:
    - src/lib/breadcrumb-context.tsx
    - src/components/layout/BreadcrumbsConnected.tsx
    - src/app/page.tsx
    - src/app/not-found.tsx
    - src/app/error.tsx
    - src/app/loading.tsx
    - src/app/pillars/[pillarSlug]/page.tsx
    - src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/page.tsx
    - src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/courses/[courseSlug]/page.tsx
    - src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/courses/[courseSlug]/lessons/[lessonSlug]/page.tsx
  modified:
    - src/app/layout.tsx
    - src/components/layout/Header.tsx

key-decisions:
  - "BreadcrumbContext chosen over per-page Header approach: single Header in root layout reads breadcrumbs from context; pages push state via BreadcrumbSetter client component"
  - "Supabase view queries return {}[] inference in TypeScript — cast with (data ?? []) as ActiveX[] rather than explicit generic type annotation"
  - "await params used on all dynamic routes (Next.js 15/16 breaking change) — params is Promise<{...slugs}>"
  - "Sequential pillar-then-semester-then-course fetching chosen for correctness (each query validates parent ownership)"

requirements-completed: [NAV-01, NAV-02, NAV-03, DESG-01, DESG-02]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 2 Plan 02: Hierarchy Pages Summary

**Five hierarchy pages (Dashboard, Pillar, Semester, Course, Lesson) with real Supabase data fetching via BreadcrumbContext wiring, pillar color accent threading, and consistent dark/light theming across all levels**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T22:33:56Z
- **Completed:** 2026-02-27T22:37:00Z
- **Tasks:** 2 of 3 automated (1 pending human verification)
- **Files modified:** 12

## Accomplishments

- BreadcrumbContext pattern: BreadcrumbProvider in root layout, BreadcrumbSetter in each page, BreadcrumbsConnected in Header — no prop-drilling through layout, clean server/client boundary
- Five fully-navigable hierarchy pages from Dashboard to Lesson stub, all fetching real Supabase data from active_* views with notFound() guards and error boundaries
- Pillar color accent threads from database hex value through CSS variable --pillar-color to left borders, progress fills, and accent indicators on all sub-pages

## Task Commits

Each task was committed atomically:

1. **Task 1: Dashboard page with BreadcrumbContext wiring and utility pages** - `5faae90` (feat)
2. **Task 2: Pillar, Semester, Course, and Lesson hierarchy pages** - `eea721d` (feat)

**Task 3 (checkpoint:human-verify):** Pending user visual verification

## Files Created/Modified

- `src/lib/breadcrumb-context.tsx` - BreadcrumbProvider, useBreadcrumbs, BreadcrumbSetter using React Context + useEffect
- `src/components/layout/BreadcrumbsConnected.tsx` - Client component bridging context to Breadcrumbs presentational component
- `src/components/layout/Header.tsx` - Updated to use BreadcrumbsConnected (no props, reads context)
- `src/app/layout.tsx` - Added BreadcrumbProvider wrapping inside ThemeProvider
- `src/app/page.tsx` - Dashboard: fetches active_pillars, Start learning CTA with first pillar accent, responsive 3/2/1 grid
- `src/app/not-found.tsx` - Themed 404 with back-to-dashboard link
- `src/app/error.tsx` - Error boundary with console.error, retry button, dashboard fallback (use client)
- `src/app/loading.tsx` - Root loading using PageSkeleton
- `src/app/pillars/[pillarSlug]/page.tsx` - Pillar page with semester list, display_order badges, pillar color accent
- `src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/page.tsx` - Semester page with course list and per-course progress bars
- `src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/courses/[courseSlug]/page.tsx` - Course page with lesson list, estimated reading time, not-started status icons
- `src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/courses/[courseSlug]/lessons/[lessonSlug]/page.tsx` - Lesson stub with learning objectives and MDX content placeholder

## Decisions Made

- BreadcrumbContext over per-page Header: keeps single Header in root layout; pages own breadcrumb data which resolves from DB slugs; useEffect prevents SSR hydration mismatch
- Type cast pattern for Supabase views: the TypeScript inference for view queries resolves to {}[] rather than the full row type — use `(data ?? []) as ActiveX[]` to satisfy strict mode
- Sequential fetching for nested hierarchy pages: pillar > semester > course chain validates parent ownership at each level
- CSS variable `--pillar-color` on main element: single assignment point that child elements can inherit or reference for consistent accent threading

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Supabase view query TypeScript type inference returns `{}[]`**
- **Found during:** Task 1 (Dashboard type error on build)
- **Issue:** `supabase.from('active_pillars').select('*')` returns `data: {}[] | null` rather than `ActivePillar[] | null` for views — TypeScript strict mode rejects the `ActivePillar[]` assignment
- **Fix:** Changed assignment to `(pillarsData ?? []) as ActivePillar[]` — explicit cast after null coalescing. Applied same pattern to all 4 hierarchy pages.
- **Files modified:** src/app/page.tsx, src/app/pillars/[pillarSlug]/page.tsx (and sub-pages)
- **Commit:** 5faae90

---

**Total deviations:** 1 auto-fixed (1 type error)
**Impact on plan:** Necessary for TypeScript strict mode compliance. Same pattern applied consistently across all pages. No behavioral change.

## Issues Encountered

None beyond the Supabase type inference deviation above. Both builds passed cleanly after the fix.

## User Setup Required

Supabase database must have at least one seeded pillar for navigation verification to be meaningful. Empty database will show empty states — which are also correct to verify.

## Next Phase Readiness

- Full hierarchy navigable from `/` to `/pillars/[p]/semesters/[s]/courses/[c]/lessons/[l]`
- Breadcrumb wiring pattern established — pages control labels, context propagates to Header
- Pillar color accent pattern established for Phase 3 lesson content areas
- Lesson stub page ready for Phase 3 MDX content rendering (replace the dashed placeholder section)
- Progress bars showing 0% mock — Phase 5 will replace with real aggregated counts

---
*Phase: 02-app-shell-navigation*
*Completed: 2026-02-27*
