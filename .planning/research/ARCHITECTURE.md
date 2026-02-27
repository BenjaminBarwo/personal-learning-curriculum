# Architecture Patterns

**Domain:** Personal learning curriculum platform (Next.js 14+ / Supabase / MDX / Clerk)
**Researched:** 2026-02-27
**Confidence:** HIGH (Next.js official docs, verified patterns)

---

## Recommended Architecture

The platform has three distinct rendering concerns that map cleanly to Next.js App Router primitives:

1. **Static shell** — navigation, layout, pillar chrome — server components, no data dependency
2. **Data-dependent pages** — dashboard, course lists, lesson metadata — server components with async data fetch
3. **Interactive lesson content** — quizzes, collapsible deep-dives, progress tracking — client components embedded inside server-rendered MDX output

The key insight for this platform: MDX content is fetched from Supabase and compiled server-side, but the interactive elements *inside* that content (Quiz, DeepDive toggles) are client components. next-mdx-remote handles this split — the RSC variant compiles MDX on the server and injects client component references via RSC payload.

---

## Component Boundaries

| Component | Layer | Responsibility | Communicates With |
|-----------|-------|----------------|-------------------|
| `middleware.ts` | Edge | Clerk auth gate, redirects unauthenticated requests | Clerk SDK, Next.js routing |
| `app/layout.tsx` | Server | Root HTML shell, Clerk provider, theme | ClerkProvider (client), ThemeProvider (client) |
| `app/(app)/layout.tsx` | Server | Authenticated app shell, sidebar nav, pillar color tokens | UserNav (client), SidebarNav (client) |
| `app/(app)/dashboard/page.tsx` | Server | Fetch all pillar progress for user, render overview | Supabase (server client), ProgressRings (client) |
| `app/(app)/pillars/[pillarId]/layout.tsx` | Server | Fetch pillar metadata, pass as context to children | Supabase (server client) |
| `app/(app)/pillars/[pillarId]/semesters/[semesterId]/courses/[courseId]/lessons/[lessonId]/page.tsx` | Server | Fetch lesson row + MDX string from Supabase, compile MDX, render | Supabase (server client), next-mdx-remote |
| `LessonRenderer` | Server | Wraps compiled MDX output with lesson layout | MDX component map |
| `<Quiz>` | Client | State machine for quiz attempts: idle → answering → submitted → complete | useActionState, Server Action (recordQuizScore) |
| `<DeepDive>` | Client | Controlled collapse/expand with animation | useState |
| `<Definition>` | Client | Hover/tap tooltip for domain terms | useState, Popover |
| `ProgressRings` | Client | SVG rings animated on mount, reads progress from props | — |
| `LessonProgressTracker` | Client | Fires "mark started" on mount, "mark complete" on CTA click | Server Action (markLessonProgress) |
| `lib/supabase/server.ts` | Server-only | Creates Supabase client scoped to request with Clerk user_id injected | @supabase/supabase-js, Clerk auth() |
| `lib/supabase/client.ts` | Client-only | Creates Supabase client for browser-side use (anon key) | @supabase/supabase-js |
| `lib/data/` | Server-only | Data access functions wrapped in `React.cache()` | Supabase server client |
| `app/actions/` | Server | Server Actions for mutations (progress, quiz scores) | Supabase server client, revalidatePath |

---

## Route Structure

