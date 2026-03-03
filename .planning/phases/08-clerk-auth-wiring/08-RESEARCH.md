# Phase 8: Clerk Auth Wiring - Research

**Researched:** 2026-03-02
**Domain:** Clerk Next.js authentication — middleware route protection, sign-in page, post-auth redirect, userId propagation to Supabase
**Confidence:** HIGH

---

## Summary

The v1.0 scaffolding installed `@clerk/nextjs` v6.39.0, wrapped the app in `<ClerkProvider>`, and added a stub `middleware.ts` that calls `clerkMiddleware()` with **no route protection**. All routes are currently public. The platform also uses a hardcoded Clerk userId string (`HARDCODED_USER_ID`) in every progress read and write, so any signed-in user's data is attributed to that constant rather than the real session.

Phase 8 has three concrete deliverables: (1) upgrade the middleware to enforce authentication on all non-public routes; (2) create a `/sign-in` page using Clerk's `<SignIn />` component in the required catch-all route structure; (3) replace every `HARDCODED_USER_ID` reference with `(await auth()).userId` from `@clerk/nextjs/server`. A fourth environmental concern — confirming Supabase's third-party Clerk auth is enabled in the Supabase dashboard — must be verified manually before writing any application code, as it cannot be confirmed from the codebase alone.

The work is fully self-contained. No new packages are required. The Supabase client already passes the Clerk JWT as `accessToken` (`src/lib/supabase/server.ts`), so RLS policies can be left as-is for this phase (full RLS enforcement is deferred to AUTH-04 / AUTH-05). The only new capability needed is wiring middleware protection and surfacing the real `userId` from Clerk's server-side `auth()` helper.

**Primary recommendation:** Add `createRouteMatcher` + `auth.protect()` to the middleware, create `app/sign-in/[[...sign-in]]/page.tsx`, set the three redirect env vars, and do a global find-replace of `HARDCODED_USER_ID` calls with `(await auth()).userId`.

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign in via Clerk sign-in page at `/sign-in` | Create `app/sign-in/[[...sign-in]]/page.tsx` with `<SignIn />` component; add `/sign-in(.*)` to public-route matcher |
| AUTH-02 | Unauthenticated user is redirected to `/sign-in` from any protected route | `clerkMiddleware` + `createRouteMatcher` + `auth.protect()` — Clerk auto-redirects to `NEXT_PUBLIC_CLERK_SIGN_IN_URL` |
| AUTH-03 | User is redirected to `/dashboard` after successful sign-in | The root `/` page IS the dashboard. Set `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/` (or create a dedicated `/dashboard` route with redirect — see Architecture Patterns) |

</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@clerk/nextjs` | 6.39.0 (already installed) | Authentication provider — middleware, server helpers, UI components | Already installed; v6 is current major |
| `@clerk/nextjs/server` | same | Server-side helpers: `auth()`, `clerkMiddleware`, `createRouteMatcher` | Official server package for App Router |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `<SignIn />` (Clerk UI) | bundled with `@clerk/nextjs` | Prebuilt sign-in form with all flows (email, social, MFA) | Replaces hand-rolling auth UI |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Clerk `<SignIn />` component | Custom form + Clerk API | Much more code; misses MFA, social login edge cases automatically |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` env var | `afterSignInUrl` prop on `<SignIn />` | Prop approach is per-component; env var applies globally — prefer env var |

**Installation:**
```bash
# No new packages needed — @clerk/nextjs v6.39.0 is already installed
```

---

## Architecture Patterns

### Current State (v1.0 Scaffolding)

```
src/
├── middleware.ts                       # clerkMiddleware() — no route protection (stub)
├── constants/user.ts                   # HARDCODED_USER_ID — every progress call uses this
├── lib/supabase/server.ts              # createServerSupabaseClient uses auth().getToken()
├── lib/actions/progress.ts             # markLessonComplete + persistQuizAttempt use HARDCODED_USER_ID
├── app/
│   ├── page.tsx                        # Dashboard — uses HARDCODED_USER_ID (2 usages)
│   ├── pillars/[pillarSlug]/page.tsx   # Uses HARDCODED_USER_ID (1 usage)
│   ├── pillars/.../semesters/[semesterSlug]/page.tsx      # HARDCODED_USER_ID (3 usages)
│   ├── pillars/.../courses/[courseSlug]/page.tsx          # HARDCODED_USER_ID (2 usages)
│   └── pillars/.../lessons/[lessonSlug]/page.tsx          # HARDCODED_USER_ID (3 usages)
```

