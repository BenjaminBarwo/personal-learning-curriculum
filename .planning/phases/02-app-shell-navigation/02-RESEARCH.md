# Phase 2: App Shell + Navigation - Research

**Researched:** 2026-02-27
**Domain:** Next.js App Router nested routing, Tailwind v4 dark mode, Supabase server component data fetching
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dashboard & pillar cards**
- Card grid layout: 3 columns desktop, 2 tablet, 1 mobile
- Rich cards showing: pillar name, short description, color accent, progress indicator, lesson count
- Color accent bar (left or top border) in pillar color; rest of card is neutral
- Cards link to pillar detail pages

**Navigation pattern**
- Top header only — no sidebar
- Each hierarchy level is its own page (nested pages pattern):
  - Dashboard → Pillar page → Semester page → Course page → Lesson page
- Full breadcrumb trail always visible in header (Dashboard › Pillar › Semester › Course › Lesson)
- Every breadcrumb segment is clickable
- Breadcrumbs are the only back-navigation mechanism — no separate back button

**Color & theming**
- Dark mode is primary; dark gray backgrounds (not true black) — softer on eyes for long study sessions
- Light mode supported via toggle
- Sun/moon toggle icon in top-right corner of header
- 7 pillar colors:
  - AI & Agentic Engineering: Electric Blue #3B82F6
  - Technical Systems: Emerald #10B981
  - Robotics: Amber #F59E0B
  - Business: Purple #8B5CF6
  - Human Behavior: Rose #F43F5E
  - Systems Thinking: Cyan #06B6D4
  - Communication: Slate #64748B
- Accent threading: pillar color appears throughout its pages (breadcrumb highlights, section headers, progress bar fill)
- Warm pillar colors (Rose, Amber) restricted to navigation and headers — lesson content areas lean into blue/green tones regardless of pillar

**Completion indicators**
- Progress bars (horizontal fill) at pillar and course levels
- Bar shows percentage text (e.g., "75%")
- This phase builds the visual indicator components with placeholder/mock data (actual tracking is Phase 5)

### Claude's Discretion
- Dashboard empty state approach (all cards at 0% vs guided start highlighting Pillar 1)
- Individual lesson completion status style in course lists (icon indicators vs badges)
- Progress bar color strategy (pillar accent color vs consistent color)
- Loading skeleton design
- Exact spacing, typography, and responsive breakpoints
- Error state handling
- Mobile touch target sizing

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | User can view dashboard with pillar overview and "continue where you left off" | Supabase server component fetching of pillars table; mock progress data until Phase 5 |
| NAV-02 | User can navigate Pillar → Semester → Course → Lesson hierarchy | Next.js App Router nested dynamic segments `[pillarSlug]`, `[semesterSlug]`, `[courseSlug]`, `[lessonSlug]` |
| NAV-03 | User can see breadcrumb trail showing current location in hierarchy | Client component using `usePathname` + slug-to-name resolution; or parallel routes catch-all |
| DESG-01 | Dark mode as primary display mode, light mode supported | `next-themes` 0.4.6 + Tailwind v4 `@custom-variant dark` in globals.css |
| DESG-02 | Mobile-responsive layout across all pages | Tailwind v4 responsive breakpoints; hamburger menu for mobile header |
</phase_requirements>

---

## Summary

This phase builds the complete app shell — routing, header, breadcrumbs, theming, and navigation pages — using Next.js 16 App Router with Tailwind CSS v4. The stack is already established from Phase 1 (Next.js 16, React 19.2, Tailwind v4, Supabase, Clerk). No new major libraries are required except `next-themes` for dark/light mode toggling without flash.

The key architectural challenge is the 4-level hierarchy (Pillar → Semester → Course → Lesson), each needing its own dynamic route segment and its own page component that fetches data from Supabase via server components. Breadcrumbs require a client component using `usePathname` that maps slug segments to human-readable labels fetched at page level and threaded down via props or layout params.

The Tailwind v4 dark mode approach has changed from v3: there is no `tailwind.config.js`. Dark mode is configured via `@custom-variant` in `globals.css`, and `next-themes` 0.4.6 confirms React 19 support in its peer dependencies. Pillar color accents are best handled via inline `style` props for dynamic hex values rather than Tailwind utilities, since the 7 colors are data-driven from the database.

