# Phase 7: Verification + Code Cleanup - Research

**Researched:** 2026-03-01
**Domain:** Documentation verification, dead code removal, TypeScript import hygiene
**Confidence:** HIGH

---

## Summary

Phase 7 is a documentation and code hygiene phase — not a feature implementation phase. The implementation for PROG-01, PROG-02, and PROG-03 is fully complete and confirmed working by the integration checker. The gaps are: (1) Phase 5 never produced a VERIFICATION.md, so the audit chain is broken even though the code is correct; (2) one dead function (`createClerkSupabaseClient`) remains in the codebase after being superseded by the server actions pattern; and (3) one stale import (`getLessonProgressForScope`) was imported but never called in the dashboard page.

The VERIFICATION.md task is the most significant piece of work. Writing it correctly requires deeply understanding what was actually built in Phase 5 — the actual implementations differ from the Phase 5 plan in one key detail: `MarkCompleteButton` now calls a server action (`markLessonComplete` from `@/lib/actions/progress.ts`) rather than calling `createClerkSupabaseClient()` directly. This architectural deviation from the plan means the VERIFICATION.md must reflect the real code, not the original plan's intent. All pages use the `adminSupabase` client (not the JWT-authenticated server client) for progress reads, which is the pattern that actually ships.

The dead code removal and stale import fix are trivial single-line changes. The important constraint is that removing `createClerkSupabaseClient` from `src/lib/supabase/client.ts` must also remove the `useSession` import from Clerk, since that import is only there to support the dead function. After removal the file either has new content or can be deleted entirely depending on whether any other exports remain in it — checking first is critical.

**Primary recommendation:** One plan (07-01) covering all three tasks in sequence: (1) remove dead code and stale import, (2) write 05-VERIFICATION.md from actual code evidence, (3) verify TypeScript compiles cleanly. No new dependencies. No schema changes.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROG-01 | User's lesson progress (not_started/in_progress/completed) is tracked and persisted | Implementation confirmed in `src/lib/progress.ts` (`markLessonInProgress`) + `src/lib/actions/progress.ts` (`markLessonComplete`). VERIFICATION.md must document the actual wiring: lesson page fires `markLessonInProgress` on load; `MarkCompleteButton` calls `markLessonComplete` server action. |
| PROG-02 | User can see progress rings/bars at pillar and course levels | Implementation confirmed in all four hierarchy pages: `src/app/page.tsx` (pillar cards with real progress %), `src/app/pillars/[pillarSlug]/page.tsx` (overall pillar progress bar), `src/app/pillars/.../semesters/[semesterSlug]/page.tsx` (per-course progress bars), `src/app/pillars/.../courses/[courseSlug]/page.tsx` (course progress bar + lesson status icons). VERIFICATION.md must document these wiring points. |
| PROG-03 | Semesters unlock when previous semester is completed, with manual override | Implementation confirmed: `isSemesterLocked()` pure function in `src/lib/progress.ts`; `manually_unlocked` boolean on semesters table (migration `00003_semester_unlock.sql`); lock enforced at both pillar page (non-clickable div) and semester page (locked UI rendered instead of course content). VERIFICATION.md must document both enforcement points and the manual override mechanism. |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | Already installed | Type checking after dead code removal | Already project standard; `npx tsc --noEmit` is the verification command |
| Next.js RSC + Server Actions | 16.1.6 (installed) | Pattern already used — no changes to architecture | The server action pattern (`'use server'`) is what Phase 5 actually shipped |

### Supporting

None required. Phase 7 introduces no new dependencies.

**Installation:**
```bash
# No new dependencies required for Phase 7
```

---

## Architecture Patterns

### What Phase 5 Actually Built (vs. Original Plan)

The Phase 5 plan specified that `MarkCompleteButton` would call `createClerkSupabaseClient()` directly for its progress upsert. The actual implementation in Phase 5 (commits `e7f37dc` and `0e0b4ce`) took a different path: the button calls a **Next.js server action** (`markLessonComplete` from `src/lib/actions/progress.ts`) which uses `createAdminSupabaseClient()`. This is the correct production pattern (bypasses RLS auth gap) and is what the VERIFICATION.md must reflect.