```
app/
├── layout.tsx                              # Root layout: <html>, Clerk provider
├── (marketing)/                            # Route group: unauthenticated pages
│   ├── layout.tsx                          # Marketing shell (no sidebar)
│   └── page.tsx                            # Landing / sign-in redirect
├── (app)/                                  # Route group: authenticated app
│   ├── layout.tsx                          # App shell: sidebar, nav, auth check
│   ├── dashboard/
│   │   └── page.tsx                        # Pillar overview + "continue" card
│   └── pillars/
│       └── [pillarId]/
│           ├── layout.tsx                  # Pillar color context
│           ├── page.tsx                    # Semester list for pillar
│           └── semesters/
│               └── [semesterId]/
│                   ├── page.tsx            # Course list for semester
│                   └── courses/
│                       └── [courseId]/
│                           ├── page.tsx    # Lesson list for course
│                           └── lessons/
│                               └── [lessonId]/
│                                   ├── page.tsx       # Lesson renderer
│                                   └── loading.tsx    # Skeleton while MDX compiles
├── api/
│   └── webhooks/
│       └── clerk/
│           └── route.ts                    # Clerk webhook handler (user sync)
lib/
├── supabase/
│   ├── server.ts                           # Server Supabase client (server-only)
│   └── client.ts                           # Browser Supabase client (client-only)
├── data/
│   ├── pillars.ts                          # getPillars(), getPillarById()
│   ├── semesters.ts                        # getSemestersByPillar()
│   ├── courses.ts                          # getCoursesBySemester()
│   ├── lessons.ts                          # getLessonById(), getLessonsByCourse()
│   └── progress.ts                         # getUserProgress(), getLessonProgress()
├── mdx/
│   └── components.tsx                      # Custom MDX component map
└── actions/
    ├── progress.ts                         # markLessonStarted(), markLessonComplete()
    └── quiz.ts                             # recordQuizAttempt()
components/
├── lesson/
│   ├── LessonRenderer.tsx                  # Server: wraps MDX output
│   ├── Quiz.tsx                            # Client: interactive quiz state machine
│   ├── DeepDive.tsx                        # Client: collapsible section
│   ├── Definition.tsx                      # Client: hover tooltip
│   ├── Hook.tsx                            # Server: styled wrapper (no interactivity)
│   ├── ConceptBlock.tsx                    # Server: styled wrapper
│   ├── Exercise.tsx                        # Server: styled wrapper
│   └── Takeaways.tsx                       # Server: styled list
├── navigation/
│   ├── Sidebar.tsx                         # Client: usePathname for active state
│   ├── Breadcrumbs.tsx                     # Client: usePathname
│   └── PillarNav.tsx                       # Client: pillar color tokens
├── dashboard/
│   ├── ProgressRings.tsx                   # Client: SVG animation
│   ├── ContinueCard.tsx                    # Server: last visited lesson
│   └── PillarCard.tsx                      # Server: pillar summary
└── ui/                                     # Shared primitives: Button, Badge, etc.
```

---

## Data Flow

### Lesson Page — Primary Flow

```
User navigates to /pillars/[pillarId]/semesters/[semId]/courses/[courseId]/lessons/[lessonId]

  1. middleware.ts
     - Clerk validates session token
     - Extracts userId, attaches to request headers
     - Redirects to /sign-in if unauthenticated

  2. app/(app)/pillars/[pillarId]/layout.tsx (Server Component)
     - Calls getPillarById(pillarId) via lib/data/pillars.ts
     - Passes pillar.color_token down as CSS custom property via <style>

  3. app/(app)/[...]/lessons/[lessonId]/page.tsx (Server Component)
     - Calls getLessonById(lessonId) → returns { title, mdx_content, estimated_minutes, ... }
     - Calls getUserLessonProgress(userId, lessonId) → returns { started_at, completed_at }
     - Passes both to <LessonRenderer>

  4. LessonRenderer (Server Component)
     - Calls next-mdx-remote/rsc: compileMDX({ source: lesson.mdx_content, components: mdxComponents })
     - Returns rendered React tree with client component islands

  5. RSC Payload sent to client
     - Static HTML shells (Hook, ConceptBlock, Takeaways) included in HTML
     - <Quiz>, <DeepDive>, <Definition> hydrated as client component islands

  6. LessonProgressTracker (Client Component)
     - useEffect on mount → calls Server Action markLessonStarted(lessonId)
     - "Mark Complete" button → calls Server Action markLessonComplete(lessonId)
     - Server Action calls revalidatePath('/dashboard') to update progress rings
```

### Quiz Submission Flow