### Target State (Phase 8)

```
src/
├── middleware.ts                       # clerkMiddleware + createRouteMatcher + auth.protect()
├── constants/user.ts                   # DELETED or emptied (no more hardcoded ID)
├── lib/supabase/server.ts              # Unchanged — already passes Clerk JWT via accessToken
├── lib/actions/progress.ts             # auth() call added — real userId passed to Supabase
├── app/
│   ├── sign-in/
│   │   └── [[...sign-in]]/
│   │       └── page.tsx               # <SignIn /> component — NEW
│   ├── page.tsx                        # auth() replaces HARDCODED_USER_ID
│   ├── pillars/[pillarSlug]/page.tsx   # auth() replaces HARDCODED_USER_ID
│   └── pillars/...                     # auth() replaces HARDCODED_USER_ID (all pages)
```

---

### Pattern 1: Middleware Route Protection

**What:** Make all routes protected by default; allow only `/sign-in` (and optionally `/sign-up`) as public.
**When to use:** Any Next.js App Router app needing authentication wall.

```typescript
// src/middleware.ts
// Source: https://clerk.com/docs/reference/nextjs/clerk-middleware
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

`auth.protect()` automatically redirects unauthenticated users to the URL specified by `NEXT_PUBLIC_CLERK_SIGN_IN_URL`. No manual `redirectToSignIn()` call needed.

---

### Pattern 2: Sign-In Page (Catch-All Route)

**What:** Host Clerk's prebuilt `<SignIn />` component on a dedicated page.
**Why catch-all `[[...sign-in]]`:** Clerk uses sub-paths for multi-step flows (email verification, MFA, SSO callbacks). The optional catch-all route handles all of them.

```tsx
// src/app/sign-in/[[...sign-in]]/page.tsx
// Source: https://clerk.com/docs/nextjs/guides/development/custom-sign-in-or-up-page
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  )
}
```

**Required environment variables (`.env.local`):**
```env
# Tells Clerk where your sign-in page lives
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in

# After sign-in, always redirect here (overrides any other redirect logic)
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/

# Fallback if FORCE is not set and no redirect_url param exists
# NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
```

**Note on `/dashboard` vs `/`:** The success criteria say "lands on `/dashboard`" but the actual dashboard page lives at `/` (root). The root `page.tsx` is named `DashboardPage` and uses href `'/'` in breadcrumbs. Two valid approaches:
1. Set `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/` — simplest, no new routes needed.
2. Create `app/dashboard/page.tsx` as a redirect to `/` (or move root content) — matches URL literally but adds complexity.

**Recommendation:** Use option 1 (redirect to `/`) unless there is explicit intent to have a distinct `/dashboard` URL. If the phase requirement literally needs the URL bar to show `/dashboard`, create a redirect page at `app/dashboard/page.tsx` that calls Next.js `redirect('/')`, or move the root page content there.

---

### Pattern 3: Getting Real userId in Server Components and Server Actions

**What:** Replace `HARDCODED_USER_ID` with `auth().userId` from Clerk.
**Confidence:** HIGH — verified against official Clerk docs (February 2026).

**In Server Components (page.tsx files):**
```typescript
// Source: https://clerk.com/docs/reference/nextjs/app-router/auth
import { auth } from '@clerk/nextjs/server'

