# Phase 5: Progress + Dashboard - Research

**Researched:** 2026-02-28
**Domain:** Progress tracking, Supabase upsert mutations, aggregated progress computation, dashboard "continue" logic, semester unlock gating
**Confidence:** HIGH

---

## Summary

Phase 5 wires the `progress` table — which has existed since Phase 1 — into the live application. Three key behaviors drive all the work: (1) tracking per-lesson status (`not_started`, `in_progress`, `completed`) with persistence across sessions; (2) computing aggregated completion percentages at the course and pillar levels and displaying them through the existing `ProgressBar` component; and (3) locking semesters until their predecessor is completed, with a manual override escape hatch.

The codebase is intentionally prepared for this phase. Every hierarchy page already renders `ProgressBar` at `0%` with explicit comments pointing to "Phase 5 fills real data." The `MarkCompleteButton` component already exists with a stubbed handler. The `progress` table schema, RLS policies, and relevant indexes are fully deployed. The two Supabase client factories (server RSC client + browser client for mutations) are already the established pattern from Phases 3 and 4.

The primary challenge is the data-fetch pattern for aggregate progress. Supabase views filter per-table but offer no built-in aggregation across the full hierarchy (pillar → semester → course → lesson). The recommended approach is to use Supabase's PostgREST `select` with relationship embedding to fetch lesson IDs in a single query, then JOIN against the `progress` table server-side using the hardcoded `HARDCODED_USER_ID`. For the dashboard "continue" card, a targeted query on `progress` ordered by `last_accessed_at DESC` and filtered by `status != 'completed'` yields the most recently accessed incomplete lesson.

**Primary recommendation:** Use server-side RSC data fetching for all progress reads (aggregation, continue card, lock states) and the browser `createClerkSupabaseClient` pattern exclusively for the `progress` INSERT/UPDATE mutation triggered by `MarkCompleteButton`. No new libraries required. No new UI components required beyond connecting existing stubs to real data.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROG-01 | User's lesson progress (not_started/in_progress/completed) is tracked and persisted | `progress` table fully deployed; upsert pattern via browser Supabase client; `MarkCompleteButton` stub ready to wire; `last_accessed_at` update on lesson page load covers in_progress state |
| PROG-02 | User can see progress rings/bars at pillar and course levels | `ProgressBar` component already exists at every level showing `0%`; Phase 5 replaces hardcoded `0` with real aggregated percent computed server-side; no component changes needed |
| PROG-03 | Semesters unlock when previous semester is completed; manual override unlocks without completing | `semesters` table has `display_order`; lock logic computed server-side by comparing completed-lesson counts to total-lesson counts per semester; override stored as a flag on the `progress` aggregate or a separate `semester_overrides` table |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.98.0 (installed) | Upsert to `progress` table, read progress for aggregation | Already project standard; both client factories established |
| `@clerk/nextjs` | ^6.39.0 (installed) | Supply JWT for Supabase RLS; access `HARDCODED_USER_ID` constant | Already project standard; single-user phase uses hardcoded ID |
| Next.js 16 RSC | 16.1.6 (installed) | Server-side aggregation queries on all hierarchy pages | Consistent with all prior phases; zero client JS for reads |
| React 19 | 19.2.3 (installed) | `useState` for optimistic button state in `MarkCompleteButton` | Already used in the component |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native Postgres aggregation via PostgREST | N/A | `COUNT` completed lessons server-side | Aggregate progress percentages without client JS |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server-side aggregation via RSC | Client-side fetching + `useEffect` | Client approach adds bundle weight, causes loading flicker on every hierarchy page; RSC is already the pattern |
| Upsert via Server Action | Upsert via browser client (established pattern) | Server Actions would work but add complexity; browser client + Clerk JWT is the proven Phase 4 pattern |
| New `semester_overrides` table | A `locked_override` column on `semesters` | Separate table is cleaner for audit; column approach is simpler and avoids a migration if overrides are rare/admin-only |

