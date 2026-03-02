# Stack Research

**Domain:** AI content generation pipeline + spaced repetition + auth wiring — v2.0 milestone additions
**Researched:** 2026-03-02
**Confidence:** HIGH — all three feature areas verified against official docs and npm registry

---

> **Scope note:** This document covers only the NEW stack additions required for v2.0. The baseline stack (Next.js 16, Supabase, Clerk, Tailwind v4, MDX via next-mdx-remote-client) is already validated and in production. Do NOT re-install or change existing packages unless explicitly noted.

---

## What's Already Installed (Do Not Touch)

Confirmed from `package.json` as of 2026-03-02:

| Package | Installed Version | Status |
|---------|------------------|--------|
| `next` | 16.1.6 | Production — do not change |
| `@clerk/nextjs` | ^6.39.0 | Installed — needs WIRING, not new install |
| `@supabase/supabase-js` | ^2.98.0 | Production — do not change |
| `@supabase/ssr` | ^0.8.0 | Production — do not change |
| `next-mdx-remote-client` | ^2.1.9 | Production — do not change |
| `tailwindcss` | ^4 | Production — do not change |

The Clerk package is already installed. The entire Clerk v2.0 task is **wiring** (middleware activation, sign-in page route, env vars), not installation.

---

## Recommended Stack — New Additions Only

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@anthropic-ai/sdk` | `^0.78.0` | Claude API client for content generation CLI | Official Anthropic TypeScript SDK. Supports tool use (function calling with Zod), streaming SSE, automatic retries (2x by default), typed request/response objects, and `client.messages.batches` for bulk lesson generation. Requires Node.js 20 LTS+. Do NOT use via Edge Runtime for the CLI — run as a Node.js script. |
| `ts-fsrs` | `^5.2.3` | FSRS spaced repetition algorithm | Official TypeScript implementation from the open-spaced-repetition org. ES module + CJS + UMD. Endorsed by the FSRS algorithm authors as the maintained reference implementation (fsrs.js is deprecated in favor of this). Handles all four rating paths (Again/Hard/Good/Easy), card state serialization, and scheduling. Zero dependencies. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `^3.x` | Schema validation for Claude output | Use to validate MDX structure returned by Claude before inserting into Supabase. Claude output is `unknown` — never trust without validation. Also used with `betaZodTool` from `@anthropic-ai/sdk/helpers/beta/zod` for typed tool definitions in sub-agent pipelines. |
| `commander` | `^12.x` | CLI argument parsing for the generation pipeline | The content generation pipeline runs as a Node.js CLI script (not a Next.js route). `commander` is the standard for TypeScript CLI tools — typed subcommands, help text, option parsing. Alternative: `yargs`. |
| `p-limit` | `^6.x` | Concurrency control for bulk lesson generation | When generating 598 lessons, you cannot fire all Claude API calls simultaneously. `p-limit` caps concurrent requests (recommend 3-5) to avoid rate limiting. ESM-only in v6+. |
| `tsx` | `^4.x` | Run TypeScript CLI scripts directly | The generation pipeline is a `.ts` file run outside Next.js. `tsx` (uses esbuild) runs TypeScript natively without a compile step. Faster than `ts-node`. Install as dev dependency. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `dotenv` (built-in via Next.js) | Env var loading in CLI context | Next.js loads `.env.local` automatically for the dev server. The CLI script runs outside Next.js and needs explicit env loading: `import 'dotenv/config'` at top of script OR pass `--env-file .env.local` to Node (Node 20.6+ supports `--env-file`). |
| `ANTHROPIC_API_KEY` env var | Claude API authentication | Required. Set in `.env.local` for local runs, Vercel environment variables for any server-side usage. Never commit to git. |

---

## Installation

```bash
# Content generation pipeline
npm install @anthropic-ai/sdk zod commander p-limit

# FSRS spaced repetition
npm install ts-fsrs

