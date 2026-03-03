---
phase: 09-fsrs-data-layer
verified: 2026-03-02T00:00:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 09: FSRS Data Layer Verification Report

**Phase Goal:** FSRS card state lives in Supabase and review cards are automatically created when a lesson is completed
**Verified:** 2026-03-02
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `fsrs_cards` and `fsrs_review_logs` tables exist in Supabase with correct schema and RLS policies | VERIFIED | `supabase/migrations/00004_fsrs_tables.sql` defines both tables with all required fields (due, stability, difficulty, state, reps, lapses) plus additional ts-fsrs v5 field `learning_steps`; 5 RLS policies using Clerk JWT sub claim |
| 2 | `fsrs_review_logs` is an append-only audit log with RLS policies | VERIFIED | No `updated_at` trigger on `fsrs_review_logs`; TypeScript `Update: never` enforces immutability; 2 RLS policies (SELECT + INSERT only — no UPDATE/DELETE) |
| 3 | `ts-fsrs` is installed as a production dependency | VERIFIED | `package.json` `dependencies` section contains `"ts-fsrs": "^5.2.3"` (not devDependencies) |
| 4 | TypeScript types for `fsrs_cards` and `fsrs_review_logs` exist with `FsrsCardState` and `FsrsRating` | VERIFIED | `src/types/database.types.ts` lines 48-49 define union types; lines 577-700 define full Row/Insert/Update; lines 898-899 define `FsrsCard` and `FsrsReviewLog` aliases |
| 5 | Completing a lesson causes quiz questions to appear as new rows in `fsrs_cards` | VERIFIED | `markLessonComplete()` in `progress.ts` queries `quiz_questions` post-progress-write and upserts one `fsrs_cards` row per active question using `createEmptyCard(now)` |
| 6 | Re-completing a lesson does not duplicate or reset existing `fsrs_cards` rows | VERIFIED | `upsert(..., { onConflict: 'user_id,question_id', ignoreDuplicates: true })` — idempotent by design |
| 7 | `submitFsrsReview()` increments `reps` and advances `due` date via ts-fsrs scheduling | VERIFIED | `fsrs.ts` fetches card, reconstructs ts-fsrs `Card` object (including `learning_steps`), calls `f.next(fsrsCard, now, grade)`, updates `reps`/`due`/`stability`/`difficulty`/`state`, inserts review log |
| 8 | `getDueCardCount()` returns 0 when none due and positive integer when cards are seeded | VERIFIED | Uses `.select('*', { count: 'exact', head: true }).lte('due', now)` — returns `count ?? 0`; returns 0 on auth failure |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/00004_fsrs_tables.sql` | fsrs_cards + fsrs_review_logs tables with indexes, RLS, and updated_at trigger | VERIFIED | 118 lines; 2 CREATE TABLEs, 5 indexes, 1 trigger (fsrs_cards only), 5 RLS policies |
| `src/types/database.types.ts` | FsrsCardState, FsrsRating types and fsrs_cards/fsrs_review_logs table type definitions | VERIFIED | Both union types present; full Row/Insert/Update definitions; FsrsCard and FsrsReviewLog aliases at lines 898-899 |
| `package.json` | ts-fsrs production dependency | VERIFIED | `"ts-fsrs": "^5.2.3"` in `dependencies` (not `devDependencies`) |
| `src/lib/actions/progress.ts` | markLessonComplete() extended with FSRS card seeding via upsert | VERIFIED | Imports `createEmptyCard` from ts-fsrs; seeds cards after progress write; non-fatal on error |
| `src/lib/actions/fsrs.ts` | submitFsrsReview() and getDueCardCount() server actions | VERIFIED | Both functions exported; `'use server'` directive present; auth guards on both functions |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `supabase/migrations/00004_fsrs_tables.sql` | `quiz_questions` table | `fsrs_cards.question_id REFERENCES quiz_questions(id)` | WIRED | Line 24: `REFERENCES quiz_questions(id)` |
| `supabase/migrations/00004_fsrs_tables.sql` | `lessons` table | `fsrs_cards.lesson_id REFERENCES lessons(id)` | WIRED | Line 25: `REFERENCES lessons(id)` |
| `src/types/database.types.ts` | `supabase/migrations/00004_fsrs_tables.sql` | TypeScript types mirror SQL schema exactly | WIRED | `fsrs_cards` Row type matches all SQL columns including `learning_steps`; `fsrs_review_logs` Update typed as `never` |
| `src/lib/actions/progress.ts` | `fsrs_cards` table | upsert with onConflict user_id,question_id and ignoreDuplicates: true | WIRED | Line 64: `.from('fsrs_cards').upsert(cardRows, { onConflict: 'user_id,question_id', ignoreDuplicates: true })` |
| `src/lib/actions/progress.ts` | `ts-fsrs` | imports createEmptyCard for initial card state | WIRED | Line 5: `import { createEmptyCard } from 'ts-fsrs'` |
| `src/lib/actions/fsrs.ts` | `ts-fsrs` | imports fsrs, Grade for scheduling math | WIRED | Lines 3-4: `import { fsrs } from 'ts-fsrs'` + `import type { Grade } from 'ts-fsrs'` |
| `src/lib/actions/fsrs.ts` | `fsrs_cards` table | reads card, computes next state, updates card row | WIRED | Lines 29, 66, 125: three `.from('fsrs_cards')` calls (select, update, count) |
| `src/lib/actions/fsrs.ts` | `fsrs_review_logs` table | inserts ReviewLog after each rating | WIRED | Line 89: `.from('fsrs_review_logs').insert(...)` with all ReviewLog fields |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FSRS-01 | 09-01-PLAN.md | `review_cards` table (named `fsrs_cards` per ROADMAP) in Supabase with FSRS card state fields and RLS policies | SATISFIED | Migration `00004_fsrs_tables.sql` creates `fsrs_cards` with all required fields (due, stability, difficulty, state, reps, lapses) + RLS policies. Note: REQUIREMENTS.md uses stale name `review_cards` — ROADMAP.md and research doc both canonically specify `fsrs_cards`. No functional gap. |
| FSRS-02 | 09-02-PLAN.md | Review cards are auto-seeded from quiz questions when a lesson is completed | SATISFIED | `markLessonComplete()` extended in `progress.ts` with idempotent upsert of one `fsrs_cards` row per active quiz question |

**Note on FSRS-01 table name:** REQUIREMENTS.md line 18 says "`review_cards` table" but this is a stale label. The ROADMAP.md success criteria (the authoritative source) explicitly specifies "`fsrs_cards` and `fsrs_review_logs` tables." The research document (09-RESEARCH.md line 27) also acknowledges this: "FSRS-01: `review_cards` table (actually named `fsrs_cards` per roadmap)." No orphaned requirements were found — FSRS-01 and FSRS-02 are the only Phase 9 requirements and both are covered by the two plans.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None detected | — | — |

Checks run:
- No TODO/FIXME/PLACEHOLDER comments found in any of the 4 modified files
- No stub return patterns (`return null`, `return {}`, `return []`) found
- No `'use client'` in server action files
- No `auth.uid()` in migration (uses `current_setting('request.jwt.claims', true)::json->>'sub'` correctly)
- No `FOR ALL` policy (the one match is a comment prohibiting it)
- `fsrs_review_logs` correctly has no UPDATE trigger and `Update: never` TypeScript type
- TypeScript compilation: `npx tsc --noEmit` passes with zero errors

---

### Human Verification Required

#### 1. Migration Applied to Supabase

**Test:** Run `pnpm db:push` or apply `supabase/migrations/00004_fsrs_tables.sql` via the Supabase dashboard SQL editor. Then inspect the `fsrs_cards` and `fsrs_review_logs` tables in the Supabase table editor.
**Expected:** Both tables exist with the correct columns, indexes, and RLS policies visible.
**Why human:** The migration file exists and is syntactically correct, but whether it has been applied to the actual Supabase project cannot be verified programmatically from the local codebase.

#### 2. End-to-End Card Seeding on Lesson Completion

**Test:** Complete a lesson that has quiz questions. Query the `fsrs_cards` table directly (`SELECT * FROM fsrs_cards WHERE user_id = '<your-clerk-id>' LIMIT 10`).
**Expected:** One row per quiz question in the lesson, all with `state = 0` (New), `reps = 0`, and `due` approximately equal to the time of completion.
**Why human:** Server action logic is correctly wired but runtime execution against a live Supabase instance cannot be verified without running the app.

#### 3. submitFsrsReview() Increments reps

**Test:** Call `submitFsrsReview({ cardId: '<id>', rating: 3 })` on a card with `reps = 0`. Then query `SELECT reps, due, stability FROM fsrs_cards WHERE id = '<id>'`.
**Expected:** `reps = 1`, `due` advanced by the FSRS-computed interval (e.g., 1-4 days for Good on a new card), `stability > 0`.
**Why human:** ts-fsrs scheduling math runs server-side; confirming the output requires querying the live database after a real review submission.

#### 4. getDueCardCount() Returns Correct Values

**Test:** Call `getDueCardCount()` with no cards seeded (should return 0). Then complete a lesson (cards seeded with `due = now`), call again (should return > 0).
**Expected:** 0 before seeding, positive integer equal to the number of quiz questions in the completed lesson.
**Why human:** Requires running the server actions against a live database with known test data.

---

### Gaps Summary

No gaps found. All 8 observable truths verified, all 5 required artifacts exist and are substantive, all 8 key links are wired, and both phase requirements (FSRS-01, FSRS-02) are satisfied.

The only open items are the 4 human verification tests above, which require a live Supabase instance and cannot be verified by static analysis. These tests would confirm runtime behavior of the migration, card seeding, review scheduling, and due-count query.

One informational note: `learning_steps` is not included in the card rows built in `progress.ts` (the seeding code omits it intentionally). This is correct — the SQL column has `DEFAULT 0` and the TypeScript `Insert` type marks it `learning_steps?: number`, so the database supplies the default. TypeScript compilation confirms no type error.

---

*Verified: 2026-03-02*
*Verifier: Claude (gsd-verifier)*