**Actual data flow for PROG-01:**
```
User opens lesson page
  → RSC page.tsx calls markLessonInProgress(adminSupabase, lesson.id, HARDCODED_USER_ID)
    → progress.ts: checks existing status, upserts in_progress if not already completed
  → RSC page.tsx queries progress status for initialCompleted prop
  → MarkCompleteButton renders with initialCompleted={isLessonCompleted}

User clicks "Mark as Complete"
  → MarkCompleteButton calls markLessonComplete(lessonId) [server action]
    → actions/progress.ts: adminSupabase.from('progress').upsert({status: 'completed', ...})
  → router.refresh() triggers RSC re-render
  → Progress bars update across all hierarchy pages
```

**Actual data flow for PROG-02 (pillar level):**
```
Dashboard page.tsx
  → Batches all semesters + courses + lessons in 3 queries
  → Single adminSupabase progress query with .in('lesson_id', allLessonIds)
  → Computes progress in-memory via Set intersection
  → Passes real progress/lessonCount to PillarCard

Pillar page.tsx
  → Fetches semesters → courses → lessons for the pillar (3 batched queries)
  → Single adminSupabase progress query for all pillar lesson IDs
  → Computes per-semester progress via Set intersection
  → Renders ProgressBar with real pillarPercent

Semester page.tsx
  → Fetches all sibling semesters (for lock check) + current semester courses + lessons
  → Two adminSupabase progress queries (sibling progress for lock, current semester for display)
  → Renders per-course ProgressBar with real percentages
  → Renders locked state if isSemesterLocked() returns true

Course page.tsx
  → getLessonStatuses + getLessonProgressForScope in parallel (Promise.all)
  → LessonStatusIcon shows not_started/in_progress/completed per lesson
  → Course ProgressBar shows aggregate completion
```

**Actual data flow for PROG-03:**
```
isSemesterLocked(semesterIndex, semesterProgressList, semester.manually_unlocked) — pure function
  → semesterIndex === 0 → always unlocked (first semester)
  → semester.manually_unlocked === true → unlocked regardless of predecessor
  → semesterProgressList[semesterIndex - 1].percent < 100 → locked

Enforcement points:
  1. Pillar page: locked semesters render as non-clickable div with padlock SVG
  2. Semester page: locked semester renders locked UI card (padlock + "Complete X first" + back link)
     Server enforces this — direct URL navigation still shows locked UI

Manual override: SET semesters.manually_unlocked = true in DB → semester unlocks without completing predecessor
```

### Key Architectural Deviation from Plan

The Phase 5 research and plan specified using `createClerkSupabaseClient()` in `MarkCompleteButton` for the progress mutation. The executed code uses a server action with `createAdminSupabaseClient()` instead. This matters because:

1. The VERIFICATION.md must verify what was **built**, not what was **planned**
2. The dead code analysis is correct: `createClerkSupabaseClient` is dead because the server action pattern replaced it
3. The `getLessonProgressForScope` stale import in `page.tsx` occurred because the dashboard's in-memory computation approach superseded the helper function call

### Dead Code: createClerkSupabaseClient

**Current state of `src/lib/supabase/client.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js'
import { useSession } from '@clerk/nextjs'
import type { Database } from '@/types/database.types'

export function createClerkSupabaseClient() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { session } = useSession()

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => session?.getToken() ?? null,
    }
  )
}
```

This file exports only `createClerkSupabaseClient`. If the function is removed, the file has no exports. The correct action is to **delete the entire file** rather than leave an empty module. Before deletion, confirm no other file imports from `@/lib/supabase/client`.

**Verification grep before deletion:**
```bash
grep -r "from '@/lib/supabase/client'" src/ --include="*.ts" --include="*.tsx"
grep -r "from \"@/lib/supabase/client\"" src/ --include="*.ts" --include="*.tsx"
```

Expected result: zero matches (the function is unused). If matches are found, trace them before deleting.

### Stale Import: getLessonProgressForScope in page.tsx

**Current state of `src/app/page.tsx` line 3:**
```typescript
import { getContinueLesson, getLessonProgressForScope } from '@/lib/progress'
```

`getLessonProgressForScope` is imported but never called in `page.tsx`. The dashboard computes pillar progress via in-memory Set intersection, not via the `getLessonProgressForScope` helper. The fix is to remove the unused import from the import statement, keeping `getContinueLesson` which IS used.

**Fixed import:**
```typescript
import { getContinueLesson } from '@/lib/progress'
```