**Installation:**
```bash
# No new dependencies required for Phase 5
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/lesson/
│   └── MarkCompleteButton.tsx     # EXISTS — wire stub to real Supabase upsert
├── components/ui/
│   └── ProgressBar.tsx            # EXISTS — no changes needed
├── lib/
│   ├── progress.ts                # NEW — server-side progress aggregation helpers
│   └── supabase/
│       ├── client.ts              # EXISTS — createClerkSupabaseClient for mutations
│       └── server.ts              # EXISTS — createServerSupabaseClient for reads
├── app/
│   ├── page.tsx                   # UPDATE — add continue card + real pillar progress
│   ├── pillars/[pillarSlug]/page.tsx                    # UPDATE — real progress bar
│   ├── pillars/.../semesters/[semesterSlug]/page.tsx    # UPDATE — real progress + semester lock UI
│   ├── pillars/.../courses/[courseSlug]/page.tsx        # UPDATE — real progress + lesson status icons
│   └── pillars/.../lessons/[lessonSlug]/page.tsx        # UPDATE — wire MarkCompleteButton, mark in_progress on load
└── supabase/migrations/
    └── 00003_progress_helpers.sql  # NEW — semester_overrides table (if needed) + helper views
```

### Pattern 1: Lesson Progress Upsert (MarkCompleteButton)

**What:** On button click, upsert a row into `progress` with `status = 'completed'`, `completed_at = NOW()`. Use `onConflict: 'user_id,lesson_id'` to update if the row already exists.

**When to use:** Any time a user explicitly marks a lesson complete.

**Example:**
```typescript
// Source: Supabase JS docs — upsert pattern
// src/components/lesson/MarkCompleteButton.tsx

const supabase = createClerkSupabaseClient() // called at component top level (hook constraint)

async function handleMarkComplete() {
  setIsLoading(true)
  try {
    const { error } = await supabase
      .from('progress')
      .upsert(
        {
          user_id: HARDCODED_USER_ID,
          lesson_id: lessonId,
          status: 'completed',
          completed_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,lesson_id' }
      )
    if (error) throw error
    setIsCompleted(true)
  } catch (err) {
    console.error('Failed to mark lesson complete:', err)
    // Show user-facing error per CLAUDE.md error handling rule
  } finally {
    setIsLoading(false)
  }
}
```

### Pattern 2: Mark In-Progress on Lesson Load (Server Action or Route Handler)

**What:** When a user opens a lesson page, upsert a `progress` row with `status = 'in_progress'` (only if not already `completed`) and set `last_accessed_at = NOW()`. This is what powers the "continue where you left off" logic.

**When to use:** In the lesson page — either as a server action called on page render, or triggered client-side after mount.

**Key constraint:** The server Supabase client uses the Clerk JWT and respects RLS. The progress INSERT/UPDATE policies require `user_id` to match the JWT sub claim. Since `HARDCODED_USER_ID` is the actual live Clerk user ID (`user_3AGlLR1a07HdOR8G8mECoqPUUfd`), server-side upsert via `createServerSupabaseClient` will work if the user is signed in when the page loads.

**Example:**
```typescript
// In lesson page — server-side upsert on page load
// Only sets in_progress if not already completed (preserves completed state)
async function markInProgress(supabase: ReturnType<typeof createServerSupabaseClient>, lessonId: string) {
  const { data: existing } = await supabase
    .from('progress')
    .select('status')
    .eq('user_id', HARDCODED_USER_ID)
    .eq('lesson_id', lessonId)
    .single()

  if (existing?.status === 'completed') return // preserve completed state

  await supabase
    .from('progress')
    .upsert(
      {
        user_id: HARDCODED_USER_ID,
        lesson_id: lessonId,
        status: 'in_progress',
        started_at: existing ? undefined : new Date().toISOString(), // only set on first visit
        last_accessed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    )
}
```

### Pattern 3: Aggregated Progress Computation (Server-Side)

**What:** For a given scope (course, semester, pillar), fetch all lesson IDs in that scope, then count how many have `status = 'completed'` in `progress`. Return `{ completed, total, percent }`.

