# Stack Research: Personal Learning Curriculum Platform

**Research Type:** Stack Dimension — Greenfield Project
**Date:** 2026-02-27
**Question:** What's the standard 2025/2026 stack for a Next.js + Supabase learning platform with MDX content rendering and AI-powered content generation?
**Downstream Consumer:** Roadmap creation — feeds into milestone and phase planning

---

## Summary

The proposed stack (Next.js 15 + Supabase + Clerk + Tailwind CSS + MDX via next-mdx-remote + Claude API) is well-aligned with the 2025/2026 standard for self-directed learning platforms. Several specific version choices and integration patterns need to be locked down before implementation begins. One notable consideration: Clerk and Supabase auth are partially overlapping concerns that require deliberate architecture decisions.

**Overall Confidence:** High — this stack has production validation across hundreds of SaaS and learning platforms as of early 2026.

---

## Core Framework

### Next.js 15 (App Router)

| Attribute | Value |
|-----------|-------|
| Package | `next` |
| Version | `^15.x` (latest stable as of Feb 2026) |
| Confidence | High |

**Why:**
- Next.js 15 is the current stable release with React 19 support and a stable Turbopack dev server (76% faster startup, 96% faster Fast Refresh).
- The App Router model — Server Components, Server Actions, streaming, file-based layouts — maps directly to learning platform needs: static MDX content pages, dynamic personalized dashboards, AI-generated content streamed to the client.
- `next.config.ts` (TypeScript config) is now supported natively, eliminating a long-standing friction point.
- Breaking change to be aware of: `cookies()`, `headers()`, `params`, and `searchParams` are now **async** APIs. All route handlers and middleware must `await` these.
- Breaking change to be aware of: `GET` Route Handlers are **no longer cached by default**. Supabase API routes and AI streaming endpoints must be designed with this in mind.

**What NOT to use:**
- Do NOT use the Pages Router for any new work. The App Router has feature parity and better primitives for this use case.
- Do NOT use `export const runtime = "experimental-edge"`. Use `"edge"` instead.
- Do NOT use `next/dynamic` with `ssr: false` in Server Components.

**Key configuration for this project:**
```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    after: true, // defer analytics/logging after response
  },
  serverExternalPackages: ['@anthropic-ai/sdk'], // prevent bundling issues with Claude SDK
};

export default nextConfig;
```

---

## React

| Package | Version | Confidence |
|---------|---------|------------|
| `react` | `^19.x` | High |
| `react-dom` | `^19.x` | High |

**Why:**
- Next.js 15 App Router runs React 19 by default.
- React 19 adds `use()` hook (critical for streaming AI responses), improved error boundaries, and native document metadata via `<title>`, `<meta>` in components — useful for per-lesson SEO.
- React Compiler is available as an experimental Babel plugin but adds build overhead. Do NOT enable for initial development — revisit post-MVP.

---

## Database & Backend

### Supabase

| Package | Version | Confidence |
|---------|---------|------------|
| `@supabase/supabase-js` | `^2.x` (latest) | High |
| `@supabase/ssr` | `^0.x` (latest) | High |

**Why:**
- Supabase provides Postgres (relational data for curriculum, progress tracking, user records), Row Level Security (critical for per-user learning paths), Realtime (optional: live progress updates), and Storage (for MDX assets, user uploads).
- `@supabase/ssr` is the **correct** package for Next.js App Router. Do NOT use the deprecated `@supabase/auth-helpers-nextjs` — it is no longer maintained.
- Supabase Edge Functions (Deno) can offload heavy AI pre-processing if needed later.