export default async function DashboardPage() {
  const { userId } = await auth()

  // userId is null if unauthenticated — but middleware.protect()
  // guarantees userId is non-null by the time this runs.
  // Use `!` assertion or null check for TypeScript.
  if (!userId) return null  // safety guard — should never reach here post-middleware

  const continueData = await getContinueLesson(adminSupabase, userId)
  // ...
}
```

**In Server Actions (`'use server'` files):**
```typescript
// Source: https://clerk.com/docs/reference/nextjs/app-router/server-actions
'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function markLessonComplete(lessonId: string) {
  const { userId } = await auth()
  if (!userId) return { success: false, error: 'Unauthorized' }

  const supabase = createAdminSupabaseClient()
  const { error } = await supabase
    .from('progress')
    .upsert(
      {
        user_id: userId,  // Real Clerk userId — not hardcoded
        lesson_id: lessonId,
        status: 'completed',
        completed_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    )
  // ...
}
```

---

### Anti-Patterns to Avoid

- **Keeping `HARDCODED_USER_ID` as fallback:** Do not use `userId ?? HARDCODED_USER_ID`. After middleware enforcement, `userId` will always be non-null for protected routes. Fallback to hardcoded string defeats the purpose.
- **Calling `currentUser()` when only `userId` is needed:** `currentUser()` makes a network call to Clerk's API and counts against rate limits. `auth()` is session-local and free. Use `auth()` for `userId` only; reserve `currentUser()` for when you need full user profile data.
- **Making `middleware.ts` a non-async function:** In v6, middleware handlers that call `auth` must be `async`. The current stub `clerkMiddleware()` has no callback, which is fine. Adding a callback (as Pattern 1 shows) requires `async`.
- **Missing catch-all route structure:** `app/sign-in/page.tsx` alone will not work for Clerk's multi-step flows (MFA, email verification, social login callbacks). Must use `app/sign-in/[[...sign-in]]/page.tsx`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth UI (sign-in form) | Custom form + manual JWT handling | Clerk `<SignIn />` component | Social login, MFA, email verification, PKCE — all handled; custom form misses dozens of edge cases |
| Route protection logic | Manual JWT verification in each page | `clerkMiddleware` + `auth.protect()` | Runs at the edge before any page code; centralized; handles all redirect logic |
| Post-auth redirect | Manual `router.push` in sign-in callback | `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` env var | Clerk SDK handles; works for all sign-in methods (social, email, MFA) |

**Key insight:** Clerk's prebuilt components handle every auth edge case (MFA, social login, email verification, PKCE). Any hand-rolled solution will silently omit these flows.

---

## Common Pitfalls

### Pitfall 1: Supabase Third-Party Auth Not Enabled

**What goes wrong:** The Supabase client (`createServerSupabaseClient`) passes the Clerk JWT as `accessToken`. If Supabase hasn't been configured to accept Clerk as a trusted third-party provider, every authenticated request to Supabase will be rejected or treated as anonymous.

**Why it happens:** This is a Supabase dashboard configuration step (navigate to Authentication > Third-Party Auth > Add Clerk). It cannot be confirmed from the codebase — it requires checking the Supabase project settings directly.

**How to avoid:** Verify Supabase third-party Clerk auth is enabled BEFORE writing any application code. The Supabase docs guide is at `supabase.com/docs/guides/auth/third-party/clerk`. The Clerk domain (found in Clerk Dashboard > Supabase integration) must be pasted into the Supabase dashboard.

**Warning signs:** Supabase queries return empty results or RLS errors after enabling middleware protection; the admin client (which bypasses RLS) still works fine.

**Note for this phase:** The v1.0 build used the admin client for progress writes precisely to bypass this gap. Phase 8 continues this pattern (admin client for writes) — the Supabase JWT auth gap is deferred to AUTH-04. However, `createServerSupabaseClient` (which uses the Clerk token) is used for all reads — if third-party auth is not configured, read queries may fail RLS checks.

---

### Pitfall 2: `/dashboard` URL in Success Criteria vs Actual Route at `/`

**What goes wrong:** Success criterion 3 says "user lands on `/dashboard`" but the existing dashboard page lives at `/` (root). Setting `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard` would redirect to a 404.

**Why it happens:** The phase description uses "dashboard" as a logical name, not necessarily a URL path. The v1.0 root page (`page.tsx`) is named `DashboardPage`.

**How to avoid:** Either (a) redirect to `/` and accept that the URL is not `/dashboard`, or (b) create a `/dashboard` route. Clarify intent during planning. If literal URL match is required, the simplest fix is `app/dashboard/page.tsx` calling `redirect('/')`.

---

### Pitfall 3: TypeScript Non-Null Assertion for userId

**What goes wrong:** `auth()` returns `{ userId: string | null }`. TypeScript will complain when passing `userId` to Supabase `.eq('user_id', userId)` because `userId` could be null.

**Why it happens:** Clerk types correctly reflect that `userId` is null for unauthenticated users.

**How to avoid:** After middleware protection, `userId` is guaranteed non-null. Use a null check with early return as a safety guard (TypeScript narrowing), then pass the narrowed string to Supabase calls. Do NOT use `as string` cast without the guard — it hides real unauthenticated edge cases.

```typescript
const { userId } = await auth()
if (!userId) return { success: false, error: 'Unauthorized' }
// userId is now `string` (narrowed) — safe to pass to Supabase
```

---

### Pitfall 4: middleware.ts Async Handler Requirement (v6)

**What goes wrong:** In `@clerk/nextjs` v6, the `clerkMiddleware` callback must be `async` because it calls the new async `auth` API internally. A synchronous callback will fail.

**Why it happens:** v6 breaking change — `auth()` is now always async.

**How to avoid:** Always declare the middleware callback as `async (auth, req) => { ... }`.

---

### Pitfall 5: Sign-In Page Not in Public Route Matcher

**What goes wrong:** If `/sign-in` is not listed in `isPublicRoute`, the middleware will protect the sign-in page itself, causing an infinite redirect loop.

**Why it happens:** `auth.protect()` redirects to `/sign-in`, which then also requires auth, which redirects to `/sign-in` again.

**How to avoid:** Always include `'/sign-in(.*)'` (with wildcard) in the public route matcher. The wildcard is required to cover Clerk's sub-paths (e.g., `/sign-in/sso-callback`).

---

## Code Examples

Verified patterns from official sources:

### Complete Middleware (replaces current stub)
```typescript
// src/middleware.ts
// Source: https://clerk.com/docs/reference/nextjs/clerk-middleware
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### Sign-In Page
```tsx
// src/app/sign-in/[[...sign-in]]/page.tsx
// Source: https://clerk.com/docs/nextjs/guides/development/custom-sign-in-or-up-page
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  )
}
```