**When to use:** Every hierarchy page that renders a `ProgressBar`.

**Example:**
```typescript
// src/lib/progress.ts

export async function getCourseProgress(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  courseId: string,
  userId: string
): Promise<{ completed: number; total: number; percent: number }> {
  // Fetch all lesson IDs for the course
  const { data: lessons } = await supabase
    .from('active_lessons')
    .select('id')
    .eq('course_id', courseId)

  const total = lessons?.length ?? 0
  if (total === 0) return { completed: 0, total: 0, percent: 0 }

  const lessonIds = (lessons ?? []).map((l) => l.id)

  // Count completed progress records for this user
  const { count } = await supabase
    .from('progress')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
    .in('lesson_id', lessonIds)

  const completed = count ?? 0
  return { completed, total, percent: Math.round((completed / total) * 100) }
}
```

### Pattern 4: "Continue Where You Left Off" Dashboard Card

**What:** Query `progress` for the most recently accessed lesson that is not completed, then resolve its full display path (name + URL) via the lesson→course→semester→pillar hierarchy.

**When to use:** Dashboard page only.

**Example:**
```typescript
// In dashboard page (src/app/page.tsx)

// Step 1: get most recently accessed incomplete lesson progress record
const { data: continueProgress } = await supabase
  .from('progress')
  .select('lesson_id, last_accessed_at')
  .eq('user_id', HARDCODED_USER_ID)
  .neq('status', 'completed')
  .order('last_accessed_at', { ascending: false })
  .limit(1)
  .single()

// Step 2: if found, resolve the lesson and its path from DB
if (continueProgress) {
  const { data: lesson } = await supabase
    .from('active_lessons')
    .select('id, name, slug, course_id')
    .eq('id', continueProgress.lesson_id)
    .single()
  // ... resolve course → semester → pillar for URL construction
}
```

### Pattern 5: Semester Lock / Unlock Logic

**What:** A semester is locked if the previous semester (lower `display_order`) has fewer completed lessons than total lessons. A manual override bypasses this check.

**Implementation options:**

**Option A (recommended):** Compute lock state server-side in the pillar page by fetching all semesters with their progress summaries. No schema change needed.

**Option B (schema override):** Add a `semester_overrides` table or a `manually_unlocked` boolean column on `semesters` to persist admin overrides across sessions.

**Key detail:** The success criterion says "a manual override unlocks it without completing the prior semester." This implies the override must persist (survive page refresh), which requires either a DB flag or a cookie. A DB-based solution is cleaner and fits the established server-side pattern.

**Recommended schema addition (migration 00003):**
```sql
-- Minimal: add a column to semesters for manual unlock override
ALTER TABLE semesters ADD COLUMN IF NOT EXISTS manually_unlocked BOOLEAN NOT NULL DEFAULT FALSE;

-- Or a separate audit-friendly table:
CREATE TABLE semester_unlocks (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  semester_id UUID    NOT NULL REFERENCES semesters(id),
  user_id     TEXT    NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(semester_id, user_id)
);
```

**Lock check logic:**
```typescript
// In pillar page — for each semester in display_order:
// semester N+1 is locked if:
//   - semester N progress.percent < 100
//   - AND semester N+1 is NOT in semester_unlocks for this user

function isSemesterLocked(
  semesterIndex: number,
  semesterProgressList: Array<{ percent: number }>,
  unlockedSemesterIds: Set<string>,
  semesterId: string,
): boolean {
  if (semesterIndex === 0) return false // first semester always unlocked
  if (unlockedSemesterIds.has(semesterId)) return false // manual override
  const prevProgress = semesterProgressList[semesterIndex - 1]
  return prevProgress.percent < 100
}
```

### Anti-Patterns to Avoid

