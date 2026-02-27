# Phase 1: Infrastructure - Research

**Researched:** 2026-02-27
**Domain:** Supabase (PostgreSQL), Clerk (auth), Next.js 15 App Router, Vercel
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Learning Hierarchy:** Strict sequence — lessons must be completed in order within a course. Hierarchy size varies widely per pillar (some may have 2 semesters, others 8+). Semesters and courses carry light metadata: name, short description, display order. Fixed ordering at creation — no reordering support needed. Soft delete on all content tables (archived/deleted_at field, not hard delete). Pillar definitions (names, colors, descriptions) deferred to Phase 6 — schema just needs to support 7+ pillars.
- **Vocabulary:** Terms are shared globally across the platform (one definition per term, reused across lessons). Terms are pillar-scoped: same word can have different definitions in different pillars. Junction table needed to link terms to lessons they appear in.
- **Lesson Data Model:** Learning objectives required on every lesson (list of "after this lesson you will..." statements). MDX storage approach, versioning strategy, and additional metadata fields at Claude's discretion.
- **Quiz Question Schema:** 5 question types in v1: multiple-choice, recall, application, analysis, comparison. Recall questions are fill-in-the-blank with accepted answer set (not free-text). Application and analysis questions are structured multiple-choice with scenario/context. Comparison questions included from start. Full attempt data capture: question_id, selected_answer, correct_answer, is_correct, timestamp, time_spent. 70% passing score required for lesson completion. Failed quiz requires scrolling through lesson content before retry (retry-after-review pattern). All attempts recorded; best score determines pass status.
- **Project Tooling:** Next.js with App Router (v14+). Tailwind CSS + shadcn/ui component library. pnpm as package manager. Database client approach at Claude's discretion.

### Claude's Discretion

- Hierarchy depth flexibility (whether to allow skipping levels like semesters)
- Prerequisites beyond semester-level locking
- Pillar metadata fields beyond name + color + description
- Timestamps strategy (every table vs only where needed)
- MDX content storage approach (DB text column vs file-based)
- Learning objectives storage (JSON array column vs MDX section)
- Content versioning model (keep-all vs limited, draft/publish vs always-live)
- Quiz table structure (single table with type discriminator vs separate tables)
- Quiz storage approach (inline MDX vs separate DB records)
- Quiz explanation display strategy (same for correct/incorrect vs differentiated)
- Database client choice (Supabase JS client vs Drizzle ORM)

### Deferred Ideas (OUT OF SCOPE)

- Research-backed pillar creation: user wants proper research done when defining each learning pillar's content structure and curriculum — capture during Phase 6 (Seed Content)
- Pillar names, colors, and descriptions — Phase 6
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFR-01 | Data model includes user_id on all tables with hardcoded single user (Clerk-ready scaffolding for later) | user_id must be TEXT type (not UUID) — Clerk IDs are strings like `user_2w2a6PJC4T4BfXDsg72AQsLNEyU`. RLS policies use `current_setting('request.jwt.claims', true)::json->>'sub'` for Clerk ID extraction. |
| INFR-02 | Supabase database with core schema (pillars, semesters, courses, lessons, progress, quiz_questions, vocabulary, lesson_versions) | Full schema covered in Architecture Patterns section. quiz_attempts table must be included even though quiz UI is Phase 4 — early attempt data is required for future FSRS. lesson_versions table required for Phase 3 content versioning. |
| INFR-03 | Deployed to Vercel | Standard Next.js + Vercel deployment. Environment variables must be set before build. SUPABASE_SERVICE_ROLE_KEY must never appear in NEXT_PUBLIC_ variables. |
</phase_requirements>

---

## Summary

Phase 1 establishes the data layer and deployment pipeline. The primary technical challenges are: (1) correctly integrating Clerk authentication with Supabase Row Level Security — this uses a non-obvious pattern due to Clerk using string user IDs rather than UUIDs; (2) designing a schema comprehensive enough to support all future phases, particularly including `quiz_attempts` and `lesson_versions` tables now to avoid data loss later; and (3) the two-client-factory pattern for Supabase that keeps the service role key strictly server-side.