**Primary recommendation:** Use Next.js App Router nested dynamic segments with server-component data fetching at each level, `next-themes` 0.4.6 for theme management, `usePathname` client component for breadcrumbs, and inline `style` props for pillar color accents.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 (already installed) | App Router, nested layouts, dynamic segments | Already in project |
| React | 19.2.3 (already installed) | UI layer | Already in project |
| Tailwind CSS | v4 (already installed) | Styling, responsive breakpoints, dark mode | Already in project |
| next-themes | 0.4.6 | Dark/light mode toggle without hydration flash | De facto standard for Next.js theming; confirmed React 19 peer support |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | ^2.98.0 (already installed) | Fetch pillars/semesters/courses data | Server component data fetching |
| @clerk/nextjs | ^6.39.0 (already installed) | Auth context for Supabase client | Already used in project |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next-themes | Manual localStorage + script | next-themes handles all edge cases (SSR flash, cross-tab sync, system pref); no reason to hand-roll |
| Inline style for pillar colors | Tailwind arbitrary values `bg-[#3B82F6]` | Arbitrary values work but inline style is cleaner when the hex comes from a DB field |
| `usePathname` breadcrumb client component | Parallel routes `@breadcrumbs` slot | Parallel routes add structural complexity; `usePathname` in a thin client wrapper is simpler for this hierarchy |

**Installation:**
```bash
pnpm add next-themes
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── layout.tsx                        # Root layout: ClerkProvider + ThemeProvider
│   ├── globals.css                        # @custom-variant dark + @theme pillar colors
│   ├── page.tsx                           # Dashboard (/)
│   ├── pillars/
│   │   └── [pillarSlug]/
│   │       ├── page.tsx                   # Pillar detail page
│   │       ├── semesters/
│   │       │   └── [semesterSlug]/
│   │       │       ├── page.tsx           # Semester detail page
│   │       │       └── courses/
│   │       │           └── [courseSlug]/
│   │       │               ├── page.tsx   # Course detail page
│   │       │               └── lessons/
│   │       │                   └── [lessonSlug]/
│   │       │                       └── page.tsx  # Lesson page (stub — content Phase 3)
├── components/
│   ├── layout/
│   │   ├── Header.tsx                     # Top header with logo + breadcrumb + theme toggle
│   │   ├── Breadcrumbs.tsx                # 'use client' — usePathname + label resolution
│   │   └── ThemeToggle.tsx                # 'use client' — sun/moon button using useTheme
│   ├── ui/
│   │   ├── PillarCard.tsx                 # Dashboard card with accent bar + progress
│   │   ├── ProgressBar.tsx                # Horizontal fill bar with % text
│   │   └── LoadingSkeleton.tsx            # Card/list skeletons
├── lib/
│   ├── supabase/
│   │   ├── server.ts                      # Already exists: createServerSupabaseClient
│   │   └── client.ts                      # Already exists: createClerkSupabaseClient
│   └── navigation.ts                      # Breadcrumb label map + slug-to-name helpers
└── types/
    └── database.types.ts                  # Already exists
```

### Pattern 1: Dark Mode Setup (Tailwind v4 + next-themes)

**What:** Configure `@custom-variant dark` in globals.css, wrap app in `ThemeProvider`, add `suppressHydrationWarning` to `<html>`.

**When to use:** Required — this is the only no-flash approach for Next.js App Router.

**Example:**
```css
/* src/app/globals.css */
@import "tailwindcss";

/* Tailwind v4: dark mode via class, NOT tailwind.config.js (removed in v4) */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Pillar color tokens — generates bg-pillar-blue, text-pillar-blue, etc. */
  --color-pillar-blue: #3B82F6;
  --color-pillar-emerald: #10B981;
  --color-pillar-amber: #F59E0B;
  --color-pillar-purple: #8B5CF6;
  --color-pillar-rose: #F43F5E;
  --color-pillar-cyan: #06B6D4;
  --color-pillar-slate: #64748B;

  /* Dark-first background palette */
  --color-surface-dark: #1a1a2e;
  --color-surface-card-dark: #16213e;
  --color-surface-light: #f8fafc;
  --color-surface-card-light: #ffffff;
}
```

```tsx
// src/lib/theme-provider.tsx
'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
```

```tsx
// src/app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from '@/lib/theme-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
```

### Pattern 2: Dynamic Nested Routes