- **Fetching full lesson content for aggregation:** Never select `mdx_content` when computing progress percentages — only select `id`. MDX content is large and irrelevant here.
- **Client-side aggregation with `useEffect`:** Progress percentages belong in server components. Fetching lesson lists and progress in the browser adds unnecessary JS and causes hydration issues.
- **Calling `createClerkSupabaseClient()` inside event handlers:** This calls `useSession()` internally and cannot be called inside click handlers. Call it at component top level (established in Phase 4 — Quiz.tsx does this correctly).
- **Overwriting `completed` status with `in_progress`:** The "mark in-progress on lesson load" upsert must check existing status and only set `in_progress` if the lesson isn't already `completed`.
- **Using `auth.uid()` in RLS:** Never use `auth.uid()` — it returns NULL with Clerk JWTs. The RLS policies already use `current_setting('request.jwt.claims', true)::json->>'sub'` correctly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Progress upsert conflict handling | Custom SELECT then INSERT/UPDATE logic | Supabase `.upsert()` with `onConflict` | Handles race conditions; `progress` table has `UNIQUE(user_id, lesson_id)` |
| Percentage math | Custom rounding/clamping | `Math.round((completed / total) * 100)` clamped to 0-100 | `ProgressBar` already accepts 0-100 with internal clamping |
| Lesson status icon rendering | New status component | Inline SVG conditioned on status string in existing lesson lists | Status icons are simple circles; no library needed |

**Key insight:** The hardest part of this phase is not UI or mutations — it is the N+1 query risk in hierarchy pages. Each course in a semester list page currently makes no progress queries; naively adding a progress call per course row creates N+1 queries. Batch the lesson ID collection and use a single `IN (...)` query for all progress counts at once.

---

## Common Pitfalls

### Pitfall 1: N+1 Progress Queries on List Pages

**What goes wrong:** The semester page shows multiple courses; the course page shows multiple lessons. If progress is fetched per-course or per-lesson individually, a semester with 5 courses makes 6 Supabase round trips (1 for courses + 5 for progress).

**Why it happens:** Natural intuition is to enrich each list item with its own data.

**How to avoid:** Collect all IDs for the scope first (all lesson IDs for the semester), then issue a single `progress` query with `.in('lesson_id', allLessonIds)`. Aggregate in application code.

**Warning signs:** Multiple `from('progress')` calls inside a loop; N progress queries per page load visible in Supabase logs.

---

### Pitfall 2: Progress State Not Reflecting After MarkCompleteButton Click

**What goes wrong:** User clicks "Mark as Complete," button shows success, but the course progress bar still shows the old percentage. The progress bar is a server component — it doesn't re-render on client mutation.

**Why it happens:** RSC pages cache server data; client mutation does not trigger a server re-render without a navigation event.

**How to avoid:** After a successful upsert in `MarkCompleteButton`, call `router.refresh()` from `next/navigation`. This triggers Next.js to re-run the server components on the current page, re-fetching progress without a full navigation.

**Warning signs:** Button shows "Completed" but progress bar stays at old percent.

---

### Pitfall 3: Missing `last_accessed_at` Update Breaking "Continue" Card

**What goes wrong:** The "continue where you left off" card relies on `last_accessed_at` being updated each time a user visits a lesson. If this update is omitted, the card shows a stale lesson or no lesson at all.

**Why it happens:** Lessons are loaded server-side; there's no automatic tracking unless explicitly written.

**How to avoid:** On lesson page load, always upsert `last_accessed_at = NOW()`. Do this server-side in the RSC page function (not client-side).

---

### Pitfall 4: Semester Lock State Not Propagated to Nested Pages

**What goes wrong:** The pillar page shows semester 2 as locked, but navigating directly to the semester 2 URL still renders the page.

**Why it happens:** Lock logic in the pillar list page is presentation-only; the semester page itself doesn't enforce the lock.

**How to avoid:** Add lock enforcement in the semester page (`[semesterSlug]/page.tsx`) by checking whether the previous semester is completed. If locked, render a locked state UI instead of course content (or `notFound()`). Also disable the Link on the pillar page for locked semesters.

---

### Pitfall 5: RLS Blocks Progress Writes for Unauthenticated Requests