The most critical finding from research: `auth.uid()` does **not** work with Clerk — it returns NULL or throws UUID parse errors because Clerk user IDs are strings (e.g., `user_2w2a6PJC4T4BfXDsg72AQsLNEyU`), not UUIDs. All RLS policies must use `current_setting('request.jwt.claims', true)::json->>'sub'` instead. The STATE.md warning about auth.uid() is accurate but understated — this is not just a configuration issue, it requires a different SQL function entirely.

The March 2025 Clerk native third-party Supabase integration (replacing the deprecated JWT template approach) simplifies setup by using Clerk session tokens directly rather than requiring a custom JWT secret shared between services. For this single-user project, the immediate deliverable is: Clerk configured as third-party auth provider, Supabase schema deployed via migration, RLS enabled on all user-data tables, two Supabase client factories created, and the app deploying to Vercel with environment variables set.

**Primary recommendation:** Use the native Clerk third-party Supabase integration (not the deprecated JWT template), keep `user_id` columns as `text` type across all tables, use `current_setting('request.jwt.claims', true)::json->>'sub'` in all RLS policies, and use the Supabase JS client (`@supabase/supabase-js` + `@supabase/ssr`) rather than Drizzle ORM for Phase 1 since RLS-enforced queries are simpler with the official client.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.x | Full-stack React framework | Latest stable as of 2025; required by project constraints (App Router). Next.js 15 adds next.config.ts, React 19, Turbopack. |
| @supabase/supabase-js | 2.x | Supabase database client | Official client; handles auth token injection, PostgREST query builder, type generation |
| @supabase/ssr | 0.x | SSR-safe Supabase client factories | Required for Next.js App Router — creates separate clients for Server Components, Route Handlers, Client Components with correct cookie handling |
| clerk | 6.x (via @clerk/nextjs) | Authentication provider | Project constraint. Native Supabase third-party integration available since March 2025 |
| @clerk/nextjs | 6.x | Clerk + Next.js integration | Provides `auth()`, `useSession()`, `ClerkProvider` for App Router |
| typescript | 5.x | Type safety | Project constraint — strict mode enabled |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| supabase CLI | latest | Local dev, migrations, type gen | Schema-first migration workflow; `supabase gen types` for TypeScript types |
| dotenv / .env.local | built-in | Environment variable management | Keep service role key out of NEXT_PUBLIC_ namespace |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/supabase-js | Drizzle ORM | Drizzle gives better TypeScript ergonomics for complex queries but bypasses RLS by default (direct DB connection); adds setup complexity. For Phase 1 schema + RLS setup, official client is simpler and keeps RLS enforcement standard. |
| Supabase migrations (SQL files) | Prisma migrations | Supabase CLI migrations are native to the platform and work with local dev/branching; Prisma adds an extra layer for a Postgres-native tool |
| Next.js 15 | Next.js 14 | Next.js 15 is the recommended new-project choice as of 2025; project constraint says "v14+" so 15 is in-scope |

**Installation:**
```bash
pnpm dlx create-next-app@latest . --typescript --tailwind --app --use-pnpm
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add @clerk/nextjs
pnpm add -D supabase
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with ClerkProvider
│   └── page.tsx            # Root page (deploy smoke test)
├── lib/
│   └── supabase/
│       ├── client.ts       # Browser client (Client Components)
│       └── server.ts       # Server client (Server Components, Actions, Route Handlers)
├── types/
│   └── database.types.ts   # Generated by `supabase gen types`
└── constants/
    └── user.ts             # HARDCODED_USER_ID constant

supabase/
├── config.toml             # Local dev config (Clerk third-party auth domain)
└── migrations/
    └── 00001_initial_schema.sql
```

### Pattern 1: Two Supabase Client Factories

**What:** A browser-safe client and a server-only client. The browser client uses the anon/publishable key and injects the Clerk session token. The server client can optionally use the service role key for admin operations. The service role key MUST never appear in any `NEXT_PUBLIC_` variable or any `"use client"` file.

**When to use:** Browser client in all Client Components. Server client in all Server Components, Server Actions, and Route Handlers.