**What:** Each hierarchy level maps to a `[slug]/page.tsx`. Each page fetches its own data via `createServerSupabaseClient()`.

**When to use:** For every level: pillar, semester, course, lesson.

**Example:**
```tsx
// src/app/pillars/[pillarSlug]/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ pillarSlug: string }>
}

export default async function PillarPage({ params }: PageProps) {
  // In Next.js 15+, params is a Promise
  const { pillarSlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: pillar } = await supabase
    .from('active_pillars')
    .select('*')
    .eq('slug', pillarSlug)
    .single()

  if (!pillar) notFound()

  const { data: semesters } = await supabase
    .from('active_semesters')
    .select('*')
    .eq('pillar_id', pillar.id)
    .order('display_order')

  return (
    <main>
      {/* pillar color accent via inline style — hex from DB */}
      <div style={{ borderColor: pillar.color ?? '#3B82F6' }}>
        {/* content */}
      </div>
    </main>
  )
}
```

**CRITICAL — Next.js 15/16 params change:** `params` is now a `Promise`. Must use `await params` or `use(params)`. This is a breaking change from Next.js 14.

### Pattern 3: Breadcrumb Component

**What:** Client component using `usePathname` that splits the path into segments and resolves labels.

**When to use:** Rendered in the shared Header component.

**Example:**
```tsx
// src/components/layout/Breadcrumbs.tsx
'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

interface BreadcrumbsProps {
  // Labels passed from server page components via layout slot or props
  pillarName?: string
  semesterName?: string
  courseName?: string
  lessonName?: string
}

export function Breadcrumbs({ pillarName, semesterName, courseName, lessonName }: BreadcrumbsProps) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  // Build crumbs: Dashboard is always first
  const crumbs = [{ label: 'Dashboard', href: '/' }]
  // Append levels based on path depth + provided labels
  if (segments[0] === 'pillars' && pillarName) {
    crumbs.push({ label: pillarName, href: `/${segments.slice(0, 2).join('/')}` })
  }
  // ... semester, course, lesson similarly

  return (
    <nav aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href}>
          {i < crumbs.length - 1 ? (
            <Link href={crumb.href}>{crumb.label}</Link>
          ) : (
            <span>{crumb.label}</span>
          )}
          {i < crumbs.length - 1 && <span aria-hidden> › </span>}
        </span>
      ))}
    </nav>
  )
}
```

**Alternative breadcrumb approach:** Pass breadcrumb data via searchParams or per-page layout. The planner should decide: prop-drilling through layouts is explicit but verbose; a React context in a client boundary is cleaner for deeper hierarchies.

### Pattern 4: Theme Toggle

**What:** Client component using `useTheme` hook. Must track mounted state to avoid hydration mismatch.

**Example:**
```tsx
// src/components/layout/ThemeToggle.tsx
'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Avoid rendering toggle until client-side mounted
  if (!mounted) return <div className="w-8 h-8" /> // placeholder for layout stability

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-2 rounded-md hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px]"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
```

### Pattern 5: Pillar Color Accent Threading

**What:** Pillar color from the database (a hex string) applied as inline style — cannot use Tailwind utilities for data-driven hex values at runtime.

**When to use:** Accent bars on cards, breadcrumb highlights, progress bar fills, section headers on pillar pages.

**Example:**
```tsx
// Accent bar on pillar card
<div
  className="w-1 self-stretch rounded-l-lg"
  style={{ backgroundColor: pillar.color ?? '#64748B' }}
/>

// Progress bar fill
<div
  className="h-2 rounded-full transition-all"
  style={{ width: `${progressPercent}%`, backgroundColor: pillarColor }}
/>
```

**CSS variable injection approach** (alternative for deeply nested components):
```tsx
// Inject pillar color as CSS variable at pillar page root
<main style={{ '--pillar-color': pillar.color } as React.CSSProperties}>
  {/* Children can use: style={{ color: 'var(--pillar-color)' }} */}
</main>
```

### Pattern 6: Progress Data (Mock for Phase 2)

**What:** Phase 5 owns actual progress tracking. This phase builds the visual components with mock/placeholder data.

**Example:**
```tsx
// Mock progress until Phase 5
const MOCK_PROGRESS: Record<string, number> = {}

function getPillarProgress(pillarId: string): number {
  return MOCK_PROGRESS[pillarId] ?? 0
}
```

Phase 5 will replace the mock with a real Supabase query aggregating `progress` table by pillar.

