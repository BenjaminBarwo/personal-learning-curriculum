---
phase: 08-clerk-auth-wiring
verified: 2026-03-02T19:00:00Z
status: passed
score: 3/3 must-haves verified
re_verification: false
human_verification:
  - test: "Visit a protected route while signed out (e.g., /dashboard or /pillars/any-slug) in a browser"
    expected: "Browser redirects to /sign-in and shows the Clerk SignIn widget"
    why_human: "Middleware redirect behavior requires a live HTTP request with a real Clerk session cookie absent — cannot verify statically"
  - test: "Complete sign-in via the Clerk widget at /sign-in"
    expected: "Browser lands on /dashboard (URL bar shows /dashboard, not /)"
    why_human: "Post-auth redirect destination requires an actual Clerk sign-in flow and NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL to be honoured at runtime"
  - test: "Complete a lesson as a signed-in user, then inspect the Supabase progress table"
    expected: "The user_id column contains the real Clerk userId (e.g., user_...) — not a hardcoded string"
    why_human: "Supabase table contents require a live database query or dashboard inspection; cannot verify from codebase alone"
---

# Phase 8: Clerk Auth Wiring Verification Report

**Phase Goal:** Users are authenticated via Clerk — protected routes redirect unauthenticated visitors to /sign-in, and the platform uses the real Clerk userId everywhere
**Verified:** 2026-03-02T19:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                             | Status     | Evidence                                                                                          |
|----|--------------------------------------------------------------------------------------------------|------------|--------------------------------------------------------------------------------------------------|
| 1  | Unauthenticated user visiting any non-public route is redirected to /sign-in                     | VERIFIED   | `src/middleware.ts` uses `createRouteMatcher` + `auth.protect()`; `/sign-in(.*)` is the only public route |
| 2  | The /sign-in page renders the Clerk SignIn component and is publicly accessible                   | VERIFIED   | `src/app/sign-in/[[...sign-in]]/page.tsx` imports and renders `<SignIn />` from `@clerk/nextjs`; route is excluded from protection |
| 3  | After signing in, the user lands on /dashboard — not the root /                                  | VERIFIED   | `.env.local` has `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard`; `src/app/page.tsx` issues a server-side `redirect('/dashboard')` |

**Score:** 3/3 truths verified

---

## Required Artifacts

| Artifact                                                                | Expected                                              | Status     | Details                                                                                          |
|-------------------------------------------------------------------------|------------------------------------------------------|------------|--------------------------------------------------------------------------------------------------|
| `src/middleware.ts`                                                     | Route protection via clerkMiddleware + createRouteMatcher + auth.protect() | VERIFIED | Contains `createRouteMatcher`, async callback, `auth.protect()`. `/sign-in(.*)` is the only public route. |
| `src/app/sign-in/[[...sign-in]]/page.tsx`                              | Clerk SignIn component page                           | VERIFIED   | Imports `SignIn` from `@clerk/nextjs`; renders inside centering wrapper; 9 lines, substantive.   |
| `.env.local`                                                            | Clerk redirect URL configuration                      | VERIFIED   | Contains `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard` |
| `.env.example`                                                          | Env var documentation for sign-in URLs               | VERIFIED   | Documents both `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` |
| `src/app/dashboard/page.tsx`                                            | Dashboard page at /dashboard route                   | VERIFIED   | Full `DashboardPage` component (217 lines) moved from root; uses `await auth()` + null guard; real userId passed to all Supabase queries |
| `src/lib/actions/progress.ts`                                           | Server actions using real Clerk userId for progress writes | VERIFIED | Both `markLessonComplete` and `persistQuizAttempt` call `await auth()` + unauthorized guard; `userId` passed as `user_id` to Supabase upsert/insert |

**Additional artifacts verified (Task 2):**

| Artifact                                                                          | Status     | Details                                                      |
|-----------------------------------------------------------------------------------|------------|--------------------------------------------------------------|
| `src/app/page.tsx`                                                                | VERIFIED   | Replaced with `redirect('/dashboard')` — 5 lines, server-side 307 |
| `src/app/pillars/[pillarSlug]/page.tsx`                                          | VERIFIED   | `await auth()` + null guard; `userId` in `.eq('user_id', userId)` on line 94 |
| `src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/page.tsx`                | VERIFIED   | `await auth()` + null guard; `userId` in 3 Supabase `.eq()` calls (lines 99, 143, 172) |
| `src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/courses/[courseSlug]/page.tsx` | VERIFIED | `await auth()` + null guard; `userId` in 2 `getLessonStatuses` / `getLessonProgressForScope` calls |
| `src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/courses/[courseSlug]/lessons/[lessonSlug]/page.tsx` | VERIFIED | `await auth()` + null guard; `userId` in `markLessonInProgress`, `.eq('user_id', userId)` progress query |
| `src/constants/user.ts`                                                           | VERIFIED DELETED | File does not exist — confirmed by `ls` returning no match |

---

## Key Link Verification