**What goes wrong:** This occurred in Phase 4 with `quiz_attempts` — RLS blocked client-side inserts because there was no Clerk sign-in UI. The same risk applies to `progress` mutations from `MarkCompleteButton`.

**Why it happens:** The browser Supabase client uses the Clerk session JWT. If the JWT is not present (no active session), RLS rejects the write.

**How to avoid:** Verify the `useSession()` hook returns a non-null session in `createClerkSupabaseClient`. Since `HARDCODED_USER_ID = user_3AGlLR1a07HdOR8G8mECoqPUUfd` is the real Clerk user who is always signed in, this should work in practice. If it fails, fall back to the admin client pattern (server action) or test with the service role key as a diagnostic.

---

## Code Examples

Verified patterns from official sources and established project conventions:

### Supabase Upsert with onConflict

```typescript
// Source: Supabase JS docs — upsert, established project pattern
const { error } = await supabase
  .from('progress')
  .upsert(
    {
      user_id: HARDCODED_USER_ID,
      lesson_id: lessonId,
      status: 'completed',
      completed_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,lesson_id' } // matches UNIQUE constraint
  )
```

### Count Completed Lessons with head: true

```typescript
// Source: Supabase JS docs — count query optimization
const { count } = await supabase
  .from('progress')
  .select('id', { count: 'exact', head: true }) // head:true skips fetching rows
  .eq('user_id', userId)
  .eq('status', 'completed')
  .in('lesson_id', lessonIds)
```

### router.refresh() After Client Mutation

```typescript
// Source: Next.js docs — refreshing server components after client mutation
'use client'
import { useRouter } from 'next/navigation'

// Inside MarkCompleteButton:
const router = useRouter()

async function handleMarkComplete() {
  // ... upsert to Supabase ...
  setIsCompleted(true)
  router.refresh() // triggers RSC re-render — progress bars update
}
```

### Progress Percentage Helper

```typescript
// src/lib/progress.ts — reusable across all hierarchy levels

export async function getLessonProgressForScope(
  supabase: SupabaseClient,
  lessonIds: string[],
  userId: string
): Promise<{ completed: number; total: number; percent: number }> {
  const total = lessonIds.length
  if (total === 0) return { completed: 0, total: 0, percent: 0 }

  const { count } = await supabase
    .from('progress')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
    .in('lesson_id', lessonIds)

  const completed = count ?? 0
  const percent = Math.min(100, Math.round((completed / total) * 100))
  return { completed, total, percent }
}
```

### Existing HARDCODED_USER_ID Constant

```typescript
// Pattern from Phase 1 — already used in quiz_attempts (server pattern)
// Location: must be accessible in server components AND client components
// Decision [01-01]: HARDCODED_USER_ID = 'user_3AGlLR1a07HdOR8G8mECoqPUUfd'
// For server: import from a shared constants file
// For client: use process.env.NEXT_PUBLIC_HARDCODED_USER_ID or embed directly

export const HARDCODED_USER_ID = 'user_3AGlLR1a07HdOR8G8mECoqPUUfd'
```

---

## Implementation Scope Map

This section maps each success criterion to the files that need changing:

| Success Criterion | Files to Change | Change Type |
|-------------------|-----------------|-------------|
| SC1: Lesson status updates and persists | `MarkCompleteButton.tsx` — wire real upsert; `lesson/page.tsx` — upsert `in_progress` on load | Implement stub; add server-side upsert |
| SC2: Dashboard "continue" card | `app/page.tsx` — replace "Recommended start" card with real continue query | Replace static CTA with dynamic data |
| SC3: Progress bars reflect real % | `app/page.tsx`, `[pillarSlug]/page.tsx`, `[semesterSlug]/page.tsx`, `[courseSlug]/page.tsx` | Replace `progress={0}` with computed `percent` |
| SC4: Semester lock + override | `[pillarSlug]/page.tsx` — lock UI; `[semesterSlug]/page.tsx` — enforce lock; new migration for override storage | Add lock logic + new migration |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `auth.uid()` for RLS user identity | `current_setting('request.jwt.claims', true)::json->>'sub'` | Phase 1 | Must remain — Clerk JWTs don't set `auth.uid()` |
| Client-side data fetching (React Query / SWR) | Server Components (RSC) | Next.js 13+ | All progress reads stay server-side; only mutations are client-side |
| Separate INSERT then UPDATE for upsert | `.upsert()` with `onConflict` | Supabase JS v2 | Atomic — no race conditions on concurrent requests |