### Anti-Patterns to Avoid

- **Never use `auth.uid()` in Supabase queries** — returns NULL with Clerk JWTs. Use `createServerSupabaseClient()` which sets the `accessToken` from Clerk's `getToken()`. (Established in Phase 1.)
- **Never import `createAdminSupabaseClient` in `'use client'` files** — service role key leaks. Admin client is server-only.
- **Never skip `suppressHydrationWarning` on `<html>`** — next-themes modifies the html element server/client, causing hydration errors.
- **Never render `useTheme` output before mounted** — results in hydration mismatch. Always gate on `mounted` state.
- **Never use `await params` outside async server components** — `params` in Next.js 15/16 is a Promise only in server components; client components receive params differently.
- **Never hardcode pillar colors in Tailwind classes** — hex values come from the DB at runtime; use inline `style` props.
- **Never `use client`** the entire header — only the ThemeToggle and Breadcrumbs sub-components need client-side hooks. The header shell can be a server component.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme persistence without flash | Custom localStorage script + class toggle | `next-themes` 0.4.6 | Handles SSR flash, cross-tab sync, system pref detection, hydration timing |
| Dark mode Tailwind config | `tailwind.config.js` `darkMode: 'class'` | `@custom-variant dark` in `globals.css` | v4 removed `tailwind.config.js`; this IS the v4 way |
| Routing | Custom router or hash-based nav | Next.js App Router dynamic segments | Built in; zero-config |
| Mobile menu state | Custom event bus | `useState` + conditional Tailwind classes | Simple boolean is sufficient for a top-nav collapse |

**Key insight:** The main "don't hand-roll" risk in this phase is theming. The flash-of-incorrect-theme problem on SSR/SSG is genuinely hard to solve correctly; next-themes solves it with an inline script injected into `<head>`.

---

## Common Pitfalls

### Pitfall 1: Next.js 15/16 `params` is a Promise

**What goes wrong:** Writing `{ params }: { params: { pillarSlug: string } }` and accessing `params.pillarSlug` directly causes a type error or runtime error in Next.js 15+.

**Why it happens:** Next.js 15 changed `params` to return a Promise for dynamic segments. This is a breaking API change from v14.

**How to avoid:** Always type `params` as `Promise<{ slug: string }>` and `await params` at the top of the async server component.

**Warning signs:** TypeScript errors about `params.slug` not existing, or runtime "params should not be accessed directly" warnings.

```tsx
// WRONG (Next.js 14 pattern):
export default async function Page({ params }: { params: { pillarSlug: string } }) {
  const { pillarSlug } = params // breaks in Next.js 15+
}

// CORRECT:
export default async function Page({ params }: { params: Promise<{ pillarSlug: string }> }) {
  const { pillarSlug } = await params
}
```

### Pitfall 2: Hydration Mismatch from Theme Toggle

**What goes wrong:** The server renders with dark mode (defaultTheme="dark") but the browser sees a different stored theme — React throws hydration error, or worse, a flash of wrong theme.

**Why it happens:** Server has no access to localStorage; client reads it. If the component renders theme-dependent content before mounting, they diverge.

**How to avoid:**
1. Add `suppressHydrationWarning` to `<html>` — this is mandatory.
2. Gate any theme-dependent UI on `mounted` state in the ThemeToggle.
3. Use `disableTransitionOnChange` on ThemeProvider to prevent flash.

**Warning signs:** Console errors about "Extra attributes from the server," or visible flicker between dark/light on page load.

### Pitfall 3: Tailwind v4 Dark Mode Not Working

**What goes wrong:** `dark:bg-gray-900` classes have no effect even when `html` has class `dark`.

**Why it happens:** Tailwind v4 no longer reads `tailwind.config.js` for `darkMode: 'class'`. Without `@custom-variant dark` in CSS, the `dark:` prefix defaults to `prefers-color-scheme` media query (not the class).

**How to avoid:** Add to `globals.css` before any other styles:
```css
@custom-variant dark (&:where(.dark, .dark *));
```

**Warning signs:** Dark mode classes appear in compiled CSS but never activate when toggling the class.

### Pitfall 4: Pillar Color Not Applied to Child Components

**What goes wrong:** Deep components inside a pillar page need the pillar color but can't receive it through props without excessive drilling.

**Why it happens:** Pillar color is a DB value available only at the page (server) level.

