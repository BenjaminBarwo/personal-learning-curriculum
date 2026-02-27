# PITFALLS — Next.js + Supabase + MDX Learning Platform

> Research type: Project Research — Pitfalls dimension
> Milestone: Greenfield / Phase 1 foundation
> Date: 2026-02-27
> Downstream use: Informs roadmap and planning to prevent avoidable mistakes

---

## How to Read This Document

Each pitfall entry contains:
- **What goes wrong** — the failure mode, stated concisely
- **Warning signs** — early indicators you are heading toward this mistake
- **Prevention strategy** — specific, actionable steps to avoid it
- **Phase** — when this must be addressed (Phase 1 = MVP, Phase 2 = AI gen, Phase 3 = spaced repetition)

Pitfalls are grouped by domain. High-severity pitfalls are marked `[CRITICAL]`.

---

## Domain 1: Next.js 14 App Router

### P1.1 [CRITICAL] — Treating Server Components as a drop-in replacement for Pages Router patterns

**What goes wrong:** Developers accustomed to the Pages Router try to use `useState`, `useEffect`, and event handlers directly inside Server Components. The build succeeds but the component silently fails at runtime, or they pepper every file with `"use client"` until the app is essentially a Pages Router app with extra steps and no Server Component benefits.

**Warning signs:**
- `"use client"` directive appearing in 60%+ of component files
- Fetching data inside `useEffect` rather than async Server Components
- Layout files that are client components (they can't be)
- `useRouter` imported from `next/navigation` inside Server Components

**Prevention strategy:**
- Establish a clear component boundary rule at project start: data-fetching, layout, and static rendering live in Server Components; interactivity (quiz state, collapse toggles, tooltip hover state) lives in Client Components
- For this platform specifically: `<Quiz>`, `<DeepDive>`, `<Definition>` are Client Components; lesson page wrappers that fetch from Supabase are Server Components
- Never put `"use client"` in a file unless it uses a browser API, hook, or event handler
- Keep client components as leaf nodes in the tree

**Phase:** Phase 1 — must be decided before first component is written

---

### P1.2 — Caching surprises: stale lesson content served after Supabase update

**What goes wrong:** Next.js 14 App Router caches `fetch()` responses aggressively. When lesson content is updated in Supabase (especially during Phase 2 AI generation), the page continues to serve the old MDX string. This is nearly invisible in development (where caching is disabled) and only appears in production.

**Warning signs:**
- Content updated in Supabase but page still shows old version after deployment
- `revalidate` not set anywhere in the data-fetching layer
- Using `fetch` without explicit cache configuration (`cache: 'no-store'` or `next: { revalidate: N }`)
- Supabase JS client `supabase.from(...).select()` calls — these bypass the `fetch` cache entirely but the page itself may still be cached at the route level

**Prevention strategy:**
- For lesson content (changes infrequently, correctness matters): use `revalidate: 3600` (1 hour) and pair with on-demand revalidation via a `/api/revalidate` endpoint triggered when content is updated
- For progress data (must be real-time per user): use `cache: 'no-store'` or `dynamic = 'force-dynamic'` on the route segment
- Do not rely on Vercel's edge cache for anything that must reflect database writes immediately
- Add `export const revalidate = 0` to progress-related routes as an explicit declaration of intent

**Phase:** Phase 1 — set up correctly before seeding any content

---

### P1.3 — Middleware and Clerk auth protecting routes that should be public (or vice versa)

**What goes wrong:** Clerk middleware configured incorrectly either blocks unauthenticated access to routes that should be public (e.g., a landing page), or — far worse — fails to protect lesson routes, exposing content to unauthenticated users. The single-user initial phase masks this because you are always logged in during development.

**Warning signs:**
- Clerk's `authMiddleware` or `clerkMiddleware` not explicitly listing public routes
- Testing done only while logged in — never logged out
- RLS as the only protection layer (defense in depth missing at the middleware level)

**Prevention strategy:**
- In `middleware.ts`, explicitly declare public routes using the `publicRoutes` array: `['/']` and any API webhook routes
- Protect all `/dashboard`, `/pillar`, `/lesson`, `/semester`, `/course` routes at middleware level, not just RLS
- Write a smoke test: open an incognito window and attempt to access a lesson URL directly — it must redirect to sign-in
- Do not rely on Supabase RLS alone for access control; middleware is the first line of defense

**Phase:** Phase 1 — before any lesson route is wired up

---

### P1.4 — Route group confusion breaking layouts and breadcrumbs

**What goes wrong:** The navigation hierarchy (Pillar → Semester → Course → Lesson) maps naturally to nested routes. Developers use Next.js route groups `(group)` folders or deeply nested `layout.tsx` files incorrectly, causing shared layouts to re-mount on navigation or breadcrumbs to lose context.

**Warning signs:**
- Progress rings or sidebar state resetting on navigation between lessons in the same course
- Layout re-renders visible as flash-of-unstyled-content between route transitions
- `usePathname()` returning unexpected values in breadcrumb components

**Prevention strategy:**
- Map the full route hierarchy before writing a single file: `app/(dashboard)/pillar/[pillarId]/semester/[semId]/course/[courseId]/lesson/[lessonId]/page.tsx`
- Place persistent UI (sidebar, progress rings, breadcrumb bar) in the highest shared `layout.tsx` that covers all lesson routes
- Use route groups only to share layouts without affecting the URL — never use them to nest what should be flat
- Test navigation between two lessons in the same course AND two lessons in different pillars before considering routing complete

**Phase:** Phase 1 — route structure must be finalized before component work begins

---

### P1.5 — Conflating `loading.tsx` with skeleton states inside lesson content

**What goes wrong:** Next.js `loading.tsx` provides Suspense-based loading at the route level. Developers use it as a catch-all, then discover that interactive components inside the lesson (quiz submitting, deep-dive toggling) do not have their own loading/pending states, creating a broken UX where parts of the page appear frozen.

**Warning signs:**
- Only one `loading.tsx` file at the app root
- No `isPending` or `isSubmitting` state on quiz submit buttons
- No optimistic UI or disabled state during progress-mark operations

**Prevention strategy:**
- `loading.tsx` handles initial route navigation only — use Suspense boundaries inside the lesson page for async sub-components
- Every quiz submission must disable the submit button and show a loading indicator during the Supabase write
- Every "Mark Complete" interaction must show a pending state
- Derive loading state from React's `useTransition` or `useFormStatus` hooks rather than ad-hoc `useState` boolean flags

**Phase:** Phase 1 — per the project's own Critical Rules (UI States, Mutations)

---

## Domain 2: Supabase + RLS

### P2.1 [CRITICAL] — Enabling RLS but shipping policies that allow all access

**What goes wrong:** Supabase RLS is enabled on tables (good), but the policy is `USING (true)` or the developer forgets that enabling RLS without policies means zero rows are returned — not all rows. Both failure modes ship to production: one exposes all users' data, the other silently returns empty data and the developer thinks the queries are broken.

**Warning signs:**
- RLS enabled but no policies defined → queries return 0 rows, developer adds `.eq('user_id', userId)` client-side filter "as a fix" without understanding why
- Policy `USING (true)` found in any table that stores user-specific data
- Policies tested only with the service role key (which bypasses RLS entirely)

**Prevention strategy:**
- For every table that has `user_id`, write this exact pattern and nothing else:
  ```sql
  CREATE POLICY "user_owns_row" ON table_name
    FOR ALL USING (auth.uid() = user_id);
  ```
- Never test RLS using the Supabase service role key — it bypasses all policies. Use an anon key or the authenticated user's JWT
- After writing policies, run a verification query as the anon role: confirm it returns only the expected rows
- For this platform: `user_progress`, `quiz_attempts`, `lesson_connections` all need user-scoped policies; `lessons`, `courses`, `semesters`, `pillars` are read-only content and need a `SELECT USING (true)` policy so all authenticated users can read them

**Phase:** Phase 1 — before any data is seeded

---

### P2.2 [CRITICAL] — Using Supabase service role key on the client side

**What goes wrong:** The service role key bypasses all RLS. If it is exposed to the browser (via `NEXT_PUBLIC_` prefix or client-side code), any user can read or write any row in the database. This is the most severe security failure possible with Supabase and it is extremely common in tutorials.

**Warning signs:**
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` in any `.env` file
- `createClient` using the service role key called from a file that contains `"use client"`
- Service role key imported in any file under `app/` that is not a Route Handler

**Prevention strategy:**
- Service role key must only be used in Route Handlers (`app/api/**/route.ts`) or server-only utility files
- Create two Supabase client instances: `createClientForServer()` using anon key + user session (for Server Components and Route Handlers acting on behalf of a user), and `createAdminClient()` using service role key (for admin operations only, never user data reads)
- Use Next.js `server-only` package (`import 'server-only'`) in any file that holds the service role client to prevent accidental import in client bundles
- Audit with: search the codebase for `SUPABASE_SERVICE_ROLE` — it must only appear in server-only files

**Phase:** Phase 1 — before first Supabase client is instantiated

---

### P2.3 — Clerk + Supabase JWT integration done incorrectly, breaking RLS

**What goes wrong:** Supabase RLS uses `auth.uid()` which reads from the Supabase-issued JWT. When using Clerk as the auth provider, the Supabase JWT and the Clerk JWT are separate. Without a custom JWT template in Clerk that Supabase can validate, `auth.uid()` returns null for all Clerk-authenticated requests, meaning every RLS policy fails silently and no user data is readable or writable.

**Warning signs:**
- RLS policies written correctly but queries return 0 rows when a Clerk-authenticated user is signed in
- `auth.uid()` returning null in Supabase SQL editor when testing with a real JWT
- Supabase client instantiated without the Clerk session token being injected

**Prevention strategy:**
- Follow the Clerk + Supabase integration pattern exactly:
  1. In Clerk dashboard, create a Supabase JWT template that includes the `sub` claim mapped to `user_id`
  2. When creating the Supabase client, pass the Clerk session token: `createClient(url, anonKey, { global: { headers: { Authorization: \`Bearer \${await getToken({ template: 'supabase' })}\` } } })`
  3. Verify with: run a raw SQL query `SELECT auth.uid()` through the Supabase client while authenticated via Clerk — it must return a non-null UUID
- Store the Clerk user ID (not Supabase user ID) in the `user_id` column if using Clerk user IDs, and update RLS policies accordingly to use `auth.jwt() ->> 'sub'` instead of `auth.uid()`
- This is the most common integration failure in Clerk + Supabase projects

**Phase:** Phase 1 — day one, before any progress tracking is wired up

---

### P2.4 — N+1 queries from fetching lesson metadata and content separately

**What goes wrong:** The navigation hierarchy (Pillar → Semester → Course → Lesson) tempts developers to fetch each level separately: fetch pillars, then for each pillar fetch semesters, then for each semester fetch courses. This creates N+1 database round trips and slow page loads, especially once content scales to 600 lessons.

**Warning signs:**
- Multiple `supabase.from('semesters').select().eq('pillar_id', id)` calls inside loops
- Dashboard page taking 2+ seconds to load locally with only seed data
- Waterfall of Supabase queries visible in the browser Network tab

**Prevention strategy:**
- Use Supabase's embedded select (PostgREST foreign key joins) to fetch the full hierarchy in one query:
  ```ts
  supabase.from('pillars').select(`
    *,
    semesters (
      *,
      courses (
        *,
        lessons ( id, title, estimated_minutes, is_complete )
      )
    )
  `)
  ```
- For the dashboard, pre-compute progress aggregates via a Postgres view or materialized view rather than counting in JavaScript
- Add database indexes on `pillar_id`, `semester_id`, `course_id` foreign keys from day one

**Phase:** Phase 1 — before dashboard is built

---

### P2.5 — Content versioning and rollback not designed before first lesson is stored

**What goes wrong:** The first lesson is stored in Supabase as a plain MDX string. The AI content generator in Phase 2 overwrites it. There is no rollback. The developer realizes they needed a `content_versions` rollback table only after losing manually written content.

**Warning signs:**
- `lessons.content` column is the single source of truth with no history
- No `content_version` integer column on the `lessons` table
- Phase 2 (AI generation) scoped without first designing the versioning schema

**Prevention strategy:**
- Implement the rollback table schema before storing the first lesson: `lesson_content_versions (id, lesson_id, content, version, created_at, created_by)` with `lessons.content_version` as a foreign key pointer to the current version
- Any update to lesson content must insert a new row in `lesson_content_versions`, increment `lessons.content_version`, and update `lessons.content`
- Write a rollback function: `SELECT rollback_lesson_content(lesson_id, version_number)` as a Postgres function from day one
- This is called out in PROJECT.md — do not defer it

**Phase:** Phase 1 — schema must exist before first content seed

---

## Domain 3: MDX via next-mdx-remote

### P3.1 [CRITICAL] — MDX compilation on every request rather than at build/generation time

**What goes wrong:** `next-mdx-remote`'s `compileMDX` is called inside the lesson page's server component on every request. MDX compilation (parsing, AST transformation, bundling) takes 50-200ms per call. At scale this creates visible latency on lesson page loads and unnecessary CPU burn on Vercel serverless functions.

**Warning signs:**
- `compileMDX` called directly inside `page.tsx` or a data-fetching function without a caching layer
- Lesson pages feeling slow despite the content being static
- Vercel function duration logs showing 200-500ms per lesson request

**Prevention strategy:**
- Cache compiled MDX output. Options in order of preference:
  1. Store the compiled output (serialized MDX) in Supabase alongside the raw MDX source — recompile only when `content_version` changes
  2. Use Next.js `unstable_cache` to wrap the `compileMDX` call with a cache key of `lesson_id + content_version`
  3. On-demand revalidation: when content is updated, call a `/api/revalidate?lessonId=X` endpoint that invalidates the cached compiled output
- Never compile the same unchanged MDX string twice in production

**Phase:** Phase 1 — before first lesson page is wired to real content

---

### P3.2 — Custom MDX components not registered, silently rendering as nothing

**What goes wrong:** `next-mdx-remote` requires custom components to be passed explicitly in the `components` map. If a component (`<Quiz>`, `<DeepDive>`, `<Definition>`) is used in the MDX content but not registered in the components map, it renders as nothing — no error, no warning, just missing content. This is particularly insidious because the lesson page appears to load correctly.

**Warning signs:**
- Lesson content appears incomplete — sections missing with no console error
- New custom components added to MDX content but not added to the components map
- Components map defined in multiple places with no single source of truth

**Prevention strategy:**
- Define one central `mdxComponents` object exported from `lib/mdx-components.ts` and import it everywhere `compileMDX` or `MDXRemote` is called
- Write a content validation function that parses the raw MDX string for custom component tags and cross-references against the registered components map — run this before storing content in the database
- Add a test that renders each custom component variant to verify nothing is silently empty

**Phase:** Phase 1 — before first lesson is rendered

---

### P3.3 — Serialization errors when passing MDX components that contain state

**What goes wrong:** `next-mdx-remote` compiles MDX server-side and then the serialized output is passed to a client-side `<MDXRemote>` component. If custom components are Server Components that fetch data, they cannot be passed through the `components` prop — only Client Components can be in the components map. Conversely, if the page is a Server Component, trying to pass stateful Client Components (Quiz) through the serialized output fails with hydration mismatches.

**Warning signs:**
- Hydration mismatch errors in the browser console on lesson pages
- "Functions cannot be passed directly to Client Components" errors
- Quiz state resetting on hydration or not persisting between renders

**Prevention strategy:**
- Use the pattern: Server Component page fetches raw MDX from Supabase → passes raw MDX string to a Client Component wrapper → Client Component calls `compileMDX` client-side OR the server compiles and passes the `compiledSource` to `<MDXRemote>` as a serialized prop
- Interactive custom components (`Quiz`, `DeepDive`, `Definition`) must be marked `"use client"` and must be in the components map passed to `<MDXRemote>` on the client side
- Test the full hydration cycle: server renders → client hydrates → user interaction updates state → no console errors

**Phase:** Phase 1 — must be resolved during lesson rendering prototype

---

### P3.4 — MDX content stored without schema validation, breaking the renderer

**What goes wrong:** MDX content is stored in Supabase as a raw string. A typo in a component name, an unclosed tag, or invalid JSX in the MDX source causes `compileMDX` to throw at render time — crashing the lesson page with a 500 error for that lesson. Since content is authored (or AI-generated) outside the app, there is no guardrail.

**Warning signs:**
- Lesson page returning 500 for a specific lesson but not others
- `compileMDX` throwing without a useful error boundary
- No validation step in the content-saving workflow

**Prevention strategy:**
- Wrap `compileMDX` in a try/catch and render a graceful error state ("This lesson's content has a formatting issue") rather than a 500
- Before storing MDX in Supabase (especially from AI generation in Phase 2), run a server-side validation step: attempt to compile the MDX in a sandbox, check for errors, and reject invalid content
- Add a database constraint or trigger that runs a Postgres function to validate MDX is non-empty and contains required structural elements (at minimum: has a `##` heading, has at least one `<ConceptBlock>`)

**Phase:** Phase 1 (error boundary) + Phase 2 (validation pipeline for AI-generated content)

---

## Domain 4: Clerk Authentication

### P4.1 — Single-user development masking multi-user data leakage

**What goes wrong:** The project is built and tested with a single user. RLS policies, query filters, and progress tracking all "work" because there is only one user's data. When a second user signs up (even for testing), their progress bleeds into the first user's dashboard, or they see content they should not, because RLS policies were never actually tested with two distinct users.

**Warning signs:**
- All development done with one Clerk account
- RLS policies never tested by querying as a second user's JWT
- `user_id` columns present on tables but never verified to filter correctly in queries

**Prevention strategy:**
- Create two test Clerk accounts and test all progress-related features with both simultaneously before Phase 1 is considered complete
- In Supabase SQL editor, use `SET LOCAL role TO authenticated; SET LOCAL request.jwt.claims TO '{"sub": "user_2_id"}';` to impersonate a second user and verify RLS returns only their rows
- Mark a lesson complete as User A, then sign in as User B and verify the lesson shows as incomplete

**Phase:** Phase 1 — before milestone sign-off

---

### P4.2 — Clerk webhook not set up, causing user records to be missing in Supabase

**What goes wrong:** Clerk manages authentication, but the application data model may require a `users` table in Supabase (for preferences, settings, or joins). Without a Clerk webhook (`user.created` event) that inserts a row into Supabase when a new user signs up, foreign key relationships fail silently or data is missing for new users.

**Warning signs:**
- New user signs up via Clerk but has no corresponding row in a `users` or `profiles` table
- Foreign key constraint errors on first lesson attempt by a new user
- Progress tracking fails silently for new users

**Prevention strategy:**
- Decide at schema design time: does this app need a `users` table in Supabase, or can `user_id` be a plain text column (Clerk user ID) without a foreign key?
- If a `users` table is needed: set up a Clerk webhook at `/api/webhooks/clerk` on day one that creates the Supabase user record on `user.created`
- If not needed (simpler): use Clerk user ID as a bare string in `user_id` columns — this is valid and avoids the webhook complexity for a single-user initial phase
- For this project: given single-user initial scope, the bare string approach is lower risk

**Phase:** Phase 1 — schema decision must be made before first table is created

---

## Domain 5: Custom Quiz Engine

### P5.1 — Quiz state not isolated per question, causing answer bleed between renders

**What goes wrong:** The quiz engine manages state for multiple questions. If the selected answer, explanation visibility, and correct/incorrect state are stored in a single flat object rather than per-question, navigating between lessons or re-mounting the quiz component causes stale state from a previous lesson to appear in the current lesson's quiz.

**Warning signs:**
- Selecting an answer on Lesson A's quiz, navigating away, coming back and seeing the answer still selected
- Quiz showing "correct" on a fresh render before the user has answered
- A single `useState` object managing all questions simultaneously

**Prevention strategy:**
- Store quiz state keyed by `lessonId + questionIndex`, not just `questionIndex`
- Reset quiz state on `lessonId` change using `useEffect(() => { resetQuiz() }, [lessonId])`
- Or use a `key={lessonId}` prop on the Quiz component to force full re-mount on lesson change — simpler and more reliable
- Never store quiz state in a global store (Zustand/Context) across lesson navigation

**Phase:** Phase 1 — quiz engine design

---

### P5.2 — Quiz attempts not persisted, losing analytics data needed for Phase 3

**What goes wrong:** The quiz engine works perfectly in the UI but attempts are not written to Supabase. When Phase 3 (FSRS spaced repetition) is implemented, there is no historical quiz data to seed the algorithm. Retrofitting data collection later requires a migration and loses all early learning history.

**Warning signs:**
- `quiz_attempts` table not in the schema
- Quiz feedback shown to user but no database write triggered
- "We'll add analytics later" appearing in planning notes

**Prevention strategy:**
- Create the `quiz_attempts` table in Phase 1 schema: `(id, user_id, lesson_id, question_id, selected_option, is_correct, time_taken_seconds, created_at)`
- Write to this table on every quiz submission, even during single-user Phase 1
- The FSRS algorithm needs: item ID, response correctness, and timestamp — capture all three from day one

**Phase:** Phase 1 — schema and write must exist before first quiz is answered

---

## Domain 6: Content Architecture

### P6.1 — Building the MDX component library before the lesson template is validated

**What goes wrong:** The developer builds all 10+ custom MDX components (`Hook`, `ConceptBlock`, `Quiz`, `DeepDive`, `Exercise`, `Takeaways`, `Definition`, `Diagram`, etc.) before writing a single real lesson in MDX. The lesson template then evolves during content writing, requiring the components to be rebuilt. This is wasted work.

**Warning signs:**
- All custom components built before any real MDX content exists
- Component API (props, children structure) designed in a vacuum
- Content authoring ("write the lesson") deferred until after all components are done

**Prevention strategy:**
- Write the first real lesson in raw MDX first, using placeholder `<div>` wrappers where custom components will go
- Derive the component API from the actual content needs of that lesson — not from assumptions
- Build components one at a time as each lesson requires them
- The PROJECT.md requirement for 2 complete hand-written lessons in Phase 1 is the right forcing function — use it

**Phase:** Phase 1 — lesson content first, component library second

---

### P6.2 — Terminology tooltip system causing performance degradation at scale

**What goes wrong:** The domain terminology highlighting system (hover/tap definitions for terms) is implemented by scanning lesson content text and replacing matches with `<Definition>` wrapper components. If this is done via a naive string replace on every render, or if the definitions are fetched individually per term, it creates O(n*m) complexity (n terms × m lessons) and noticeable lag on definition hover.

**Warning signs:**
- Definition data fetched in individual Supabase queries per term per lesson
- Text scanning done in a `useEffect` that mutates the DOM directly
- Tooltip system working fine on a 10-term lesson, slowing on a 50-term lesson

**Prevention strategy:**
- Fetch all definitions for a lesson in one query (`WHERE term IN (...)`) before rendering
- Pass definitions as a context value to the MDX component tree — individual `<Definition>` components read from context, not from individual queries
- Use CSS and a pre-built tooltip component (Radix UI Tooltip) rather than DOM manipulation for the popup
- Cap the number of highlighted terms per lesson to the most important 10-15 (diminishing returns beyond that)

**Phase:** Phase 1 — design before the terminology system is built

---

### P6.3 — Progress tracking writes blocking the lesson reading experience

**What goes wrong:** "Mark as Started" is triggered when a lesson opens. If this Supabase write is awaited synchronously before the lesson content renders, it creates a waterfall: fetch lesson → write progress → render. The lesson is blocked from displaying while the progress write is in flight.

**Warning signs:**
- Lesson pages feeling slow even with fast database reads
- Network tab showing progress write completing before lesson content appears
- `await markLessonStarted(lessonId)` called at the top of a Server Component

**Prevention strategy:**
- Fire-and-forget the "mark started" write — do not await it on the critical render path
- Use a Route Handler POST request triggered from the client side after the lesson content has rendered
- Or: use a React Server Action called with `startTransition` so it does not block the render
- "Mark complete" can be awaited (user explicitly clicked a button) — "mark started" must not be

**Phase:** Phase 1 — progress tracking implementation

---

## Domain 7: Vercel Deployment

### P7.1 — Environment variables not set in Vercel, causing silent failures in production

**What goes wrong:** The app works locally because `.env.local` is present. On Vercel, environment variables are not configured. Supabase client fails to instantiate, Clerk middleware throws, and the app either crashes with a 500 or silently serves unauthenticated/empty states. The developer sees a working local build and assumes production is fine.

**Warning signs:**
- First Vercel deployment shows working UI but no data
- Clerk redirect loop on any protected route in production
- No `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel dashboard

**Prevention strategy:**
- Maintain a `.env.example` file with all required environment variable names (no values) checked into the repo
- After first Vercel deployment, immediately verify: navigate to a protected lesson page while logged in, confirm data loads
- Required variables for this stack: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` (if webhooks used)
- Add environment variable validation at app startup using `zod` to throw a clear error if any required variable is missing

**Phase:** Phase 1 — first deployment

---

### P7.2 — Serverless function cold starts degrading lesson open performance

**What goes wrong:** Vercel serverless functions (used for Route Handlers and Server Components) have cold start latency. If lesson content compilation, progress reads, and definition fetches all happen in separate serverless invocations that cold-start simultaneously, the lesson open experience degrades to 2-3 seconds on first load after inactivity.

**Warning signs:**
- Lesson pages fast during active use, slow after 5+ minutes of inactivity
- Multiple sequential API calls visible in browser Network tab on lesson load
- No data coalescing — each concern (content, progress, definitions) fetched in separate requests

**Prevention strategy:**
- Coalesce all lesson page data into a single server-side fetch: one Supabase query that returns lesson content + user progress + lesson definitions in one round trip
- Cache compiled MDX output (see P3.1) so compilation is not on the cold-start critical path
- Consider Vercel's Edge Runtime for the lesson page if cold starts are measurable — Edge has no cold start but has restrictions (no Node.js APIs)

**Phase:** Phase 1 — performance validation before content is seeded

---

## Summary Table

| ID | Pitfall | Severity | Phase |
|----|---------|----------|-------|
| P1.1 | Server/Client component boundary confusion | CRITICAL | Phase 1 |
| P1.2 | Stale cached lesson content after Supabase update | HIGH | Phase 1 |
| P1.3 | Clerk middleware misconfiguration | CRITICAL | Phase 1 |
| P1.4 | Route group confusion breaking layouts | MEDIUM | Phase 1 |
| P1.5 | Loading states conflated across route and component levels | MEDIUM | Phase 1 |
| P2.1 | RLS enabled without correct policies | CRITICAL | Phase 1 |
| P2.2 | Service role key exposed to client | CRITICAL | Phase 1 |
| P2.3 | Clerk + Supabase JWT integration broken | CRITICAL | Phase 1 |
| P2.4 | N+1 queries in navigation hierarchy | HIGH | Phase 1 |
| P2.5 | Content versioning not designed before first lesson stored | HIGH | Phase 1 |
| P3.1 | MDX compiled on every request | HIGH | Phase 1 |
| P3.2 | Custom components not registered, silently missing | HIGH | Phase 1 |
| P3.3 | Serialization errors with stateful MDX components | CRITICAL | Phase 1 |
| P3.4 | Invalid MDX crashing lesson page with 500 | HIGH | Phase 1 + 2 |
| P4.1 | Single-user masking multi-user data leakage | HIGH | Phase 1 |
| P4.2 | Clerk webhook not set up, missing user records | MEDIUM | Phase 1 |
| P5.1 | Quiz state bleed between lesson navigations | HIGH | Phase 1 |
| P5.2 | Quiz attempts not persisted, losing Phase 3 data | HIGH | Phase 1 |
| P6.1 | Component library built before lesson template validated | MEDIUM | Phase 1 |
| P6.2 | Terminology tooltip performance at scale | MEDIUM | Phase 1 |
| P6.3 | Progress writes blocking lesson render | HIGH | Phase 1 |
| P7.1 | Environment variables not set in Vercel | CRITICAL | Phase 1 |
| P7.2 | Cold start latency degrading lesson open performance | MEDIUM | Phase 1 |

---

## Highest Priority Actions Before Writing Any Code

1. **Resolve P2.3 first** — Clerk + Supabase JWT integration. If `auth.uid()` does not return the Clerk user ID, nothing else works.
2. **Resolve P2.2 immediately** — service role key boundary. Establish the two-client pattern before any Supabase code is written.
3. **Resolve P2.1 concurrently with schema** — write RLS policies for every table at the same time the table is created.
4. **Resolve P1.1 by convention** — decide the Server/Client component split before the first component file exists.
5. **Resolve P3.3 during the lesson rendering prototype** — prove the MDX hydration model before any content is stored.