# CLI dev tooling
npm install -D tsx
```

**Clerk is already installed** (`@clerk/nextjs@^6.39.0`). No install needed — only wiring.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@anthropic-ai/sdk` direct | Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) | Use Vercel AI SDK if building streaming UI responses (chat, hints). For the offline CLI pipeline, the direct SDK is simpler — no framework abstraction needed, better control over batch API and tool loops. |
| `ts-fsrs` | `@squeakyrobot/fsrs` | @squeakyrobot/fsrs supports FSRS v4.5 + optional v6. Use if ts-fsrs lags behind algorithm spec updates. As of 2026-03 ts-fsrs is at v5.x (tracking FSRS v5). |
| `ts-fsrs` | `simple-ts-fsrs` | Only if you want zero dependencies and a minimal footprint. simple-ts-fsrs lacks `RecordLog`, advanced parameters, and is not maintained by the official org. Not recommended for production. |
| `commander` | `yargs` | yargs has a larger API surface and more plugins. Use if you need complex nested CLI commands. For a single-purpose generation script, commander is simpler. |
| `tsx` | `ts-node` | ts-node is slower (tsc-based, not esbuild). Use ts-node only if you need `--require` hooks or older Node compatibility. tsx is the 2025 default. |
| `p-limit` | Manual `Promise.all` chunking | Manual chunking is fine for small fixed batches. `p-limit` is cleaner for dynamic workloads where you don't know the count upfront and want a sliding window. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@anthropic-ai/claude-agent-sdk` for the content pipeline | The Claude Agent SDK is for programmatic Claude Code (agentic file/code operations). The content pipeline needs the Messages API with tool use, not Claude Code subprocess execution. Completely different use case. | `@anthropic-ai/sdk` direct |
| `ai` (Vercel AI SDK) for the CLI pipeline | Vercel AI SDK adds streaming/UI abstractions that are unnecessary and add latency overhead for a batch CLI process. Streaming output to a terminal is not the goal; inserting complete MDX into Supabase is. | `@anthropic-ai/sdk` direct |
| `fsrs.js` | Deprecated. The open-spaced-repetition org has officially redirected to `ts-fsrs`. No new features, likely unmaintained. | `ts-fsrs` |
| SM-2 implementations | Project has already decided on FSRS (20-30% fewer reviews for same retention). SM-2 is what Anki used before switching to FSRS. | `ts-fsrs` |
| Supabase Edge Functions for content generation | Edge (Deno) has a 50ms CPU limit and no persistent connections — incompatible with multi-step Claude tool-use loops that take 10-60s. Generation must run on Node.js. | Node.js CLI script invoked locally or via CI |
| `authMiddleware()` from Clerk | Deprecated in Clerk v5+. Do not use. | `clerkMiddleware()` from `@clerk/nextjs/server` |
| `middleware.ts` filename for Next.js 16 | Next.js 16 changed the middleware filename. The old `middleware.ts` at the root is replaced by `proxy.ts`. The code inside is identical — only the filename changes. | `proxy.ts` at project root or `src/proxy.ts` |

---

## Stack Patterns by Feature

**Content Generation Pipeline (CLI):**
- Script entry: `scripts/generate-lesson.ts` — run with `npx tsx scripts/generate-lesson.ts`
- Load env with `--env-file .env.local` (Node 20.6+) or `import 'dotenv/config'`
- Use `new Anthropic()` — reads `ANTHROPIC_API_KEY` automatically from env
- Multi-step generation pattern: orchestrator call → research sub-agent tool → content generation call
- Use `client.messages.toolRunner()` with `betaZodTool()` for typed tool definitions
- Rate-limit concurrent lessons with `p-limit` (cap at 3-5 concurrent)
- Validate output with Zod before `supabase.from('lessons').upsert()`
- Use `client.messages.batches` namespace for bulk generation of fixed lesson sets