**Integration pattern for App Router:**
```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies() // async in Next.js 15

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

**What NOT to use:**
- Do NOT use `@supabase/auth-helpers-nextjs` — deprecated.
- Do NOT call `createClient()` with service-role key on the client side.
- Do NOT skip Row Level Security on any user-data tables.

**Data model considerations for a learning platform:**
- `curricula` → `modules` → `lessons` (hierarchical, relational)
- `user_progress` with RLS per user
- `generated_content` table for caching AI-generated lesson variants (avoid re-calling Claude API repeatedly)

---

## Authentication

### Clerk

| Package | Version | Confidence |
|---------|---------|------------|
| `@clerk/nextjs` | `^6.x` | High |

**Why:**
- Clerk provides production-ready auth with minimal integration surface: `<ClerkProvider>` wrapper, `auth()` server helper, `currentUser()`, middleware protection via `clerkMiddleware()`.
- Handles OAuth (Google, GitHub), magic links, and MFA out of the box — all relevant for a learning platform where learners should have frictionless signup.
- `@clerk/nextjs` v6+ is designed for Next.js 15 App Router with async request APIs.

**Architecture note — Clerk + Supabase:**
This is the key integration decision. You have two options:

**Option A (Recommended): Clerk for auth, Supabase for data only**
- Clerk owns identity (sessions, JWTs, user metadata)
- Supabase uses Clerk's JWT to enforce RLS via a custom JWT template
- Each Supabase query uses the Clerk user's JWT: `supabaseClient.auth.setSession({ access_token: clerkToken })`
- This is the officially supported integration pattern

**Option B: Supabase Auth + Clerk UI only**
- More complex, not recommended — mixing two auth systems creates token refresh complexity

Use Option A. The Clerk dashboard has a "Supabase" JWT template that generates compatible tokens.

**What NOT to use:**
- Do NOT use NextAuth.js (Auth.js) alongside Clerk — redundant.
- Do NOT use Supabase Auth (email/password built-in) alongside Clerk — pick one identity provider.
- Do NOT protect routes only on the client side — always use `clerkMiddleware()` in `middleware.ts`.

```ts
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/curriculum(.*)',
  '/lesson(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect()
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
```

---

## Styling

### Tailwind CSS v4

| Package | Version | Confidence |
|---------|---------|------------|
| `tailwindcss` | `^4.x` | High |
| `@tailwindcss/typography` | `^0.5.x` | High |

**Why:**
- Tailwind CSS v4 (released early 2025) introduces a CSS-first configuration model (`@theme` in CSS, no `tailwind.config.js` required), dramatically faster builds via a new Rust-based engine (Oxide), and native CSS cascade layers.
- `@tailwindcss/typography` (the `prose` plugin) is **mandatory** for learning platforms — it styles MDX-rendered content (headings, code blocks, blockquotes, lists) without manual CSS.

**What NOT to use:**
- Do NOT configure Tailwind with the v3 `tailwind.config.js` pattern if starting fresh with v4 — use CSS-native config.
- Do NOT use styled-components or Emotion alongside Tailwind — CSS-in-JS adds hydration overhead.
- Do NOT use arbitrary values excessively (`w-[347px]`) — extract to design tokens.

**Note on Shadcn/ui:**
Shadcn/ui (component copy-paste library, not a package dependency) is the standard companion to Tailwind in 2025/2026 for accessible, composable UI primitives. It uses Radix UI under the hood. Strongly recommended for: modals (lesson completion), dropdowns, progress indicators, tabs (curriculum navigation).

```bash
npx shadcn@latest init
```

---

## MDX Content Rendering

### next-mdx-remote

| Package | Version | Confidence |
|---------|---------|------------|
| `next-mdx-remote` | `^5.x` | High |
| `gray-matter` | `^4.x` | High |
| `remark-gfm` | `^4.x` | High |
| `rehype-highlight` | `^7.x` | High |
| `rehype-slug` | `^6.x` | Medium-High |
| `remark-math` | `^6.x` | Medium (only if STEM content needed) |
| `rehype-katex` | `^7.x` | Medium (only if STEM content needed) |

**Why:**
- `next-mdx-remote` (v5+) supports the App Router via its `/rsc` entrypoint. This is critical — the v4 API is not compatible with Server Components.
- Unlike `@next/mdx` (which treats MDX as file-based routes), `next-mdx-remote` allows fetching MDX content from any source: database (Supabase storage), filesystem, or AI-generated strings — all necessary for this platform.
- `gray-matter` parses YAML frontmatter for lesson metadata (title, difficulty, prerequisites, estimated time).
- `remark-gfm` adds GitHub Flavored Markdown (tables, strikethrough, task lists).
- `rehype-highlight` or `rehype-pretty-code` (preferred over highlight.js for better theme support with Shiki) for code blocks.

**App Router usage (RSC entrypoint):**
```tsx
// app/lesson/[slug]/page.tsx
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getLessonContent } from '@/lib/content'
import { mdxComponents } from '@/components/mdx'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeHighlight from 'rehype-highlight'

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params // async in Next.js 15
  const { content, frontmatter } = await getLessonContent(slug)

  return (
    <article className="prose prose-slate max-w-none dark:prose-invert">
      <MDXRemote
        source={content}
        components={mdxComponents}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypeSlug, rehypeHighlight],
          },
        }}
      />
    </article>
  )
}
```

**Alternative to consider — Contentlayer v2 / Velite:**
- Contentlayer (type-safe content layer) was popular in 2023-2024 but development stalled.
- **Velite** is the active 2025 successor: type-safe, fast, works with App Router. Consider for filesystem-based content. However, since this platform uses AI-generated content (stored in Supabase, not filesystem), `next-mdx-remote` remains the right choice.

**What NOT to use:**
- Do NOT use `@next/mdx` with `pageExtensions` for dynamic AI-generated content — it only works for filesystem-based MDX files.
- Do NOT use `next-mdx-remote` v4 or earlier with App Router — use the `/rsc` export from v5+.
- Do NOT use `react-markdown` for complex lesson content — limited plugin ecosystem and no frontmatter support.

---

## Code Syntax Highlighting (Enhanced)

| Package | Version | Confidence |
|---------|---------|------------|
| `rehype-pretty-code` | `^0.14.x` | High |
| `shiki` | `^1.x` | High |

**Why:**
- `rehype-pretty-code` + Shiki is the 2025 standard for code syntax highlighting in MDX. Shiki uses TextMate grammars and VS Code themes — the same engine as VS Code itself.
- Far superior to `highlight.js` or `prism`: line highlighting, diff view, word highlighting, copy button integration.
- Zero runtime JS — highlighting happens at build/render time on the server.

Use this instead of `rehype-highlight` if code quality in lessons matters.

---

## AI Content Generation

### Anthropic Claude API

| Package | Version | Confidence |
|---------|---------|------------|
| `@anthropic-ai/sdk` | `^0.x` (latest) | High |
| `ai` (Vercel AI SDK) | `^4.x` | High |

**Why:**
- `@anthropic-ai/sdk` is the official Anthropic client for Node.js/Edge environments.
- The **Vercel AI SDK** (`ai` package) is the recommended abstraction layer for streaming AI responses to the Next.js frontend. It provides:
  - `streamText()` — streaming text generation
  - `useChat()` / `useCompletion()` React hooks for client-side consumption
  - Built-in support for Anthropic, OpenAI, Google (model-agnostic)
  - `AIStream` utilities for Server Actions and Route Handlers
- For a learning platform: use `streamText()` with Claude for lesson generation, explanation generation, and quiz creation. Stream to client via a Route Handler.

**Pattern for AI content generation Route Handler:**
```ts
// app/api/generate/route.ts
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export const runtime = 'edge' // use Edge Runtime for streaming