This is a one-character-to-one-line change. TypeScript strict mode (`noUnusedLocals` or the equivalent `@typescript-eslint/no-unused-vars` rule) may already be flagging this — but since the project uses `npx tsc --noEmit` as the primary check, it will only error if the tsconfig has `noUnusedLocals: true`. Check before assuming the build is clean.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Proving implementation correctness | Custom test scripts | Code reading + grep verification (same as other VERIFICATION.md files in this project) | Existing pattern: all 4 prior VERIFICATION.md files verify by reading code and checking imports, not running tests |
| VERIFICATION.md format | New format | Follow exact format of `04-VERIFICATION.md` (most recent prior art) | Consistency is the goal — auditor expects the same structure |

**Key insight:** This phase is documentation catch-up, not implementation. The entire project pattern for VERIFICATION.md is: read code, verify imports and wiring, document observable truths, note what requires human verification. Follow this pattern exactly.

---

## Common Pitfalls

### Pitfall 1: Verifying the Plan Instead of the Code

**What goes wrong:** Writing the VERIFICATION.md based on what the Phase 5 plan said would be built instead of verifying the actual code. The plan said `MarkCompleteButton` would call `createClerkSupabaseClient()` — the code actually calls a server action.

**Why it happens:** The plan documents are more prominent than the actual source files when rushing.

**How to avoid:** Read the source files directly before writing any verification claims. The key files are:
- `src/components/lesson/MarkCompleteButton.tsx` — uses server action, NOT browser client
- `src/lib/actions/progress.ts` — the actual mutation implementation
- `src/lib/progress.ts` — the helper functions
- `src/app/page.tsx` — dashboard page (stale import here)
- `src/app/pillars/[pillarSlug]/page.tsx` — pillar progress
- `src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/page.tsx` — semester lock enforcement
- `src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/courses/[courseSlug]/page.tsx` — course progress + lesson status icons

**Warning signs:** VERIFICATION.md mentions `createClerkSupabaseClient` as the mutation mechanism (it was superseded).

---

### Pitfall 2: Deleting client.ts Without Checking for Imports

**What goes wrong:** Deleting `src/lib/supabase/client.ts` and then discovering another file imports from it, causing a build error.

**Why it happens:** The audit confirmed `createClerkSupabaseClient` is dead code, but the audit may not have checked every possible import path (e.g., dynamic imports, re-exports in barrel files).

**How to avoid:** Run the grep check before deleting. Also check `src/index.ts` or any barrel exports.

**Warning signs:** After deletion, `npx tsc --noEmit` reports "Cannot find module '@/lib/supabase/client'".

---

### Pitfall 3: Breaking the 05-VERIFICATION.md Audit Chain

**What goes wrong:** Writing a VERIFICATION.md that marks requirements as SATISFIED when there is actually a known gap (e.g., quiz_attempts RLS gap documented in Phase 4, admin client bypass of RLS for progress writes).

**Why it happens:** Wanting to close all gaps cleanly.

**How to avoid:** Document honestly. Phase 4's VERIFICATION.md shows the correct pattern — QUIZ-03 is marked "SATISFIED (with auth gap)" and the auth gap is documented clearly. Phase 5's VERIFICATION.md should similarly note that progress writes use `createAdminSupabaseClient` which bypasses RLS. This is a known single-user design choice, not a defect, but it must be documented accurately.

---

### Pitfall 4: Writing Incorrect Evidence for Observable Truths

**What goes wrong:** Citing wrong file/line numbers or incorrect function signatures in the VERIFICATION.md evidence column.

**Why it happens:** Writing from memory or from the plan rather than from the actual source.

**How to avoid:** Every evidence citation in the VERIFICATION.md must be verified against the actual file. Use line numbers from the files read during research.

---

### Pitfall 5: Leaving noUnusedLocals Errors Unaddressed

**What goes wrong:** The stale import removal fixes the logical issue but `npx tsc --noEmit` still fails if `noUnusedLocals` is enabled in `tsconfig.json`.

**Why it happens:** The import was already there before Phase 7 started, so the build may have been failing silently or the tsconfig may not have `noUnusedLocals: true`.

**How to avoid:** Check `tsconfig.json` for `noUnusedLocals`. Run `npx tsc --noEmit` both before and after the change to document the baseline.

---

## Code Examples

### Dead Code Removal: File to Delete

Current file at `src/lib/supabase/client.ts` — the entire file should be deleted if grep confirms zero imports. File content for reference:

