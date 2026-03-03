---
phase: 08-clerk-auth-wiring
plan: 01
subsystem: auth
tags: [clerk, middleware, route-protection, auth-wiring]
dependency_graph:
  requires: []
  provides: [clerk-middleware-protection, sign-in-page, dashboard-route, real-user-ids]
  affects: [all-protected-routes, progress-writes, quiz-attempts]
tech_stack:
  added: []
  patterns: [clerkMiddleware-with-createRouteMatcher, auth-userId-null-guard, server-action-auth-guard]
key_files:
  created:
    - src/app/sign-in/[[...sign-in]]/page.tsx
    - src/app/dashboard/page.tsx
  modified:
    - src/middleware.ts
    - src/app/page.tsx
    - src/lib/actions/progress.ts
    - src/app/pillars/[pillarSlug]/page.tsx
    - src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/page.tsx
    - src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/courses/[courseSlug]/page.tsx
    - src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/courses/[courseSlug]/lessons/[lessonSlug]/page.tsx
    - .env.local
    - .env.example
  deleted:
    - src/constants/user.ts
decisions:
  - "Used auth.protect() over manual redirect — Clerk handles the redirect to NEXT_PUBLIC_CLERK_SIGN_IN_URL automatically"
  - "Used NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL over AFTER_SIGN_IN_URL — FORCE variant overrides any redirect_url query param for consistent post-auth destination"
  - "Null-guard pattern (if (!userId) return null) preferred over as string cast — maintains TypeScript type narrowing without unsafe assertions"
  - "Deleted src/constants/user.ts entirely after migration — leaving it would invite future misuse"
metrics:
  duration_minutes: 4
  completed_date: "2026-03-03"
  tasks_completed: 2
  files_modified: 10
---

# Phase 8 Plan 01: Clerk Auth Wiring Summary

**One-liner:** Clerk route protection via clerkMiddleware + createRouteMatcher, with real auth().userId replacing hardcoded user IDs across all server components and actions.

## What Was Built

### Task 1: Middleware Route Protection, Sign-In Page, Dashboard Route

Replaced the stub `clerkMiddleware()` with a fully protecting middleware that uses `createRouteMatcher` to make only `/sign-in(.*)` public. All other routes now call `auth.protect()`, which auto-redirects unauthenticated users to the configured sign-in URL.

Created `src/app/sign-in/[[...sign-in]]/page.tsx` using the optional catch-all route pattern required by Clerk for multi-step auth flows (MFA, SSO callbacks, email verification). The dashboard content was moved from `src/app/page.tsx` to the new `src/app/dashboard/page.tsx` route. Root `/` now issues a server-side 307 redirect to `/dashboard`.

Added `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard` to both `.env.local` (values) and `.env.example` (documentation).

### Task 2: Replace HARDCODED_USER_ID with Real Clerk auth().userId

Migrated all 6 server component pages and the server actions file from the hardcoded single-user ID to `(await auth()).userId`. Each page uses the null-guard pattern `if (!userId) return null` for type narrowing. Server actions return `{ success: false, error: 'Unauthorized' }` when no session is present.

Deleted `src/constants/user.ts` entirely — zero references remain in the codebase.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 24c89b0 | feat(08-01): middleware route protection, sign-in page, dashboard route |
| Task 2 | d1e1582 | feat(08-01): replace HARDCODED_USER_ID with real Clerk auth().userId |

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript compiles without errors | PASS |
| No HARDCODED_USER_ID references in src/ | PASS |
| src/constants/user.ts deleted | PASS |
| middleware.ts contains auth.protect() | PASS |
| sign-in page exists at [[...sign-in]] route | PASS |
| dashboard page exists at /dashboard | PASS |
| root / redirects to /dashboard | PASS |
| .env.local has FORCE_REDIRECT_URL=/dashboard | PASS |
| progress.ts uses await auth() | PASS |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