**Example — Browser Client (`src/lib/supabase/client.ts`):**
```typescript
// Source: https://clerk.com/changelog/2025-03-31-supabase-integration
import { createClient } from '@supabase/supabase-js'
import { useSession } from '@clerk/nextjs'
import type { Database } from '@/types/database.types'

export function createClerkSupabaseClient() {
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

**Example — Server Client (`src/lib/supabase/server.ts`):**
```typescript
// Source: https://clerk.com/docs/guides/development/integrations/databases/supabase
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
import type { Database } from '@/types/database.types'

export async function createServerSupabaseClient() {
  const { getToken } = await auth()
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => getToken() ?? null,
    }
  )
}

// Service-role client — server ONLY, never export to client
export function createAdminSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // NOT NEXT_PUBLIC_
    { auth: { persistSession: false } }
  )
}
```

### Pattern 2: RLS Policy with Clerk User ID

**What:** All RLS policies use `current_setting('request.jwt.claims', true)::json->>'sub'` to extract the Clerk user ID from the JWT. This is NOT `auth.uid()` — that function does not work with Clerk.

**When to use:** Every `user_id` RLS policy on every table.

**Example:**
```sql
-- Source: https://supertokens.com/blog/how-to-integrate-clerk-with-supabase
-- Enable RLS
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Performance-optimized pattern: wrap in SELECT to cache per statement
CREATE POLICY "Users can view their own lessons"
  ON lessons FOR SELECT
  USING (
    user_id = (
      SELECT current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Users can insert their own lessons"
  ON lessons FOR INSERT
  WITH CHECK (
    user_id = (
      SELECT current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );
```

### Pattern 3: Clerk Third-Party Auth in Supabase

**What:** Configure Clerk as a native third-party auth provider in Supabase (the modern approach as of April 2025, replacing deprecated JWT templates).

**Setup steps:**
1. In Clerk Dashboard: enable the Supabase integration (Settings > Integrations > Supabase)
2. In Supabase Dashboard: add Third-Party Auth provider, paste your Clerk instance domain
3. For local development, add to `supabase/config.toml`:
```toml
[auth.third_party.clerk]
enabled = true
domain = "example.clerk.accounts.dev"
```

### Pattern 4: Soft Delete

**What:** All content tables (pillars, semesters, courses, lessons, quiz_questions, vocabulary) use a `deleted_at timestamptz` column. Null = active, non-null = deleted. Create Postgres views that filter `WHERE deleted_at IS NULL` for application queries.

**Example:**
```sql
-- Table definition includes:
deleted_at TIMESTAMPTZ DEFAULT NULL,

-- Active-records view (used in application queries):
CREATE VIEW active_lessons AS
  SELECT * FROM lessons WHERE deleted_at IS NULL;
```

**Important gotcha:** RLS policies on the base table apply to DELETEs too. A user-scoped policy will block the UPDATE that sets `deleted_at` if not written carefully — write separate UPDATE policies or use the admin client for soft-delete operations.

### Pattern 5: Schema Migration Workflow

**What:** Use Supabase CLI to manage schema as SQL migration files. Local dev runs a full Supabase stack via Docker.

```bash
# Initialize Supabase in project root
pnpm supabase init

# Create a new migration
pnpm supabase migration new initial_schema

# Apply locally
pnpm supabase db reset

# Push to production (after linking project)
pnpm supabase db push

# Generate TypeScript types from schema
pnpm supabase gen types typescript --project-id "$PROJECT_REF" > src/types/database.types.ts
```

### Recommended Schema Design

```sql
-- All user-data tables share this pattern:
-- * id: UUID primary key
-- * user_id: TEXT (not UUID — Clerk IDs are strings)
-- * created_at / updated_at: timestamps
-- * deleted_at: for soft delete

-- Content tables (pillars, semesters, courses, lessons):
-- * NO user_id — content is shared/global
-- * display_order: integer for fixed ordering

-- Progress/quiz tables:
-- * user_id: TEXT — these are per-user

-- NOTE: quiz_attempts must be in Phase 1 schema even though
-- quiz UI is Phase 4 — early data needed for future FSRS
```

### Anti-Patterns to Avoid

- **Using `auth.uid()` in RLS policies with Clerk:** Returns NULL or UUID parse error. Use `current_setting('request.jwt.claims', true)::json->>'sub'` instead.
- **Putting service role key in NEXT_PUBLIC_ variable:** Bypasses RLS entirely; a client-side leak exposes all data.
- **Using UUID type for user_id columns:** Clerk IDs are strings. UUID columns will throw `"invalid input syntax for type uuid"`.
- **Forgetting to enable RLS on a new table:** Supabase API exposes all rows if RLS is disabled but the anon key is used. Enable RLS first, then write policies.
- **Writing single `FOR ALL` policy:** Use separate SELECT, INSERT, UPDATE, DELETE policies for clarity and correct USING/WITH CHECK clause placement.
- **Skipping indexes on user_id columns used in RLS:** Can result in 100x+ performance degradation on large tables.
- **Deploying quiz_attempts table in Phase 4:** Loss of all early quiz attempt data; FSRS requires accumulated history.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT validation + auth context | Custom JWT middleware | Clerk + `@clerk/nextjs` | Token rotation, session refresh, security edge cases are complex |
| Cookie management for SSR sessions | Custom cookie handling | `@supabase/ssr` | App Router's Server Component / Client Component boundary creates cookie write issues that @supabase/ssr solves |
| TypeScript DB types | Manual interface definitions | `supabase gen types` CLI command | Schema-derived types stay in sync; manual types drift |
| SQL migrations | ORM schema push | Supabase CLI migration files | SQL files are versionable, diffable, reproducible; dashboard-only changes are fragile |

**Key insight:** The Clerk + Supabase integration has a documented, tested pattern. Any deviation (custom JWT parsing, manual token injection) introduces security surface area without adding value.

---

## Common Pitfalls

### Pitfall 1: auth.uid() Returns NULL with Clerk

**What goes wrong:** Developer writes RLS policy using `auth.uid() = user_id`. All queries silently return zero rows for authenticated users because `auth.uid()` returns NULL when Clerk is the auth provider (not Supabase Auth). The table appears empty even for the correct user.

**Why it happens:** `auth.uid()` extracts the UUID from the `sub` claim of a Supabase Auth JWT. Clerk JWTs have a string `sub` claim (e.g., `user_2w2a6PJC4T4BfXDsg72AQsLNEyU`). The function either returns NULL or throws a UUID parse error.

**How to avoid:** Always use `current_setting('request.jwt.claims', true)::json->>'sub'` for Clerk. Keep `user_id` columns as `TEXT` type, not `UUID`.

**Warning signs:** Queries return empty results for authenticated user; no error thrown (silent failure because `NULL = anything` is false in SQL, matching no rows).

### Pitfall 2: Service Role Key Leak

**What goes wrong:** Developer copies Supabase service role key into a `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` variable or imports the admin client in a Client Component. The key is exposed in the browser bundle, granting any user full database access (bypasses all RLS).

**Why it happens:** Confusion between the two Supabase credentials; `NEXT_PUBLIC_` prefix is required for environment variables to be available client-side.

**How to avoid:** Service role key lives only in `SUPABASE_SERVICE_ROLE_KEY` (no NEXT_PUBLIC_ prefix). Admin client is created only in server-side files. Add ESLint rule or naming convention to enforce.

**Warning signs:** `process.env.SUPABASE_SERVICE_ROLE_KEY` in any file with `"use client"` directive or in `/app/page.tsx` without a `"use server"` action.

### Pitfall 3: Clerk JWT Not Configured Before Writing RLS

**What goes wrong:** Developer writes RLS policies before completing Clerk third-party auth configuration in Supabase dashboard. All policy tests fail or return wrong results because the JWT sub claim is not being populated.

**Why it happens:** Supabase doesn't know to trust Clerk JWTs until the third-party auth integration is registered. Requests arrive without valid auth context.

**How to avoid:** Register Clerk as third-party auth provider in Supabase dashboard FIRST. Verify with a raw SQL test: `SELECT current_setting('request.jwt.claims', true)::json->>'sub'` returns the Clerk user ID for an authenticated request.

**Warning signs:** `SELECT current_setting('request.jwt.claims', true)::json->>'sub'` returns NULL even for a logged-in user.

### Pitfall 4: Missing Tables Cause Data Loss Later

**What goes wrong:** `quiz_attempts` or `lesson_versions` tables are deferred to their respective phases (4 and 3). Any quiz data collected in Phase 4 will not have historical baseline; any content published before Phase 3 can't be versioned or rolled back.

**Why it happens:** Phase-by-phase thinking — "we don't need quiz UI yet, so we don't need the table." But the data accumulates from day one.

**How to avoid:** Include `quiz_attempts` and `lesson_versions` in the Phase 1 schema. These tables only need to exist — they don't need UI. This is explicitly called out in STATE.md blockers.

**Warning signs:** quiz_attempts or lesson_versions missing from the Phase 1 migration file.

### Pitfall 5: Soft Delete + RLS UPDATE Conflict

**What goes wrong:** User-scoped RLS policy allows UPDATE on rows where `user_id = <current user>`. When soft-deleting, the application sets `deleted_at = NOW()`. But the USING clause of an UPDATE policy checks the row's current state — if policy includes `AND deleted_at IS NULL`, a soft-deleted row can never be undeleted by the user.

**Why it happens:** UPDATE policies have both a USING (which rows can be targeted) and WITH CHECK (what the row must look like after). Overly-restrictive USING blocks updates to already-deleted rows.

**How to avoid:** For content tables where only admin (service role) performs soft-deletes, use the admin Supabase client for delete operations and write user RLS policies only for SELECT/INSERT/UPDATE of non-deleted rows. For user-owned tables (progress, quiz_attempts), decide if soft-delete even makes sense.

### Pitfall 6: Vercel Build Fails Due to Missing Environment Variables

**What goes wrong:** Next.js build succeeds locally but fails on Vercel because environment variables are not set in project settings. `NEXT_PUBLIC_` variables must be present at build time.

**Why it happens:** Environment variables are set in `.env.local` for local dev but not configured in Vercel project settings.

**How to avoid:** Set all required environment variables in Vercel project settings before the first deployment. Required variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.

---

## Code Examples

Verified patterns from official sources:

### RLS Policy with Clerk User ID

```sql
-- Source: https://supertokens.com/blog/how-to-integrate-clerk-with-supabase
-- user_id column is TEXT type (not UUID)

ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- Wrap in SELECT for Postgres query plan caching (up to 100x faster on large tables)
-- Source: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv

CREATE POLICY "Users can view own progress"
  ON progress FOR SELECT
  USING (
    user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
  );

CREATE POLICY "Users can insert own progress"
  ON progress FOR INSERT
  WITH CHECK (
    user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
  );

CREATE POLICY "Users can update own progress"
  ON progress FOR UPDATE
  USING (
    user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
  )
  WITH CHECK (
    user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
  );
```

### Verify Auth is Working (Smoke Test SQL)

```sql
-- Run this as an authenticated user to confirm Clerk JWT is wired up correctly
-- Should return the Clerk user ID string, not NULL
SELECT current_setting('request.jwt.claims', true)::json->>'sub' AS clerk_user_id;
```

### Complete Table Pattern (Example: progress)

```sql
CREATE TABLE progress (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      TEXT NOT NULL,  -- Clerk user ID string, e.g. user_2w2a...
  lesson_id    UUID NOT NULL REFERENCES lessons(id),
  status       TEXT NOT NULL DEFAULT 'not_started'
               CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index on user_id for RLS performance
CREATE INDEX idx_progress_user_id ON progress(user_id);

ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
```

### Supabase config.toml for Clerk Third-Party Auth

```toml
# supabase/config.toml
[auth.third_party.clerk]
enabled = true
domain = "example.clerk.accounts.dev"  # Replace with your Clerk domain
```

### Environment Variables

```bash
# .env.local (never commit this file)

# Supabase — both required for client
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase service role — server ONLY, never NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### TypeScript Types Generation

```bash
# Add to package.json scripts:
# "gen-types": "supabase gen types typescript --project-id \"$SUPABASE_PROJECT_ID\" > src/types/database.types.ts"
pnpm supabase gen types typescript --project-id "your-project-id" > src/types/database.types.ts
```

---

## Schema Design Recommendations (Claude's Discretion)

These decisions were left to Claude's discretion and have been researched:

### MDX Content Storage

**Recommendation: Raw MDX text in a `mdx_content TEXT` column on the `lessons` table.**

Rationale: Matches the existing decision recorded in STATE.md ("Use raw MDX string in `lessons.mdx_content`"). Simpler than JSON AST. `next-mdx-remote` compiles server-side from the string. No file-system coupling — essential for AI-generated content in Phase 2.

### Learning Objectives Storage

**Recommendation: `learning_objectives TEXT[]` (Postgres text array) on the `lessons` table.**

Rationale: Simpler than a separate table; objectives are always fetched with the lesson; easy to render as a list. Avoids JSON parsing overhead.

### Content Versioning Model

**Recommendation: Append-only `lesson_versions` table with `content_version INTEGER` on `lessons`.**

`lessons.content_version` is the current version number. `lesson_versions` stores the full MDX snapshot at each version. No drafts/publish workflow needed for Phase 1 — lessons are always-live. Rollback = copy old mdx_content back to lessons and increment version.

```sql
CREATE TABLE lesson_versions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id       UUID NOT NULL REFERENCES lessons(id),
  version_number  INTEGER NOT NULL,
  mdx_content     TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by      TEXT,  -- notes on what generated this version
  UNIQUE(lesson_id, version_number)
);
```

### Quiz Table Structure

**Recommendation: Single `quiz_questions` table with `question_type TEXT` discriminator.**

5 question types share enough structure (lesson_id, question_text, correct_answer, explanation) that a single table with a `question_type` column is cleaner than 5 separate tables. Type-specific fields (e.g., `options JSONB` for multiple-choice, `accepted_answers TEXT[]` for recall) use nullable columns.

### Quiz Storage Approach

**Recommendation: Separate DB records (not inline MDX).**

Quiz questions stored as structured records in `quiz_questions` table. Rendered via the custom quiz engine in Phase 4. This makes quiz data queryable for FSRS and enables the full attempt tracking schema. Inline MDX would make `quiz_attempts` table impossible to link to specific questions.

### Timestamps Strategy

**Recommendation: `created_at` and `updated_at` on every table; `deleted_at` only on content tables that support soft-delete.**

Use a Postgres trigger to automatically update `updated_at` on every UPDATE:

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Database Client Choice

**Recommendation: Supabase JS client (`@supabase/supabase-js` + `@supabase/ssr`) for Phase 1.**

Rationale: RLS enforcement is automatic when using the client correctly (anon key + Clerk token). No extra abstraction layer. Drizzle ORM connects directly to the database via connection string, bypassing RLS — would require manually recreating RLS-equivalent filtering in every query. Drizzle can be added later for complex query optimization if needed; it's not necessary for Phase 1 schema setup.

---

## Full Schema Plan

Based on requirements and discretion decisions above:

### Tables That Must Exist in Phase 1 Schema

| Table | user_id | Soft Delete | Notes |
|-------|---------|-------------|-------|
| pillars | No | deleted_at | Content is global; 7+ pillars supported |
| semesters | No | deleted_at | display_order for fixed ordering |
| courses | No | deleted_at | display_order for fixed ordering |
| lessons | No | deleted_at | mdx_content TEXT, learning_objectives TEXT[], content_version INT |
| lesson_versions | No | No | Append-only version history |
| quiz_questions | No | deleted_at | question_type discriminator, options JSONB |
| quiz_attempts | Yes (TEXT) | No | CRITICAL: must be Phase 1 even though UI is Phase 4 |
| vocabulary | No | deleted_at | pillar_scoped: same term can have different definitions per pillar |
| lesson_vocabulary | No | No | Junction: links vocabulary terms to lessons they appear in |
| progress | Yes (TEXT) | No | status: not_started / in_progress / completed |

### Tables Noted in Requirements But Not Listed Above

`lesson_connections` (from PROJECT.md) — junction table linking related lessons across pillars. Include in Phase 1 schema to support future cross-pillar features.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Clerk JWT template (shared JWT secret) | Native Clerk third-party Supabase integration | April 2025 | No more JWT secret sharing; simpler setup; no token generation overhead |
| `auth.uid()` in RLS policies with Clerk | `current_setting('request.jwt.claims', true)::json->>'sub'` | Since Clerk has always been string-based | auth.uid() never worked with Clerk; use jwt sub claim extraction |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Early 2025 | Both names work during transition period; Supabase is renaming anon key to publishable key |
| Next.js 14 | Next.js 15 | October 2024 | React 19, Turbopack, next.config.ts, uncached-by-default Route Handlers |

**Deprecated/outdated:**
- JWT Template integration: Officially deprecated April 1, 2025. Existing projects still work but new projects should use native third-party integration.
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr` — do not use the auth-helpers package for new projects.

---

## Open Questions

1. **Does `auth.uid()` work with the new native Clerk third-party integration?**
   - What we know: Multiple sources confirm `auth.uid()` does not work with Clerk because Clerk uses string IDs, not UUIDs. The JWT template approach had the same limitation. The native integration changed the setup process but not the fundamental JWT structure.
   - What's unclear: Whether Supabase updated `auth.uid()` to handle string sub claims as part of the April 2025 native integration. Official documentation is not explicit on this.
   - Recommendation: Use `current_setting('request.jwt.claims', true)::json->>'sub'` as the safe, verified approach. After Clerk is configured, run the smoke test SQL (`SELECT current_setting(...)::json->>'sub'`) to verify. If `auth.uid()` works, it's a bonus — do not rely on it without testing.

2. **Content tables: should they have user_id at all?**
   - What we know: Pillars, semesters, courses, lessons, quiz_questions, and vocabulary are global content — not per-user. The hardcoded single-user requirement (INFR-01) is about `progress` and `quiz_attempts` tables, not content tables.
   - What's unclear: STATE.md says "user_id on all tables" but content tables in a single-author system don't logically need user_id. Multi-user content (different users having different pillars) is out of scope.
   - Recommendation: Add `user_id` only to user-data tables (progress, quiz_attempts). Content tables (pillars through vocabulary) are authoritative/global — no user_id needed. RLS on content tables: SELECT open to authenticated users, INSERT/UPDATE/DELETE restricted to service role only.

3. **Vercel deployment: Next.js 15 + App Router + Clerk middleware compatibility**
   - What we know: Clerk works with Next.js via `clerkMiddleware()` in middleware.ts. Next.js 15 changed some async API behavior.
   - What's unclear: Whether `@clerk/nextjs` v6 fully supports Next.js 15's async request APIs without additional configuration.
   - Recommendation: Check `@clerk/nextjs` changelog for Next.js 15 compatibility at setup time. The Vercel deployment smoke test (INFR-03) will reveal issues immediately.

---

## Sources

### Primary (HIGH confidence)

- [Clerk Supabase Integration Guide](https://clerk.com/docs/guides/development/integrations/databases/supabase) — RLS policy syntax, client code patterns, environment variables
- [Supabase Clerk Third-Party Auth Docs](https://supabase.com/docs/guides/auth/third-party/clerk) — native integration configuration, accessToken pattern
- [Clerk Supabase Changelog (March 2025)](https://clerk.com/changelog/2025-03-31-supabase-integration) — native integration announcement, accessToken code example
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — SELECT-wrapped auth functions, indexing requirements
- [Supabase Soft Deletes Guide](https://supabase.com/docs/guides/troubleshooting/soft-deletes-with-supabase-js) — deleted_at pattern, view-based filtering
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — policy syntax, USING vs WITH CHECK, auth.uid() behavior

### Secondary (MEDIUM confidence)

- [SuperTokens: How to Integrate Clerk with Supabase](https://supertokens.com/blog/how-to-integrate-clerk-with-supabase) — confirmed auth.uid() does not work with Clerk; TEXT user_id type; `current_setting` pattern
- [Supabase RLS Discussion #33091](https://github.com/orgs/supabase/discussions/33091) — community confirmation of auth.uid() vs auth.jwt() pattern with Clerk

### Tertiary (LOW confidence)

- WebSearch aggregated results on Next.js 15 vs 14 — verified by checking Next.js docs directly for stable status

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — official docs for all libraries; versions confirmed current
- Architecture (RLS patterns): HIGH — verified via official Supabase docs + official Clerk docs + third-party source agreement
- auth.uid() limitation: HIGH — confirmed by 3+ independent sources; official Supabase/Clerk docs
- Pitfalls: HIGH for documented ones; MEDIUM for soft-delete + RLS interaction (community-sourced)
- Schema recommendations: MEDIUM — design decisions based on requirements analysis; no official "right answer"

**Research date:** 2026-02-27
**Valid until:** 2026-03-29 (30 days — Clerk and Supabase APIs are relatively stable but the native integration is recent)