```typescript
// THIS FILE SHOULD BE DELETED
// createClerkSupabaseClient was superseded by server actions in Phase 5
// No imports of this function exist anywhere in the codebase
import { createClient } from '@supabase/supabase-js'
import { useSession } from '@clerk/nextjs'
import type { Database } from '@/types/database.types'

export function createClerkSupabaseClient() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { session } = useSession()

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => session?.getToken() ?? null,
    }
  )
}
```

### Stale Import Fix: Before and After

Before (line 3 of `src/app/page.tsx`):
```typescript
import { getContinueLesson, getLessonProgressForScope } from '@/lib/progress'
```

After:
```typescript
import { getContinueLesson } from '@/lib/progress'
```

### VERIFICATION.md Observable Truths Checklist for Phase 5

The VERIFICATION.md must verify these truths (drawn from Phase 5 success criteria and confirmed by code reading):

| # | Truth | Key Evidence Location |
|---|-------|-----------------------|
| 1 | Lesson status (not_started/in_progress/completed) updates and persists | `markLessonInProgress` in `progress.ts`; `markLessonComplete` server action in `actions/progress.ts`; lesson page `page.tsx` calls both |
| 2 | Dashboard shows "continue" card pointing to most recently accessed incomplete lesson | `getContinueLesson` called at dashboard `page.tsx`; conditional rendering of continue card vs. recommended start CTA |
| 3 | Progress bars reflect real completion % at pillar and course levels | `pillarPercent` computed in pillar `page.tsx`; `courseProgress.percent` from `getLessonProgressForScope` in course `page.tsx`; `ProgressBar` rendered with real values |
| 4 | Semester N+1 is locked until Semester N is completed; manual override works | `isSemesterLocked()` called in both pillar and semester pages; pillar page renders locked div; semester page renders locked UI; `semester.manually_unlocked` used as override |
| 5 | MarkCompleteButton shows loading state during save and error message on failure | `MarkCompleteButton.tsx`: `isLoading` state, spinner SVG, `setErrorMessage` on catch, `<p role="alert">` error display |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Browser Supabase client (createClerkSupabaseClient) for progress mutations | Server action with admin client (markLessonComplete) | Phase 5 execution | Bypasses RLS auth gap that blocked quiz_attempts writes in Phase 4 |
| getLessonProgressForScope helper for dashboard pillar progress | In-memory Set intersection of fetched data | Phase 5 execution | Avoids extra DB round trips; helper still used in semester and course pages |

**Deprecated/outdated:**
- `createClerkSupabaseClient` in `src/lib/supabase/client.ts`: replaced entirely by server actions pattern. The function used `useSession()` from Clerk to get a JWT and pass it to Supabase — this approach was used in Phase 4 Quiz component but abandoned in Phase 5 when server actions became the mutation pattern.

---

## Open Questions

1. **Does `src/lib/supabase/client.ts` have any imports from any file?**
   - What we know: The audit reports `createClerkSupabaseClient` is never imported. Direct reading of the file confirms it only exports one function.
   - What's unclear: Whether any barrel/index file re-exports from this path.
   - Recommendation: Run `grep -r "supabase/client" src/` before deletion. Expected: zero matches beyond the file itself.

2. **Does `tsconfig.json` have `noUnusedLocals: true`?**
   - What we know: The project uses TypeScript strict mode. The stale import has been in `page.tsx` since Phase 5 without breaking the build (05-02-SUMMARY notes `npx tsc --noEmit — PASSED`).
   - What's unclear: Whether strict mode includes `noUnusedLocals` in this project's tsconfig.
   - Recommendation: Check `tsconfig.json`. If `noUnusedLocals` is off, the stale import was silently tolerated. Removing it is still correct hygiene.

3. **Does `05-VERIFICATION.md` need to flag the admin client RLS bypass as a gap?**
   - What we know: All progress reads and writes now use `createAdminSupabaseClient()` (bypasses RLS). This was a deliberate decision to work around the Clerk auth gap (single-user platform). Phase 4 VERIFICATION.md documented the analogous gap for quiz_attempts as "SATISFIED (with auth gap)".
   - What's unclear: Whether to mark PROG-01/02/03 as "SATISFIED" or "SATISFIED (with auth gap)".
   - Recommendation: Mark as "SATISFIED" since progress writes DO work correctly for the single user — the admin bypass is the intentional architecture for this phase, not a defect. Add a note that RLS enforcement requires Clerk sign-in UI (Phase v2 AUTH feature). This is consistent with how Phase 1's VERIFICATION.md handled the INFR-01 human verification items.