```
User selects answer and submits in <Quiz> (Client Component)

  1. Client: useActionState(recordQuizAttempt, initialState)
  2. On submit: calls Server Action recordQuizAttempt({ lessonId, questionId, answer })
  3. Server Action:
     - Reads userId from auth() (Clerk)
     - Inserts into quiz_attempts table via Supabase server client
     - Returns { correct: boolean, explanation: string }
  4. useActionState receives return value → client updates UI with feedback
  5. No revalidation needed (quiz state is local; progress table updated separately)
```

### Dashboard Data Flow

```
User navigates to /dashboard

  1. dashboard/page.tsx (Server Component, async)
     - Calls getUserPillarProgress(userId) — single query with aggregation
     - Calls getLastVisitedLesson(userId) — for "continue" card
     - Renders <ProgressRings data={progress}> (Client: animation)
     - Renders <ContinueCard lesson={lastLesson}> (Server)
     - Renders <PillarCard pillar={p}> for each pillar (Server)
```

---

## Supabase Access Patterns

### Server Client (for Server Components and Server Actions)

Clerk is the auth provider; Supabase uses JWT verification or a service role key with RLS bypass for trusted server-side mutations.

**Pattern A — RLS with Clerk JWT (recommended for reads):**
```typescript
// lib/supabase/server.ts
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

export async function createServerSupabaseClient() {
  const { getToken } = await auth()
  // Clerk can issue a Supabase-compatible JWT if configured
  // OR use service role with manual user_id filtering
  const token = await getToken({ template: 'supabase' })

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    }
  )
}
```

**Pattern B — Service role + explicit user_id filter (simpler for single user now):**
```typescript
// lib/supabase/server.ts
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // never expose to client
  )
}

// In data access functions:
export const getUserProgress = cache(async (userId: string, lessonId: string) => {
  const supabase = createServerSupabaseClient()
  return supabase
    .from('user_lesson_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .single()
})
```

**IMPORTANT:** Pattern A scales to multi-user with RLS. Pattern B requires explicit `user_id` filtering at every query call. Use Pattern A from the start to avoid security rewrites.

### React.cache for Deduplication

```typescript
// lib/data/lessons.ts
import { cache } from 'react'

export const getLessonById = cache(async (lessonId: string) => {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('lessons')
    .select('id, title, mdx_content, estimated_minutes, content_version')
    .eq('id', lessonId)
    .single()
  return data
})
// Multiple Server Components calling getLessonById with same ID
// within the same request → single database query (React.cache memoizes)
```

---

## MDX Rendering Pipeline

### The Critical Constraint

`@next/mdx` (filesystem) vs `next-mdx-remote` (from string/database): This project stores MDX in Supabase, so `@next/mdx` is irrelevant. Use `next-mdx-remote/rsc` which compiles MDX as a Server Component.

### Pipeline

```
Supabase: lessons.mdx_content (TEXT column)
    ↓
Server Component: getLessonById(id) → raw MDX string
    ↓
next-mdx-remote/rsc: compileMDX({ source, components, options })
    ↓
React tree: Server component shells + Client component references
    ↓
RSC Payload → Browser → Hydration of interactive islands
```

### MDX Component Map Pattern

```typescript
// lib/mdx/components.tsx
// Server components — no 'use client' directive
import { Hook } from '@/components/lesson/Hook'
import { ConceptBlock } from '@/components/lesson/ConceptBlock'
import { Exercise } from '@/components/lesson/Exercise'
import { Takeaways } from '@/components/lesson/Takeaways'

// Client components — marked 'use client' in their own file
import { Quiz } from '@/components/lesson/Quiz'
import { DeepDive } from '@/components/lesson/DeepDive'
import { Definition } from '@/components/lesson/Definition'

export const mdxComponents = {
  Hook,
  ConceptBlock,
  Exercise,
  Takeaways,
  Quiz,       // Client island — state for quiz attempt
  DeepDive,   // Client island — collapse/expand state
  Definition, // Client island — tooltip state
}
```

### Lesson Page Implementation