### Required .env.local Additions
```env
# Source: https://clerk.com/docs/guides/development/customize-redirect-urls
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/
```

### userId in Server Component
```typescript
// Source: https://clerk.com/docs/reference/nextjs/app-router/auth
import { auth } from '@clerk/nextjs/server'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) return null  // safety guard; middleware ensures this won't be reached

  // Replace all HARDCODED_USER_ID references with userId
  const continueData = await getContinueLesson(adminSupabase, userId)
  // ...
}
```

### userId in Server Action
```typescript
// Source: https://clerk.com/docs/reference/nextjs/app-router/server-actions
'use server'
import { auth } from '@clerk/nextjs/server'

export async function markLessonComplete(lessonId: string) {
  const { userId } = await auth()
  if (!userId) return { success: false, error: 'Unauthorized' }

  // userId is now the real Clerk userId — pass directly to Supabase
}
```

---

## Complete File Inventory: HARDCODED_USER_ID Replacement

All 8 locations that must be updated (confirmed by codebase grep):

| File | Usages | Type |
|------|--------|------|
| `src/constants/user.ts` | 1 (definition) | Delete or deprecate the constant |
| `src/app/page.tsx` | 2 | Server Component — add `await auth()` |
| `src/app/pillars/[pillarSlug]/page.tsx` | 1 | Server Component — add `await auth()` |
| `src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/page.tsx` | 3 | Server Component — add `await auth()` |
| `src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/courses/[courseSlug]/page.tsx` | 2 | Server Component — add `await auth()` |
| `src/app/pillars/[pillarSlug]/semesters/[semesterSlug]/courses/[courseSlug]/lessons/[lessonSlug]/page.tsx` | 3 | Server Component — add `await auth()` |
| `src/lib/actions/progress.ts` | 3 | Server Action — add `await auth()` |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `authMiddleware()` | `clerkMiddleware()` | @clerk/nextjs v5→v6 | `authMiddleware` removed; must use `clerkMiddleware` |
| Synchronous `auth()` | Async `await auth()` | @clerk/nextjs v6 | All server-side auth calls need `await` |
| `auth().protect()` | `auth.protect()` (on middleware param) | @clerk/nextjs v6 | API relocated to middleware `auth` argument |
| Custom JWT template for Supabase | Native Supabase third-party auth | 2025-04-01 | Old JWT template approach deprecated; `accessToken` pattern (already in codebase) is the current standard |