**Deprecated/outdated:**
- `router.push(router.asPath)` (Next.js pages router refresh pattern): replaced by `router.refresh()` in Next.js App Router. The App Router is what this project uses.

---

## Open Questions

1. **Where does HARDCODED_USER_ID live for client components?**
   - What we know: It's used server-side in existing code. Client components need it for `MarkCompleteButton`. Phase 4's Quiz.tsx used it via direct string in `createClerkSupabaseClient` flow — the JWT `sub` claim is the user_id, so the RLS enforces it automatically.
   - What's unclear: Is there an existing `constants.ts` or does the user_id need to be threaded via props?
   - Recommendation: Create `src/lib/constants.ts` exporting `HARDCODED_USER_ID`. Import in both server and client files as needed. For client-only access, use `process.env.NEXT_PUBLIC_HARDCODED_USER_ID` so it's available in the browser bundle.

2. **Should "in_progress" be set on lesson page load server-side or client-side?**
   - What we know: Server components run on every page request; a server-side upsert on lesson load is the cleanest approach and consistent with the RSC pattern. However, it adds ~100ms latency to the page render.
   - What's unclear: Is the latency acceptable? Could it be fire-and-forget?
   - Recommendation: Use a fire-and-forget server-side upsert (do not `await` the progress write in the critical render path — use `void` or structure it as a background task). Alternatively, trigger it from the client on mount to keep the server render fast.

3. **Manual semester unlock: column on semesters vs separate table?**
   - What we know: The requirement says "a manual override unlocks it." This implies it must persist.
   - What's unclear: Is the override user-scoped (per-user) or global (admin unlocks for everyone)?
   - Recommendation: Since this is a single-user platform, a `manually_unlocked BOOLEAN` column on `semesters` is simpler. A separate `semester_unlocks` user-scoped table is future-proof for multi-user (v2 AUTH). Plan for the column approach now; note it as a migration point if multi-user is added.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `supabase/migrations/00001_initial_schema.sql` — `progress` table schema, RLS policies, indexes confirmed
- Direct codebase inspection — `src/types/database.types.ts` — `Progress` row type, `LessonStatus` enum confirmed
- Direct codebase inspection — `src/components/lesson/MarkCompleteButton.tsx` — stub implementation confirmed
- Direct codebase inspection — `src/lib/supabase/client.ts`, `server.ts` — two-factory pattern confirmed
- Direct codebase inspection — all hierarchy pages — `ProgressBar` at `0%` with Phase 5 comments confirmed
- Direct codebase inspection — `.planning/STATE.md` — RLS auth gap documented for Phase 4 (same risk for Phase 5 progress writes)

### Secondary (MEDIUM confidence)

- `router.refresh()` pattern for RSC re-render after client mutation — established Next.js App Router documentation pattern; consistent with how Next.js 15/16 handles cache invalidation after mutations
- Supabase `.upsert()` with `onConflict` — core Supabase JS v2 API; stable across versions

### Tertiary (LOW confidence)

- None — all claims verified directly against codebase or well-established Next.js/Supabase documentation patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all libraries already installed and proven in prior phases
- Architecture: HIGH — patterns directly derived from existing codebase; schema confirmed deployed
- Pitfalls: HIGH — most pitfalls are documented in STATE.md from prior phases (RLS auth gap, router.refresh, N+1)

**Research date:** 2026-02-28
**Valid until:** 2026-04-28 (stable libraries; no fast-moving dependencies)