**How to avoid:** Inject pillar color as a CSS variable at the page root via inline `style` prop. Children access it via `var(--pillar-color)` in their own inline styles or CSS.

**Warning signs:** Progress bars or breadcrumb highlights showing wrong/default color on pillar pages.

### Pitfall 5: `next-themes` peer dependency error with pnpm

**What goes wrong:** `pnpm add next-themes` fails with peer dependency warning about React version.

**Why it happens:** Older npm registry metadata may cache stale peer dep ranges for next-themes. Version 0.4.6 correctly declares `react: '^16.8 || ^17 || ^18 || ^19 || ^19.0.0-rc'` — but pnpm's strict peer resolution may still surface warnings.

**How to avoid:** Confirm version 0.4.6 is installed. If pnpm complains, add `--no-strict-peer-deps` flag or add an override in `package.json`.

**Warning signs:** Installation fails with "unmet peer dependency" errors referencing React 19.

### Pitfall 6: RLS blocking content reads

**What goes wrong:** `supabase.from('active_pillars').select('*')` returns empty array even though pillars exist in the database.

**Why it happens:** The Supabase RLS policies require a valid Clerk JWT. If `createServerSupabaseClient()` is called before Clerk's auth context is available (e.g., in a layout before ClerkProvider), `getToken()` returns null and the accessToken is missing.

**How to avoid:** Always use `createServerSupabaseClient()` (not `createClient` directly) for authenticated reads. Confirm with `SELECT current_setting('request.jwt.claims', true)::json->>'sub'` returning non-null. Content tables (pillars, semesters, courses, lessons) should have a SELECT policy allowing the authenticated user.

**Warning signs:** Empty data arrays with no error; Supabase returns empty silently when RLS blocks.

---

## Code Examples

Verified patterns from official sources and project context:

### Fetching all active pillars in a server component
```typescript
// Source: existing src/lib/supabase/server.ts pattern + Supabase JS docs
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const { data: pillars, error } = await supabase
    .from('active_pillars')  // view filters soft-deleted rows
    .select('id, name, slug, description, color, icon, display_order')
    .order('display_order')

  if (error) throw error // Next.js error boundary catches this

  return <PillarGrid pillars={pillars ?? []} />
}
```

### Fetching pillar + semesters in parallel
```typescript
const supabase = await createServerSupabaseClient()

const [{ data: pillar }, { data: semesters }] = await Promise.all([
  supabase.from('active_pillars').select('*').eq('slug', pillarSlug).single(),
  supabase.from('active_semesters').select('*').eq('pillar_id', pillarId).order('display_order'),
])
```

### Breadcrumb link construction
```typescript
// Source: Next.js docs on dynamic segments + usePathname
// Path: /pillars/ai-engineering/semesters/foundations/courses/intro/lessons/what-is-an-agent
// Segments: ['pillars', 'ai-engineering', 'semesters', 'foundations', 'courses', 'intro', 'lessons', 'what-is-an-agent']

function buildHref(segments: string[], index: number): string {
  return '/' + segments.slice(0, index + 1).join('/')
}
```

### Progress bar with pillar color
```tsx
interface ProgressBarProps {
  percent: number
  color: string // hex value from pillar.color
  label?: string
}

export function ProgressBar({ percent, color, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent))
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all duration-300"
        style={{ width: `${clamped}%`, backgroundColor: color }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      />
      {label && (
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{clamped}%</span>
      )}
    </div>
  )
}
```

### Mobile-responsive header skeleton
```tsx
// Header is a server component; ThemeToggle + mobile menu are client sub-components
export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-surface-dark dark:bg-surface-dark light:bg-surface-light border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <span className="font-bold text-lg">Learning</span>
          {/* Breadcrumbs — hidden on very small mobile, shown sm+ */}
          <div className="hidden sm:block">
            <Breadcrumbs />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* Mobile menu button — only visible below sm breakpoint */}
          <MobileMenuButton className="sm:hidden" />
        </div>
      </div>
      {/* Mobile breadcrumbs shown below header on xs */}
      <div className="sm:hidden px-4 pb-2">
        <Breadcrumbs />
      </div>
    </header>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` `darkMode: 'class'` | `@custom-variant dark` in CSS | Tailwind v4 (2025) | Config file no longer exists in v4 |