export async function POST(req: Request) {
  const { topic, difficulty, prerequisites } = await req.json()

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: `You are a curriculum designer. Generate structured learning content in MDX format.`,
    prompt: `Create a lesson about: ${topic}. Difficulty: ${difficulty}. Prerequisites: ${prerequisites.join(', ')}`,
    maxTokens: 4096,
  })

  return result.toDataStreamResponse()
}
```

**What NOT to use:**
- Do NOT call the Claude API directly from Server Components on every render — cache generated content in Supabase.
- Do NOT use `fetch()` directly against the Anthropic API endpoint — use the SDK for proper error handling and type safety.
- Do NOT block the UI thread waiting for full generation — always stream.
- Do NOT store raw API responses without sanitizing — generated MDX must be validated before rendering (XSS surface).

**Model recommendation:**
- `claude-sonnet-4-6` for lesson generation (best balance of quality/speed/cost)
- `claude-haiku-3` for quick explanations, hints, and quiz generation (latency-sensitive)

---

## State Management

| Package | Version | Confidence |
|---------|---------|------------|
| `zustand` | `^5.x` | High |
| React `useState`/`useReducer` | Built-in | High |

**Why:**
- For a learning platform, global state needs are modest: current lesson position, quiz state, user preferences (dark mode), sidebar collapse.
- Zustand v5 (2025) is lightweight, TypeScript-first, no boilerplate, and works cleanly with Next.js App Router (client components only, no hydration issues when used correctly).
- Server state (curriculum data, user progress) should live in Supabase and be fetched in Server Components — not duplicated into client state.

**What NOT to use:**
- Do NOT use Redux Toolkit for this scope — over-engineered.
- Do NOT use React Context for frequently-updating state (quiz answers, progress percentage) — causes unnecessary re-renders.
- Do NOT attempt to use Zustand in Server Components — client-only.

---

## Data Fetching & Server State

No additional library needed. Use the following pattern:

- **Server Components**: fetch directly in the component body (no `useEffect`)
- **Client Components with live data**: `useSWR` or React Query (`@tanstack/react-query` v5)
- **Supabase Realtime**: built-in subscription API for live progress indicators

| Package | Version | Confidence |
|---------|---------|------------|
| `@tanstack/react-query` | `^5.x` | Medium-High |

Use React Query v5 if you need: optimistic updates (marking lessons complete), background refetching, pagination for curriculum lists. For simpler data needs, SWR is lighter.

---

## Forms

| Package | Version | Confidence |
|---------|---------|------------|
| `react-hook-form` | `^7.x` | High |
| `zod` | `^3.x` | High |
| `@hookform/resolvers` | `^3.x` | High |

**Why:**
- `react-hook-form` + `zod` is the 2025 standard for form handling in Next.js.
- Zod provides runtime type validation that mirrors TypeScript types — critical for user input going into Supabase or the AI API (quiz answers, learning goal prompts).
- The Next.js 15 `<Form>` component handles navigation forms (search, filters) — use it for curriculum search. Use `react-hook-form` for complex forms (onboarding, goal setting).

---

## TypeScript Configuration

| Config | Value |
|--------|-------|
| `strict` | `true` |
| `target` | `ES2022` |
| `moduleResolution` | `bundler` |
| Path aliases | `@/*` → `./src/*` |

Follow CLAUDE.md conventions: `interface` over `type`, no `any`, `unknown` for dynamic AI response shapes.

---

## Testing

| Package | Version | Confidence |
|---------|---------|------------|
| `vitest` | `^2.x` | High |
| `@testing-library/react` | `^16.x` | High |
| `@testing-library/user-event` | `^14.x` | High |
| `playwright` | `^1.x` | High |
| `msw` | `^2.x` | High |

**Why:**
- Vitest is faster than Jest, native ESM support, Vite-compatible.
- Playwright for E2E: test full lesson flows, AI content generation (mock the Claude API).
- MSW v2 for mocking Supabase and Claude API calls in unit/integration tests — does not require a real server.

**What NOT to use:**
- Do NOT use Jest for new projects in 2025 — migration cost is low, Vitest is faster.
- Do NOT test implementation details — test behavior (user can complete a lesson, progress is saved).

---

## Development Tools

| Tool | Version/Config | Confidence |
|------|----------------|------------|
| `eslint` | `^9.x` (flat config) | High |
| `eslint-config-next` | bundled with Next.js | High |
| `prettier` | `^3.x` | High |
| `prettier-plugin-tailwindcss` | `^0.6.x` | High |
| `typescript` | `^5.x` | High |

**Note:** Next.js 15 supports ESLint 9 with flat config format. New projects should use `eslint.config.mjs` (flat config), not `.eslintrc.json`. `eslint-config-next` supports both formats.

---

## Deployment

| Platform | Confidence |
|----------|------------|
| Vercel | High |

**Why:**
- Next.js is developed by Vercel — first-class support for App Router, Edge Runtime, streaming, ISR.
- Vercel's Edge Network pairs with Supabase's global Postgres for acceptable latency worldwide.
- Environment variable management, preview deployments, and Analytics are production-ready with zero config.

**Alternative:** Fly.io or Railway if self-hosting is required (cost optimization at scale). Add `output: 'standalone'` to `next.config.ts`.

---

## What NOT to Use (Explicit Rejections)

| Technology | Reason |
|------------|--------|
| **Prisma ORM** | Supabase already exposes typed client via PostgREST. Prisma adds complexity for a Supabase-first project. Use Supabase client directly or Drizzle ORM if SQL control is needed. |
| **tRPC** | Route Handlers + Server Actions with Zod validation covers the RPC use case without the abstraction overhead for a single-developer project. |
| **Contentlayer** | Abandoned/stalled as of 2024. Use Velite for filesystem content or next-mdx-remote for database/dynamic content. |
| **NextAuth.js / Auth.js** | Clerk replaces this entirely. Running both creates JWT conflicts. |
| **Supabase Auth** | Clerk handles authentication. Supabase Auth + Clerk is redundant auth — choose one identity provider. |
| **Redux Toolkit** | Zustand is sufficient for this scope. Redux adds bundle weight and boilerplate. |
| **GraphQL / Apollo** | Supabase's REST API and Next.js Server Actions provide typed data access without a GraphQL layer. |
| **CSS Modules** | Tailwind covers all styling needs. CSS Modules alongside Tailwind creates two systems to maintain. |
| **React Query AND SWR** | Pick one. React Query v5 is recommended for its optimistic update primitives. |
| **OpenAI API** | The platform is designed around Claude. Adding a second AI provider increases complexity without clear benefit at MVP. |

---

## Package Summary (install command)

```bash
# Core framework
npm install next@latest react@latest react-dom@latest

# Database
npm install @supabase/supabase-js @supabase/ssr

# Auth
npm install @clerk/nextjs

# Styling
npm install tailwindcss@latest @tailwindcss/typography
npx shadcn@latest init

# MDX & Content
npm install next-mdx-remote gray-matter remark-gfm rehype-pretty-code shiki rehype-slug

# AI
npm install @anthropic-ai/sdk ai @ai-sdk/anthropic

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# State
npm install zustand

# Data fetching (if needed)
npm install @tanstack/react-query

# Dev tools
npm install -D typescript eslint prettier prettier-plugin-tailwindcss vitest @testing-library/react @testing-library/user-event playwright msw
```

---

## Confidence Levels Summary

| Category | Choice | Confidence | Notes |
|----------|--------|------------|-------|
| Framework | Next.js 15 + App Router | High | Production stable, industry standard |
| Runtime | React 19 | High | Ships with Next.js 15 App Router |
| Database | Supabase + `@supabase/ssr` | High | Correct 2025 integration package |
| Auth | Clerk `@clerk/nextjs` v6 | High | Best DX, App Router native |
| Auth integration | Clerk JWT → Supabase RLS | High | Officially documented pattern |
| Styling | Tailwind CSS v4 | High | v4 is current stable |
| Component lib | Shadcn/ui | High | De facto standard companion |
| MDX | next-mdx-remote v5 (RSC) | High | Only App Router-compatible option |
| Syntax highlighting | rehype-pretty-code + Shiki | High | 2025 standard, replaces Prism |
| AI SDK | Vercel AI SDK v4 + Claude SDK | High | Best streaming DX for Next.js |
| AI model | claude-sonnet-4-6 | High | Current generation, balanced cost/quality |
| Forms | react-hook-form + zod | High | Stable, widely adopted |
| State | Zustand v5 | High | Right-sized for this scope |
| Testing | Vitest + Playwright + MSW | High | 2025 standard test stack |
| Deployment | Vercel | High | First-class Next.js support |

---

## Key Decisions Requiring Confirmation Before Implementation

1. **Clerk JWT template configuration**: Confirm the Supabase JWT template is created in the Clerk dashboard before writing any RLS policies. This is a one-time setup step that blocks all data access patterns.

2. **MDX content storage strategy**: Decide whether AI-generated lessons are stored as raw MDX strings in Supabase (recommended: `TEXT` column with a `generated_content` cache table) or as JSON AST. Raw MDX is simpler; JSON AST enables partial updates.

3. **AI generation caching**: Define the cache invalidation strategy for AI-generated content. A lesson generated once should not re-call the Claude API on every page load. Cache in Supabase with a `generated_at` timestamp and a TTL or manual refresh trigger.

4. **Edge vs Node.js Runtime for AI routes**: The Claude SDK supports both. Edge Runtime gives lower cold-start latency; Node.js Runtime allows larger payloads and longer timeouts (important for long lesson generation). Recommend Edge for streaming chat/hints, Node.js for batch lesson generation.

---

*Research conducted: 2026-02-27. Versions based on knowledge through August 2025 and live Next.js 15 release documentation. Verify package versions against npm registry before installing.*