| From                                              | To                                  | Via                                                              | Status   | Details                                                                 |
|---------------------------------------------------|-------------------------------------|------------------------------------------------------------------|----------|-------------------------------------------------------------------------|
| `src/middleware.ts`                               | `NEXT_PUBLIC_CLERK_SIGN_IN_URL`     | `auth.protect()` redirects to this URL for unauthenticated users | WIRED    | `auth.protect()` present on line 9; `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` in `.env.local` |
| `src/app/sign-in/[[...sign-in]]/page.tsx`        | `@clerk/nextjs`                     | imports SignIn component                                          | WIRED    | `import { SignIn } from '@clerk/nextjs'` on line 1; `<SignIn />` rendered |
| `src/lib/actions/progress.ts`                     | `supabase.progress table`           | `auth().userId` passed as `user_id` in upsert                   | WIRED    | `await auth()` on lines 7 and 41; `user_id: userId` in both upsert and insert operations |

---

## Requirements Coverage

| Requirement | Source Plan   | Description                                               | Status     | Evidence                                                                          |
|-------------|---------------|-----------------------------------------------------------|------------|-----------------------------------------------------------------------------------|
| AUTH-01     | 08-01-PLAN.md | User can sign in via Clerk sign-in page at /sign-in       | SATISFIED  | `src/app/sign-in/[[...sign-in]]/page.tsx` exists with `<SignIn />` component; route is public |
| AUTH-02     | 08-01-PLAN.md | Unauthenticated user is redirected to /sign-in from any protected route | SATISFIED | `createRouteMatcher(['/sign-in(.*)'])` + `auth.protect()` in middleware; all non-sign-in routes are protected |
| AUTH-03     | 08-01-PLAN.md | User is redirected to /dashboard after successful sign-in | SATISFIED  | `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard` in `.env.local`; `src/app/page.tsx` redirects `/` to `/dashboard`; `/dashboard` route exists |

All three requirements (AUTH-01, AUTH-02, AUTH-03) are satisfied. No orphaned requirements — REQUIREMENTS.md traceability table maps all three exclusively to Phase 8 with status "Complete".

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | None found |

No TODO/FIXME/PLACEHOLDER comments, no stub implementations, no empty handlers, no hardcoded user ID strings found in any phase-8 modified files.

**HARDCODED_USER_ID scan result:** PASS — zero occurrences in `src/`
**`src/constants/user.ts` existence:** PASS — file deleted
**TypeScript compile (`npx tsc --noEmit`):** PASS — zero errors

---

## Human Verification Required

### 1. Protected route redirect to /sign-in

**Test:** Open an incognito browser window. Without signing in, navigate to `http://localhost:3000/dashboard`
**Expected:** Browser redirects to `/sign-in` and displays the Clerk SignIn widget (email/password and/or social login options)
**Why human:** Middleware redirect requires a live HTTP request with no Clerk session cookie. Static analysis confirms `auth.protect()` is called but cannot simulate the actual redirect.

### 2. Post-sign-in redirect to /dashboard

**Test:** From the /sign-in page, complete the sign-in flow with a valid Clerk account
**Expected:** After authentication, browser lands on `/dashboard` (URL bar shows `/dashboard`), not the root `/`
**Why human:** The FORCE_REDIRECT_URL is set correctly in `.env.local`, but honouring it requires an actual Clerk authentication handshake at runtime.

### 3. Real Clerk userId in Supabase progress table

**Test:** As an authenticated user, complete a lesson by clicking "Mark as Complete". Then inspect the Supabase `progress` table (via the Supabase dashboard or SQL: `SELECT user_id FROM progress ORDER BY completed_at DESC LIMIT 5`)
**Expected:** The `user_id` column contains a Clerk userId string (format: `user_XXXXXXXXXXXXXXXXXXXXXXXXXXXX`), not a hardcoded string
**Why human:** Server action writes to Supabase with the real `userId` — the code path is verified correct, but the actual data persisted requires inspecting the live database.

---

## Commits Verified

| Commit   | Description                                                        | Files Changed |
|----------|--------------------------------------------------------------------|---------------|
| `24c89b0` | feat(08-01): middleware route protection, sign-in page, dashboard route | 5 files: `.env.example`, `src/app/dashboard/page.tsx`, `src/app/page.tsx`, `src/app/sign-in/[[...sign-in]]/page.tsx`, `src/middleware.ts` |
| `d1e1582` | feat(08-01): replace HARDCODED_USER_ID with real Clerk auth().userId | 7 files: all 5 protected pages + `src/constants/user.ts` (deleted) + `src/lib/actions/progress.ts` |

Both commits exist in git history. File changes match the plan's declared scope exactly.

---

## Summary

Phase 8 goal is fully achieved. All three observable truths are verified against the actual codebase:

1. **Middleware protection is real, not a stub.** `src/middleware.ts` uses `createRouteMatcher` with an async callback calling `auth.protect()`. The only public route is `/sign-in(.*)`. The previous stub (`clerkMiddleware()` with no callback) has been completely replaced.

2. **The sign-in page is substantive and correctly structured.** `src/app/sign-in/[[...sign-in]]/page.tsx` uses the required optional catch-all route pattern and renders the Clerk `<SignIn />` component — not a placeholder.

3. **Real userId propagates everywhere.** Zero occurrences of `HARDCODED_USER_ID` remain in `src/`. All 5 protected page routes and both server actions use `await auth()` with the null-guard pattern. The `src/constants/user.ts` file is deleted. `userId` flows directly into every Supabase `.eq('user_id', ...)` and upsert/insert operation.

Three items require human verification at runtime (redirect behavior, post-auth destination, and database write confirmation) — these cannot be assessed statically but all supporting code is correctly wired.

---

_Verified: 2026-03-02T19:00:00Z_
_Verifier: Claude (gsd-verifier)_