| `params: { slug: string }` in page props | `params: Promise<{ slug: string }>` | Next.js 15 | Must `await params` in server components |
| `createServerComponentClient` from `@supabase/auth-helpers-nextjs` | `createServerClient` from `@supabase/ssr` or direct `createClient` with `accessToken` | 2024 | Project already uses correct pattern (`server.ts`) |
| `authMiddleware` from Clerk | `clerkMiddleware` | Clerk v6 (2024) | Project already uses correct pattern |
| `@theme` colors defined as oklch | Can also use hex — both valid | Tailwind v4 | Hex is fine for the pillar colors |

**Deprecated/outdated:**
- `tailwind.config.js` for dark mode: does not exist in v4, do not create it
- `@supabase/auth-helpers-nextjs`: deprecated, project correctly uses direct client with `accessToken`
- `darkMode: 'class'` in Tailwind config key: replaced by `@custom-variant dark` CSS directive

---

## Open Questions

1. **Breadcrumb label source for deep pages**
   - What we know: `usePathname` gives slugs (e.g., `ai-engineering`), not display names (e.g., "AI & Agentic Engineering")
   - What's unclear: Best pattern to pass display names from server data to the client breadcrumb component without re-fetching
   - Recommendation: Pass `pillarName`, `semesterName`, `courseName`, `lessonName` as explicit props to the Header via a shared layout that fetches data server-side. Alternatively use Next.js `params` at each level and accept a minimal re-fetch. The planner should pick one approach for consistency.

2. **"Continue where you left off" (NAV-01)**
   - What we know: This requires progress data which Phase 5 owns. Phase 2 should show a placeholder or disable this feature
   - What's unclear: Should NAV-01 show a static "Start with Pillar 1" CTA instead of a real "continue" link?
   - Recommendation: Implement a static "Start learning" CTA for Phase 2. Phase 5 will wire up actual last-accessed lesson data.

3. **RLS policies on content tables**
   - What we know: Phase 1 schema created RLS on all tables. Content tables (pillars, semesters, courses, lessons) should be readable by authenticated users
   - What's unclear: Whether the Phase 1 RLS policy for SELECT on content tables requires user_id (it shouldn't, since content is global)
   - Recommendation: Verify with a test query that `active_pillars` returns data when authenticated. If empty, check the RLS SELECT policy — content tables should allow all authenticated users to SELECT, not filter by user_id.

---

## Sources

### Primary (HIGH confidence)
- Tailwind CSS official docs (tailwindcss.com/docs/dark-mode, tailwindcss.com/docs/theme) — `@custom-variant dark`, `@theme` directive
- Next.js official docs (nextjs.org/docs/app) — dynamic segments, route groups, params as Promise
- `npm view next-themes@0.4.6 peerDependencies` — confirmed React 19 (`^19`) in peer deps
- Existing project files — `server.ts`, `client.ts`, `database.types.ts`, `middleware.ts`, `layout.tsx`

### Secondary (MEDIUM confidence)
- [sujalvanjare.com — Dark Mode Next.js 15 + Tailwind v4](https://www.sujalvanjare.com/blog/dark-mode-nextjs15-tailwind-v4) — verified against Tailwind official docs
- [pacocoursey/next-themes GitHub README](https://github.com/pacocoursey/next-themes) — ThemeProvider setup verified
- [jeremykreutzbender.com — Dynamic Breadcrumbs App Router](https://jeremykreutzbender.com/blog/app-router-dynamic-breadcrumbs) — parallel routes breadcrumb pattern (considered, recommending simpler `usePathname` approach)

### Tertiary (LOW confidence)
- Multiple WebSearch results on mobile navigation patterns — standard patterns, no verification needed for simple hamburger menu state

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — next-themes 0.4.6 React 19 support confirmed via npm; all other libs already in project
- Architecture: HIGH — dynamic segment routing is documented Next.js 15/16 API; server component Supabase pattern established in Phase 1
- Dark mode: HIGH — Tailwind v4 `@custom-variant` verified from official docs; next-themes peer deps confirmed
- Pitfalls: HIGH for params/hydration (widely documented); MEDIUM for RLS (project-specific, needs live verification)
- Breadcrumb label pattern: MEDIUM — multiple valid approaches, recommend one but planner decides

**Research date:** 2026-02-27
**Valid until:** 2026-03-29 (Next.js and Tailwind stable; next-themes stable)