**FSRS Spaced Repetition:**
- `createEmptyCard()` → creates new card when quiz question is first answered
- `f.repeat(card, new Date())` → returns `RecordLog` with all four rating outcomes
- Store `Card` fields in Supabase: `due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `reps`, `lapses`, `state`, `last_review`
- Query due cards: `WHERE due <= NOW() AND user_id = $1`
- On rating: `f.next(card, reviewDate, rating)` → get next `Card` state + `ReviewLog`
- Save both updated `Card` and new `ReviewLog` row transactionally
- Dashboard widget: single Supabase query counting `WHERE due <= NOW()` — no algorithm needed at read time

**Clerk Auth Wiring (no new install — configuration only):**
- Rename/create `src/proxy.ts` (Next.js 16 filename, NOT `middleware.ts`)
- Use `clerkMiddleware()` + `createRouteMatcher()` from `@clerk/nextjs/server`
- Protect: `/dashboard(.*)`, `/pillar(.*)`, `/lesson(.*)`, `/review(.*)`
- Public: `/`, `/sign-in(.*)`, `/api/webhooks/(.*)` (if added later)
- Sign-in page: `app/sign-in/[[...sign-in]]/page.tsx` — render `<SignIn />` from `@clerk/nextjs`
- Required env vars: `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard`, `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard`
- Supabase RLS: existing JWT claim pattern (`auth.jwt() ->> 'sub'`) stays unchanged — Clerk JWT template already configured from v1.0

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@anthropic-ai/sdk@^0.78.0` | Node.js 20 LTS+ | Node 20 is the minimum. Next.js 16 ships with Node 20 support on Vercel. The SDK cannot be used in Edge Runtime (no `fs`, no `net`). |
| `ts-fsrs@^5.2.3` | Node.js 18.0.0+ | v4+ requires Node 18; v5 is current. Works in both Next.js Server Components and Edge Runtime (pure TypeScript, no native deps). |
| `@clerk/nextjs@^6.39.0` | Next.js 16 | v6.39 added Next.js 16 support. Proxy.ts filename is required for Next.js 16 (not middleware.ts). |
| `zod@^3.x` | All runtimes | Pure TypeScript, no native deps, Edge-compatible. |
| `commander@^12.x` | Node.js 18+ | CLI only — never import in Next.js routes. |
| `p-limit@^6.x` | Node.js 18+, ESM | v6 is ESM-only. If you get import errors, add `"type": "module"` to the CLI script's package scope OR use dynamic import. |
| `tsx@^4.x` | Node.js 18+ | Dev dependency only. Not in production bundle. |

---

## Sources

- [github.com/anthropics/anthropic-sdk-typescript](https://github.com/anthropics/anthropic-sdk-typescript) — official SDK repo, streaming and tool use patterns (HIGH confidence)
- [platform.claude.com/docs/en/api/sdks/typescript](https://platform.claude.com/docs/en/api/sdks/typescript) — official TypeScript SDK docs, verified tool runner, batch API (HIGH confidence)
- [npmjs.com/package/@anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk) — version 0.78.0 confirmed (HIGH confidence)
- [github.com/open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) — ts-fsrs core API: createEmptyCard, FSRS, repeat, next, RecordLog types (HIGH confidence)
- [npmjs.com/package/ts-fsrs](https://www.npmjs.com/package/ts-fsrs) — version 5.2.3 confirmed, Node 18+ minimum (HIGH confidence)
- [github.com/ishiko732/ts-fsrs-demo](https://github.com/ishiko732/ts-fsrs-demo) — reference Next.js + PostgreSQL integration pattern (MEDIUM confidence)
- [clerk.com/docs/reference/nextjs/clerk-middleware](https://clerk.com/docs/reference/nextjs/clerk-middleware) — proxy.ts vs middleware.ts, createRouteMatcher patterns (HIGH confidence)
- [clerk.com/docs/nextjs/getting-started/quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart) — ClerkProvider, env vars, @clerk/nextjs v6.39 (HIGH confidence)
- [clerk.com/docs/nextjs/guides/development/custom-sign-in-or-up-page](https://clerk.com/docs/nextjs/guides/development/custom-sign-in-or-up-page) — sign-in page route structure and required env vars (HIGH confidence)
- [npmjs.com/package/@clerk/nextjs](https://www.npmjs.com/package/@clerk/nextjs) — version 6.39.0 confirmed (HIGH confidence)

---

*Stack research for: v2.0 Content & Retention milestone — AI pipeline, FSRS, Clerk auth wiring*
*Researched: 2026-03-02*
*Scope: additions only — baseline stack unchanged from v1.0*