**Deprecated/outdated:**
- `authMiddleware()`: Removed in v6. The codebase correctly uses `clerkMiddleware()`.
- Clerk JWT template for Supabase: Deprecated April 1, 2025. The `accessToken: async () => (await getToken()) ?? null` pattern in `server.ts` is the new standard — already implemented correctly.

---

## Open Questions

1. **Does `/dashboard` need to be a literal URL, or is `/` acceptable?**
   - What we know: The root page IS the dashboard; success criteria says "lands on `/dashboard`"
   - What's unclear: Whether the URL bar must literally show `/dashboard`
   - Recommendation: Default to redirecting to `/` (simplest). If URL must show `/dashboard`, create `app/dashboard/page.tsx` that renders the same content or redirects.

2. **Is Supabase third-party Clerk auth already enabled in the Supabase dashboard?**
   - What we know: The codebase uses `accessToken` pattern correctly; STATE.md flags this as an unverified blocker
   - What's unclear: Whether the Supabase project at `exzsacjzsmsavppnikot.supabase.co` has Clerk configured as a third-party provider
   - Recommendation: First task of the phase must be a manual verification step in the Supabase dashboard before writing any app code.

3. **Should the `HARDCODED_USER_ID` constant in `src/constants/user.ts` be deleted or left with a comment?**
   - What we know: It will no longer be imported anywhere after replacement
   - Recommendation: Delete the file entirely. Leaving a deprecated constant invites future misuse.

---

## Sources

### Primary (HIGH confidence)

- [Clerk clerkMiddleware() reference](https://clerk.com/docs/reference/nextjs/clerk-middleware) — middleware pattern, createRouteMatcher, auth.protect()
- [Clerk custom sign-in page guide](https://clerk.com/docs/nextjs/guides/development/custom-sign-in-or-up-page) — catch-all route structure, SignIn component, env vars
- [Clerk auth() reference](https://clerk.com/docs/reference/nextjs/app-router/auth) — userId extraction in server components
- [Clerk server actions reference](https://clerk.com/docs/reference/nextjs/app-router/server-actions) — userId in server actions
- [Clerk redirect URL customization](https://clerk.com/docs/guides/development/customize-redirect-urls) — FORCE vs FALLBACK redirect URL env vars
- [Clerk v6 upgrade guide](https://clerk.com/docs/guides/development/upgrading/upgrade-guides/nextjs-v6) — breaking changes: async auth(), protect() relocation, removed authMiddleware
- [Supabase Clerk third-party auth docs](https://supabase.com/docs/guides/auth/third-party/clerk) — Supabase dashboard configuration steps
- [Clerk Supabase integration guide](https://clerk.com/docs/guides/development/integrations/databases/supabase) — accessToken pattern, RLS with auth.jwt()->>'sub'

### Secondary (MEDIUM confidence)

- Codebase inspection — confirmed `@clerk/nextjs@6.39.0`, existing middleware stub, all 8 `HARDCODED_USER_ID` locations, Supabase client implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Clerk v6.39.0 installed, APIs verified against official docs dated Feb 2026
- Architecture patterns: HIGH — all code examples sourced from official Clerk docs
- Pitfalls: HIGH (pitfalls 1, 3, 4, 5) / MEDIUM (pitfall 2 — depends on intent of "dashboard" URL requirement)

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (Clerk docs are actively maintained; check for minor API changes after 30 days)