---

## Validation Architecture

The `workflow.nyquist_validation` field is not present in `.planning/config.json` — the config uses `workflow.verifier: true` which maps to the GSD verifier agent pattern, not the Nyquist testing pattern. Skip Validation Architecture section.

---

## Implementation Scope for Planning

Phase 7 is a single-plan phase. All four success criteria can be addressed in one atomic plan:

| Success Criterion | Files | Change Type | Estimated Effort |
|-------------------|-------|-------------|-----------------|
| SC1: Phase 5 VERIFICATION.md | `.planning/phases/05-progress-dashboard/05-VERIFICATION.md` (NEW) | Documentation | Substantial — requires reading all 7 Phase 5 source files and writing thorough verification |
| SC2: Remove createClerkSupabaseClient | `src/lib/supabase/client.ts` (DELETE) | Dead code removal | Trivial — delete file after grep check |
| SC3: Remove stale getLessonProgressForScope import | `src/app/page.tsx` line 3 | Single-line edit | Trivial |
| SC4: Re-audit returns "satisfied" | Implicit — flows from SC1-SC3 | N/A | Automatic once SC1-SC3 done |

**Recommended task order within the plan:**
1. Grep check: confirm zero imports of `@/lib/supabase/client` (safety check)
2. Delete `src/lib/supabase/client.ts`
3. Fix stale import in `src/app/page.tsx`
4. Run `npx tsc --noEmit` — confirm clean compile
5. Write `05-VERIFICATION.md` from code evidence
6. Run `npx tsc --noEmit` again — confirm still clean

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `src/lib/supabase/client.ts` — dead code confirmed, single export `createClerkSupabaseClient`, `useSession` import present
- Direct codebase inspection — `src/app/page.tsx` — line 3 stale import confirmed: `getLessonProgressForScope` imported but never called in the file body
- Direct codebase inspection — `src/components/lesson/MarkCompleteButton.tsx` — uses server action `markLessonComplete`, not `createClerkSupabaseClient`; `router.refresh()` present; error state with `role="alert"` present
- Direct codebase inspection — `src/lib/actions/progress.ts` — server action `markLessonComplete` uses `createAdminSupabaseClient`, upsert with `onConflict` pattern
- Direct codebase inspection — `src/lib/progress.ts` — all 5 exported functions: `getLessonProgressForScope`, `getContinueLesson`, `markLessonInProgress`, `isSemesterLocked`, `getLessonStatuses`
- Direct codebase inspection — `src/app/pillars/[pillarSlug]/page.tsx` — real pillar progress via batched queries + Set intersection; `isSemesterLocked` enforced; locked semesters render as non-clickable div
- Direct codebase inspection — `src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/page.tsx` — semester lock enforced at page level with full locked UI; per-course progress bars wired
- Direct codebase inspection — `src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/courses/[courseSlug]/page.tsx` — `LessonStatusIcon` component; `Promise.all` for parallel progress queries
- Direct codebase inspection — `src/app/page.tsx` — `getContinueLesson` wired; pillar progress via in-memory Set intersection
- Direct codebase inspection — `.planning/v1.0-MILESTONE-AUDIT.md` — gap analysis confirmed: PROG-01 partial, PROG-02 unsatisfied, PROG-03 partial (all verification gaps, not implementation gaps)
- Direct codebase inspection — `.planning/phases/04-quiz-engine/04-VERIFICATION.md` — reference format for VERIFICATION.md structure (Observable Truths table, Required Artifacts, Key Link Verification, Requirements Coverage, Human Verification)
- Direct codebase inspection — `.planning/phases/05-progress-dashboard/05-01-SUMMARY.md` and `05-02-SUMMARY.md` — commit hashes, files modified, decisions made during Phase 5

### Secondary (MEDIUM confidence)

None — all findings verified directly from source code.

### Tertiary (LOW confidence)

None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all changes are code deletion and documentation writing
- Architecture: HIGH — all Phase 5 patterns verified directly from source files
- Pitfalls: HIGH — derived directly from code reading and comparison of plan vs. actual implementation

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable — no fast-moving dependencies; only relevant if Phase 5 code changes)