```typescript
// app/(app)/.../lessons/[lessonId]/page.tsx
import { compileMDX } from 'next-mdx-remote/rsc'
import { getLessonById } from '@/lib/data/lessons'
import { mdxComponents } from '@/lib/mdx/components'
import { auth } from '@clerk/nextjs/server'

export default async function LessonPage({ params }: PageProps<'/.../.../lessons/[lessonId]'>) {
  const { userId } = await auth()
  const { lessonId } = await params

  const lesson = await getLessonById(lessonId)

  const { content } = await compileMDX({
    source: lesson.mdx_content,
    components: mdxComponents,
    options: {
      mdxOptions: {
        remarkPlugins: [],
        rehypePlugins: [],
      }
    }
  })

  return (
    <article className="lesson-content">
      <LessonHeader lesson={lesson} />
      <div className="prose dark:prose-invert">
        {content}
      </div>
      <LessonProgressTracker lessonId={lessonId} userId={userId} />
    </article>
  )
}
```

---

## Server vs Client Component Decision Matrix

| Component | Server or Client | Reason |
|-----------|-----------------|--------|
| `page.tsx` (lesson) | Server | Fetches MDX from DB, no browser APIs |
| `layout.tsx` (all) | Server | Static chrome, data fetch for nav items |
| `LessonRenderer` | Server | Wraps compileMDX output |
| `Hook` | Server | Display-only, styled wrapper |
| `ConceptBlock` | Server | Display-only |
| `Exercise` | Server | Display-only |
| `Takeaways` | Server | Display-only |
| `Quiz` | **Client** | useState for selection, answer checking, feedback |
| `DeepDive` | **Client** | useState for open/closed |
| `Definition` | **Client** | useState for tooltip visibility |
| `LessonProgressTracker` | **Client** | useEffect to fire "mark started" on mount |
| `ProgressRings` | **Client** | SVG animation, requestAnimationFrame |
| `Breadcrumbs` | **Client** | usePathname hook |
| `SidebarNav` | **Client** | usePathname for active state |
| `ProgressRings` | **Client** | Animation on mount |

**Rule of thumb:** If it only renders data → Server. If it uses useState, useEffect, event handlers, or browser APIs → Client.

---

## Auth Integration (Clerk + Supabase)

```
Browser Request
    ↓
middleware.ts (Edge Runtime)
    - clerkMiddleware() validates session JWT
    - Protects /dashboard, /pillars/* routes
    - Public: /, /sign-in, /sign-up, /api/webhooks/*
    ↓
Server Component / Server Action
    - const { userId } = await auth()   // Clerk server helper
    - userId passed to data access functions
    - Supabase queries filter by user_id
    ↓
Supabase RLS (when Pattern A is used)
    - JWT from Clerk validated by Supabase
    - auth.uid() matches user_id on rows
```

**Clerk Webhook for User Sync:**
The `app/api/webhooks/clerk/route.ts` handler listens for `user.created` events to insert a user row in Supabase. This is required if Supabase has a `users` table that other tables foreign-key against. If using Clerk `userId` strings directly as `user_id` everywhere (no FK), this webhook is optional.

---

## State Management Recommendation

**Use Zustand** (not React Context) for cross-component state, but keep the scope minimal.

The only cross-component state this platform needs right now:
- Pillar color tokens (can be CSS variables — no JS state needed)
- Current lesson progress optimistic update (can stay in component with `useActionState`)
- Theme (dark/light) — one global context is fine

**Verdict:** React Context is sufficient for theme. Zustand is not needed in Phase 1. Defer the decision — start with `useActionState` + Server Actions for mutations, which keeps state local to the component making the mutation.

---

## Patterns to Follow

### Pattern 1: Data Access Layer with React.cache

Keep all Supabase queries in `lib/data/`. Wrap with `React.cache()` so multiple Server Components in the same request share the result without extra queries.

```typescript
// lib/data/progress.ts
import { cache } from 'react'
import 'server-only'

export const getUserLessonProgress = cache(async (userId: string, lessonId: string) => {
  // ... Supabase query
})
```

### Pattern 2: Mutations via Server Actions

Never call Supabase directly from Client Components. All mutations go through `app/actions/*.ts` files with `'use server'` at the top. This keeps `SUPABASE_SERVICE_ROLE_KEY` server-side only.

```typescript
// app/actions/progress.ts
'use server'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

export async function markLessonComplete(lessonId: string) {
  const { userId } = await auth()
  // ... Supabase upsert
  revalidatePath('/dashboard')
}
```

### Pattern 3: Suspense for Streaming Lesson Content

MDX compilation takes time. Wrap the lesson content in `<Suspense>` so the lesson header and metadata render immediately while MDX compiles.

```typescript
// The loading.tsx file handles the Suspense boundary automatically for full page
// For sub-component streaming, use explicit Suspense:
<Suspense fallback={<LessonContentSkeleton />}>
  <LessonContent lessonId={lessonId} />
</Suspense>
```

### Pattern 4: Route Group for Auth Boundary

Use `(app)` route group to apply a single authenticated layout across all protected routes. The layout can verify the Clerk session and redirect if missing, as a defense-in-depth layer beyond middleware.

### Pattern 5: Pillar Color System via CSS Custom Properties

Inject pillar colors at the layout level as CSS variables, not JS state. The `[pillarId]/layout.tsx` Server Component sets `style={{ '--pillar-color': pillar.color_hex }}` on a wrapper div. All child components use `color: var(--pillar-color)`. Zero JavaScript, zero context.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Fetching Supabase in Client Components Directly
**What goes wrong:** `SUPABASE_SERVICE_ROLE_KEY` would need to be exposed to the browser, or Supabase RLS becomes the sole security layer with no defense in depth.
**Instead:** All queries in `lib/data/` (server-only), all mutations via Server Actions.

### Anti-Pattern 2: Marking MDX Layout Components as Client Components
**What goes wrong:** `Hook`, `ConceptBlock`, `Exercise` have no interactivity. Making them client components pulls them into the JS bundle unnecessarily and prevents them from being rendered in the RSC payload.
**Instead:** Server components for all display-only lesson blocks. Only `Quiz`, `DeepDive`, `Definition` need `'use client'`.

### Anti-Pattern 3: Fetching Lesson Data in Middleware
**What goes wrong:** Middleware runs on the Edge Runtime (limited API surface, no Supabase pg driver, must be fast).
**Instead:** Middleware does auth only. Data fetching happens in Server Components.

### Anti-Pattern 4: useEffect for Progress Tracking
**What goes wrong:** `useEffect` fires after hydration; if the user immediately closes the tab, the "started" event never fires. Server Actions called from `useEffect` also have no progressive enhancement.
**Instead:** For "mark started", `useEffect` is acceptable (not critical data). For "mark complete", use a button with an explicit Server Action — it works without JavaScript too.

### Anti-Pattern 5: A Single Top-Level Layout Fetching All Navigation Data
**What goes wrong:** The root layout's data fetch blocks all routes. If the pillar list query is slow, every page in the app is slow.
**Instead:** Fetch navigation data in the `(app)/layout.tsx` (authenticated shell only). Use `React.cache()` so it doesn't duplicate queries. Use `<Suspense>` so slow nav doesn't block lesson content.

### Anti-Pattern 6: Content Versioning Without Rollback Table
**What goes wrong:** `content_version` integer on lessons is useless without the previous versions stored. Content changes are irreversible.
**Instead:** The `content_version` column plus a `lesson_content_history` table (lessonId, version, mdx_content, created_at) from day one. Rollback = UPDATE lessons SET mdx_content = (SELECT mdx_content FROM lesson_content_history WHERE lesson_id = $1 AND version = $2).

---

## Scalability Considerations

| Concern | Phase 1 (1 user, 1 pillar) | Phase 2 (1 user, all pillars) | Phase 3+ (multi-user) |
|---------|---------------------------|-------------------------------|----------------------|
| Supabase queries | Service role, explicit user_id filter | Same, add indexes | Migrate to Clerk JWT + RLS |
| MDX compilation | On every request (fast enough) | Same, or add `use cache` | Pre-compile on content save |
| Progress queries | Simple select by user_id + lesson_id | Add composite indexes | Partitioning by user_id |
| Auth | Clerk single user, no RLS | Same | Enable Supabase RLS policies |
| State management | useActionState, no Zustand | Same | Evaluate if global state needed |

---

## Suggested Build Order

Dependencies flow bottom-up. Build data before UI before interactivity.

```
1. DATABASE SCHEMA (Supabase)
   - pillars, semesters, courses, lessons tables
   - user_lesson_progress table
   - quiz_attempts table
   - lesson_content_history table (rollback)
   - lesson_connections table (cross-pillar, can seed empty)
   Reason: Everything else depends on this shape

2. AUTH LAYER (Clerk + Middleware)
   - Install Clerk, configure middleware.ts
   - Protect (app) routes
   - Verify userId flows to Server Components
   Reason: Must work before any data access

3. SUPABASE DATA ACCESS LAYER (lib/data/)
   - createServerSupabaseClient
   - getPillars, getLessons, getProgress queries
   - All wrapped in React.cache()
   Reason: Pages depend on these functions

4. SERVER ACTIONS (app/actions/)
   - markLessonStarted, markLessonComplete
   - recordQuizAttempt
   Reason: Client components depend on these

5. STATIC LAYOUT SHELL
   - app/layout.tsx (root)
   - app/(app)/layout.tsx (authenticated shell with nav)
   - Pillar color system via CSS variables
   Reason: Pages render inside this

6. NAVIGATION ROUTES (Pillar → Semester → Course → Lesson)
   - All [id]/page.tsx files as Server Components
   - List views only, no MDX yet
   Reason: Validates data model and routing before MDX complexity

7. MDX RENDERING PIPELINE
   - Install next-mdx-remote
   - Create mdxComponents map with stub components
   - Wire lesson page to compileMDX
   Reason: Core product feature, but isolated to lesson page

8. CUSTOM MDX COMPONENTS (display-only first)
   - Hook, ConceptBlock, Exercise, Takeaways, Definition
   Reason: No state, test MDX rendering works

9. INTERACTIVE MDX COMPONENTS
   - Quiz (most complex — state machine, Server Action)
   - DeepDive (simple toggle)
   Reason: Needs MDX pipeline working first

10. DASHBOARD + PROGRESS TRACKING
    - ProgressRings, ContinueCard
    - LessonProgressTracker client component
    - Wire Server Actions to update progress
    Reason: Needs lessons + quiz working to have data to display

11. SEED CONTENT
    - 2 hand-written lessons for Pillar 1
    Reason: Final validation that entire pipeline works end-to-end
```

---

## Sources

- Next.js 15 Server and Client Components (official, verified 2026-02-24): https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js Data Fetching patterns (official, verified 2026-02-24): https://nextjs.org/docs/app/getting-started/fetching-data
- Next.js Caching and Revalidation (official, verified 2026-02-24): https://nextjs.org/docs/app/getting-started/caching-and-revalidating
- Next.js Server Actions / Updating Data (official, verified 2026-02-24): https://nextjs.org/docs/app/getting-started/updating-data
- Next.js Layouts and Pages (official, verified 2026-02-24): https://nextjs.org/docs/app/getting-started/layouts-and-pages
- Next.js layout.js API reference (official, verified 2026-02-24): https://nextjs.org/docs/app/api-reference/file-conventions/layout
- Next.js Route Groups (official, verified 2026-02-24): https://nextjs.org/docs/app/api-reference/file-conventions/route-groups
- Next.js MDX Guide (official, verified 2026-02-24): https://nextjs.org/docs/app/guides/mdx
- next-mdx-remote RSC mode: https://github.com/hashicorp/next-mdx-remote (training data, MEDIUM confidence — verify RSC import path at install time)
- Clerk + Supabase JWT integration: MEDIUM confidence (pattern known, but Clerk template config must be verified in Clerk dashboard at build time)
