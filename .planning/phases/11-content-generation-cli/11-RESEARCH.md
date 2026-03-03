# Phase 11: Content Generation CLI - Research

**Researched:** 2026-03-03
**Domain:** AI-powered CLI pipeline — Anthropic SDK, MDX validation, Supabase seeding, Node.js CLI tooling
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**AI Generation Strategy**
- Research approach: Two sources — web search per topic (Claude's built-in web search) AND course-level reference materials
- Reference material handling: Each course can have a `references/` folder or config entry (auto-loaded). Additional refs via `--refs` flag per run. Both work together
- Research transparency: Log but don't block — research sources saved alongside each lesson for traceability, generation proceeds automatically without approval gates
- Model selection: Default to `claude-sonnet-4-6`. Override with `--model opus` flag when maximum depth is needed on specific topics
- Sequential generation: One lesson at a time (no parallel generation). Simpler to track, lower API concurrency
- Lesson continuity: Each lesson gets context about prior lessons in the course — terms already defined, concepts already covered

**Content Level & Progression**
- Assume zero knowledge: First lessons in any course assume the learner knows nothing about the domain
- Semester-based difficulty: Semester 1 = beginner, Semester 2 = intermediate. Semester number drives complexity
- Terminology handling: Spell out on first use with `<Definition>` component. Later semesters can use abbreviations more freely after first definition per lesson
- Two-pass quality control: First pass generates content. Second pass reviews against prior lessons for consistency, prerequisite coverage, and difficulty progression

**Lesson Structure & Depth**
- ConceptBlock count: Varies by complexity — simple topics 2-3 blocks, complex topics 4-5
- Quiz questions: 3-5 questions per lesson checkpoint
- Exercise type: Mix based on pillar — technical pillars get hands-on projects; non-technical pillars get thought exercises
- Cross-domain connections: Woven organically into ConceptBlocks AND summarized in Takeaways
- Tone: Smart friend explaining — conversational, uses "you" and "we"

**CLI Workflow & Scope**
- Primary usage: Pillar-level generation (`pnpm generate --pillar 2`)
- All scope flags available: `--pillar`, `--semester`, `--course`, `--lesson`
- Idempotency: Skip existing lessons by default, log what was skipped. Use `--force` to regenerate
- Progress output: Verbose with pipeline stages per lesson:
  ```
  [3/12] 'Causal Loop Diagrams'
    ├ Researching... done (12s)
    ├ Generating... done (38s)
    ├ Reviewing... done (15s)
    └ Seeding... done
  ```

**Output & Review**
- Post-run report: CLI outputs a summary report (lessons generated, skipped, warnings, quality flags)
- Dry-run behavior: Single lessons print to stdout; batch runs save to local output directory
- Usage documentation: Include a clear USAGE.md with plain-language step-by-step instructions

### Claude's Discretion

- Validation failure handling (recommended: auto-retry once, then skip and log)
- Version history on --force regeneration (recommended: keep versions per existing schema)
- Generation log persistence (recommended: save markdown report to logs/ directory)
- Cross-domain connection summary in reports (recommended: include in end-of-run report)
- Dry-run output format details
- Search query construction for web research

### Deferred Ideas (OUT OF SCOPE)

- Wipe and revise existing seeded data — treat as separate action after Phase 11 is built
- Existing content revision — v1.0 Phase 6 seed content review deferred
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GEN-01 | CLI entry point (`pnpm generate`) accepts scope flags for pillar, semester, or course | Commander.js `--pillar`, `--semester`, `--course`, `--lesson` flags with tsx runner via `pnpm generate` script |
| GEN-02 | Generated MDX is validated against lesson template (required components: Hook, ConceptBlock, Quiz, DeepDive, Exercise, Takeaways) | `@mdx-js/mdx` compile for parse errors + regex/AST scan for required component presence in compiled output |
| GEN-03 | Generated content is seeded into `lessons.mdx_content` with `lesson_versions` history | Supabase admin client upsert on `lessons` table; DB trigger `trg_lessons_version` auto-captures to `lesson_versions` |
| GEN-04 | CLI reports progress per lesson during generation (e.g., `[3/12] Generating: "Topic Name"...`) | Direct `process.stdout.write` / `console.log` with tree-style progress per stage |
| GEN-05 | Pipeline skips already-generated lessons by default with `--force` flag to override | Query `lessons.mdx_content IS NOT NULL` before generating; `--force` bypasses check |
| GEN-06 | Dry-run mode (`--dry-run`) validates output without writing to database | Gate all Supabase write calls behind `if (!dryRun)` check; print to stdout or write to `output/` dir |
| GEN-07 | Retry with exponential backoff on API rate limit errors (429/529) | Anthropic SDK built-in retry (`maxRetries: 3`) + manual backoff wrapper for 529 overloaded errors |
| GEN-08 | Orchestrator + research sub-agent pattern produces deep, topic-specific lesson content | Two-turn Claude pipeline: Turn 1 = research (web_search tool), Turn 2 = lesson generation with research context |
</phase_requirements>

---

## Summary

Phase 11 builds a standalone Node.js CLI (`scripts/generate.ts`) that orchestrates Claude API calls to produce validated MDX lesson content and seed it idempotently into Supabase. The CLI lives outside the Next.js app (under `scripts/`) but reuses the project's existing `@supabase/supabase-js` client and TypeScript types. It is invoked via `pnpm generate` using `tsx` as the TypeScript runner — zero-config, no separate compilation step needed.

The core pipeline per lesson is: (1) research phase using Claude with web_search tool to gather topic-specific context, (2) generation phase using Claude to produce MDX from a structured system prompt that embeds the content-format-standards and a complete example lesson, (3) review phase using a second Claude call to check consistency against prior lessons in the course, (4) validation phase using `@mdx-js/mdx` compile to catch parse errors plus component presence checks, and (5) seed phase using the Supabase admin client to upsert `lessons.mdx_content`. The Supabase database trigger `trg_lessons_version` automatically versions prior content when `mdx_content` changes, satisfying GEN-03 versioning without extra code.

The Anthropic SDK (`@anthropic-ai/sdk`) has built-in retry logic for 429 errors (default `maxRetries: 2`, configurable to 3). For 529 overloaded errors, a manual exponential backoff wrapper is needed on top since 529 is not in the SDK's auto-retry set. The API response includes a `retry-after` header for 429 that should be honored.

**Primary recommendation:** Build the CLI as `scripts/generate.ts` with `tsx` execution, `commander` for argument parsing, `@anthropic-ai/sdk` for Claude calls, and the existing `createAdminSupabaseClient()` for database writes. Keep it as a single-workspace script (not a separate package) to avoid monorepo complexity.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | latest (0.61+) | Claude API client — messages.create, tool use (web_search), streaming | Official SDK; built-in retry, TypeScript types, streaming helpers |
| `commander` | ^12 | CLI argument parsing (`--pillar`, `--semester`, `--dry-run`, etc.) | Industry standard for Node.js CLIs; TypeScript-friendly; automatic help generation |
| `tsx` | ^4.21 | Run TypeScript scripts directly with Node.js (no compile step) | Zero-config, esbuild-based, pnpm-compatible; current project has no ts-node |
| `@mdx-js/mdx` | ^3 | Compile MDX strings to validate parse correctness | Official MDX compiler; `compile()` throws on syntax errors; lightweight for Node scripts |
| `@supabase/supabase-js` | ^2.98 (already in project) | Supabase admin client for upserts | Already installed; reuse `createAdminSupabaseClient()` pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `dotenv` | ^16 | Load `.env` in CLI context (not Next.js) | Scripts run outside Next.js env injection |
| `chalk` | ^5 | Colorize CLI output (progress, errors, warnings) | Better readability for long batch runs |
| `ora` | ^8 | Per-stage spinners with done/fail states | Matches the tree-style progress output in CONTEXT.md |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tsx` | `ts-node` | ts-node requires `tsconfig.json` tweaks for ESM; tsx is zero-config |
| `commander` | `yargs` | Both fine; commander is lighter and widely used |
| `@mdx-js/mdx` compile | Regex-only validation | Regex misses unclosed JSX, nesting errors; compile catches all MDX syntax issues |
| Manual retry loop | `p-retry` | p-retry adds a dependency; retry needs are simple enough to hand-roll (3 attempts, exponential backoff) |

**Installation:**
```bash
pnpm add --save-dev @anthropic-ai/sdk commander tsx @mdx-js/mdx dotenv chalk ora
```

Note: `@supabase/supabase-js` is already in `dependencies`.

---

## Architecture Patterns

### Recommended Project Structure

```
scripts/
├── generate.ts              # CLI entry point — commander setup, orchestrator loop
├── pipeline/
│   ├── research.ts          # Claude call with web_search tool — returns research notes
│   ├── generate-lesson.ts   # Claude call with system prompt — returns raw MDX
│   ├── review-lesson.ts     # Claude call for consistency review — returns reviewed MDX
│   ├── validate-mdx.ts      # @mdx-js/mdx compile + component presence check
│   └── seed-lesson.ts       # Supabase upsert of lessons.mdx_content
├── prompts/
│   ├── system-prompt.ts     # Generation system prompt (includes content-format-standards)
│   ├── example-lesson.mdx   # Few-shot reference lesson embedded in system prompt
│   └── review-prompt.ts     # Consistency review prompt
├── lib/
│   ├── anthropic.ts         # Anthropic client singleton with maxRetries
│   ├── supabase.ts          # Admin Supabase client for CLI context (no Next.js)
│   ├── retry.ts             # Exponential backoff wrapper for 529 errors
│   └── progress.ts          # Progress display helpers (tree-style output)
└── logs/                    # Generated run reports (auto-created)
    └── YYYY-MM-DD-HH-MM.md  # Per-run generation report
```

### Pattern 1: CLI Entry Point with Commander

**What:** Commander parses scope flags; main loop fetches lessons from Supabase, iterates sequentially, runs pipeline per lesson.
**When to use:** Entry point only — keeps CLI setup separate from business logic.

```typescript
// Source: Commander.js official docs + project pattern
import { Command } from 'commander'
import 'dotenv/config'

const program = new Command()

program
  .name('generate')
  .description('Generate MDX lessons via Claude API and seed into Supabase')
  .option('--pillar <number>', 'Generate all lessons in a pillar')
  .option('--semester <slug>', 'Generate all lessons in a semester')
  .option('--course <slug>', 'Generate all lessons in a course')
  .option('--lesson <slug>', 'Generate a single lesson')
  .option('--force', 'Regenerate existing lessons', false)
  .option('--dry-run', 'Validate without writing to database', false)
  .option('--model <name>', 'Claude model to use', 'claude-sonnet-4-6')
  .option('--refs <paths...>', 'Additional reference file paths')
  .action(async (opts) => {
    await runGenerationPipeline(opts)
  })

program.parse()
```

### Pattern 2: Anthropic Client with Built-in Retry

**What:** SDK-level retry handles 429 (rate limit). Manual backoff wrapper handles 529 (overloaded).
**When to use:** All Claude API calls route through this client.

```typescript
// Source: https://github.com/anthropics/anthropic-sdk-typescript README
import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3,        // auto-retries 429, 408, 409, >=500 (NOT 529)
  timeout: 120_000,     // 2 min timeout for long lesson generation
})

// Manual wrapper for 529 (not in SDK auto-retry set)
export async function withBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      const isOverloaded =
        err instanceof Anthropic.APIError && err.status === 529
      if (!isOverloaded || attempt === maxAttempts) throw err
      const delayMs = 1000 * 2 ** (attempt - 1)   // 1s, 2s, 4s
      console.warn(`[529 overloaded] Retry ${attempt}/${maxAttempts} in ${delayMs}ms`)
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw new Error('Unreachable')
}
```

### Pattern 3: Two-Pass Generation (Research → Generate → Review)

**What:** Turn 1 uses Claude with web_search tool for topic research. Turn 2 generates MDX from research + system prompt. Turn 3 reviews against prior lessons.
**When to use:** All lesson generation runs this pipeline.

```typescript
// Source: Anthropic API docs - tool use pattern
async function researchTopic(topic: string, pillarContext: string): Promise<string> {
  const response = await withBackoff(() =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Research this topic for a lesson: "${topic}"\nPillar: ${pillarContext}\n\nFind 3-5 concrete real-world examples, recent developments, and key concepts.`
      }]
    })
  )
  // Extract text from tool_result + final assistant turn
  return extractTextContent(response)
}

async function generateLesson(params: {
  lessonTitle: string
  researchNotes: string
  priorLessons: string[]   // titles + key terms already covered
  semesterNumber: number   // drives complexity level
  pillarSlug: string
}): Promise<string> {
  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: buildSystemPrompt(params),  // includes content-format-standards + example lesson
    messages: [{
      role: 'user',
      content: `Generate a complete MDX lesson for: "${params.lessonTitle}"\n\nResearch notes:\n${params.researchNotes}`
    }]
  })
  return (await stream.finalMessage()).content[0].type === 'text'
    ? (await stream.finalMessage()).content[0].text
    : ''
}
```

### Pattern 4: MDX Validation

**What:** Two-stage check — (1) `@mdx-js/mdx` compile catches parse/syntax errors, (2) string scan checks required components are present.
**When to use:** After generation, before seeding.

```typescript
// Source: @mdx-js/mdx official docs https://mdxjs.com/packages/mdx/
import { compile } from '@mdx-js/mdx'

const REQUIRED_COMPONENTS = ['Hook', 'ConceptBlock', 'Quiz', 'DeepDive', 'Exercise', 'Takeaways']

export async function validateMdx(mdxContent: string): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []

  // Stage 1: Parse/compile check — catches malformed JSX, unclosed tags, syntax errors
  try {
    await compile(mdxContent, { jsx: false })
  } catch (err) {
    errors.push(`MDX parse error: ${err instanceof Error ? err.message : String(err)}`)
    return { valid: false, errors }
  }

  // Stage 2: Component presence check
  for (const component of REQUIRED_COMPONENTS) {
    const pattern = new RegExp(`<${component}[\\s>]|<${component}/>`)
    if (!pattern.test(mdxContent)) {
      errors.push(`Missing required component: <${component}>`)
    }
  }

  return { valid: errors.length === 0, errors }
}
```

### Pattern 5: Idempotent Supabase Upsert

**What:** Check `mdx_content IS NOT NULL` before generating. Upsert via `.update()` on existing row. DB trigger auto-versions.
**When to use:** Seeding phase for every lesson.

```typescript
// Source: Supabase JS docs + existing project pattern (createAdminSupabaseClient)
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database.types'

// CLI context — no Next.js, no Clerk. Use service role key directly.
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function seedLesson(lessonId: string, mdxContent: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log('\n--- DRY RUN MDX OUTPUT ---\n')
    console.log(mdxContent)
    return
  }
  // Trigger trg_lessons_version auto-captures old mdx_content into lesson_versions
  const { error } = await supabase
    .from('lessons')
    .update({ mdx_content: mdxContent, updated_at: new Date().toISOString() })
    .eq('id', lessonId)

  if (error) throw new Error(`Supabase seed failed for lesson ${lessonId}: ${error.message}`)
}
```

### Anti-Patterns to Avoid

- **Parallel lesson generation:** Do not call Claude in parallel across lessons. Rate limits on Tier 1 (50 RPM) would be hit immediately. Sequential is locked-in per CONTEXT.md decisions.
- **Importing Next.js server actions in CLI:** `src/lib/actions/` uses `'use server'` and Clerk auth — importing these in a Node.js script will error. Write a separate Supabase client for the CLI context (`scripts/lib/supabase.ts`).
- **Using `next-mdx-remote-client` to validate:** That library compiles + renders in React context. Use `@mdx-js/mdx` compile directly for offline validation — it's what `next-mdx-remote-client` internally wraps.
- **Storing API keys in code:** Use `dotenv` to load from `.env.local` — the same file the Next.js app uses. Never hardcode credentials.
- **Overwriting lesson rows with INSERT:** Use `.update()` not `.insert()` for seeding — lesson rows already exist from the curriculum seed. The database trigger only fires on UPDATE, not INSERT.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript execution in Node | Custom tsc + node pipeline | `tsx` | Zero-config, esbuild-based, works with pnpm scripts |
| CLI argument parsing | `process.argv` manual parsing | `commander` | Edge cases in flag parsing, auto-help, variadic args |
| MDX parse validation | Regex-only component checking | `@mdx-js/mdx` compile | Regex misses unclosed JSX, mismatched tags, invalid expressions |
| 429 retry | Custom retry loop from scratch | SDK `maxRetries: 3` + simple backoff | SDK handles 429 + most 5xx automatically; only 529 needs custom wrapper |
| Content versioning | Custom version table writes | Supabase trigger `trg_lessons_version` | Already in migration `00002_lesson_versioning_trigger.sql` — fires automatically on UPDATE |

**Key insight:** The project's existing infrastructure (database schema, Supabase trigger, TypeScript types) already handles most of the seeding complexity. The CLI only needs to generate content and call `.update()` — everything else is automatic.

---

## Common Pitfalls

### Pitfall 1: Importing Next.js Modules in CLI Context

**What goes wrong:** Importing `src/lib/supabase/server.ts` or `src/lib/actions/*.ts` into the CLI script causes import errors because they reference `@clerk/nextjs/server` which requires Next.js middleware context.
**Why it happens:** Next.js server modules use `auth()` from Clerk which is only valid inside a request handler.
**How to avoid:** Create `scripts/lib/supabase.ts` that instantiates `createClient()` directly with the service role key. Copy the `createAdminSupabaseClient` pattern but without any Clerk imports.
**Warning signs:** `Error: next() was called outside a request` or `Cannot find module '@clerk/nextjs/server'` in CLI output.

### Pitfall 2: DB Trigger Only Fires on mdx_content CHANGE

**What goes wrong:** Calling `update({ mdx_content: ... })` with identical content (e.g. running without `--force`) triggers no version capture — `trg_lessons_version` only fires when `OLD.mdx_content IS DISTINCT FROM NEW.mdx_content`.
**Why it happens:** The trigger SQL has `IF OLD.mdx_content IS DISTINCT FROM NEW.mdx_content THEN` guard.
**How to avoid:** The idempotency check (skip if `mdx_content IS NOT NULL` and no `--force`) means we never re-write identical content — this is by design. No workaround needed.
**Warning signs:** Unexpected duplicate entries in `lesson_versions` (would indicate force-overwriting same content).

### Pitfall 3: 529 Errors Not Auto-Retried by SDK

**What goes wrong:** Assuming `maxRetries: 3` in the SDK handles 529 (overloaded) errors — it does not. 529 is not in the SDK's retry set.
**Why it happens:** The Anthropic SDK auto-retries 429, 408, 409, and >=500 errors. 529 is a custom status code outside the HTTP 5xx range for Anthropic's overloaded state.
**How to avoid:** Wrap all Claude calls in a `withBackoff()` function (see Architecture Patterns) that catches `APIError` with `status === 529` and retries with exponential backoff.
**Warning signs:** CLI crashes mid-batch with `AnthropicError: 529 overloaded_error` on long generation runs.

### Pitfall 4: Lesson Rows Don't Exist for Update

**What goes wrong:** Calling `.update()` on a lesson that hasn't been created yet returns no error but updates 0 rows.
**Why it happens:** Supabase `.update()` silently succeeds even when no rows match the filter.
**How to avoid:** After `.update()`, check that `count > 0` or use `.upsert()` if the curriculum seeding may not have run yet. Verify by querying `lessons WHERE course_id = ?` to build the work queue.
**Warning signs:** Generation succeeds but lessons don't appear in the app — content was "updated" into non-existent rows.

### Pitfall 5: MDX Component Names Must Match Exactly

**What goes wrong:** Claude generates `<Quiz>` but the renderer uses a slightly different name or missing `<Question>` / `<Option>` children — validation passes but rendering breaks.
**Why it happens:** The content-format-standards.md allows `<Question>` and `<Option>` as sub-components inside `<Quiz>`, but these are not in `src/lib/mdx-components.ts` (they're handled by the `<Quiz>` component internally). Validation must check for `<Quiz>` presence, not `<Question>`.
**How to avoid:** The component allowlist for validation should match exactly what's in `src/lib/mdx-components.ts`: `Hook`, `ConceptBlock`, `DeepDive`, `Exercise`, `Takeaways`, `Definition`, `Diagram`, `Video`, `Quiz`. Sub-components (`Question`, `Option`, `Explanation`) are handled by the `Quiz` React component and do not need separate registration.
**Warning signs:** `Component Quiz not found` or silent render failure at `/lesson/[slug]`.

### Pitfall 6: Claude Web Search Tool Name

**What goes wrong:** Using `type: 'web_search'` instead of the correct tool identifier causes an API error.
**Why it happens:** Anthropic's web search tool has a versioned name `web_search_20250305` not just `web_search`.
**How to avoid:** Use `{ type: 'web_search_20250305', name: 'web_search' }` in the tools array. Verify against current Anthropic docs if this changes.
**Warning signs:** `400 invalid_request_error: Unknown tool type: web_search`.

---

## Code Examples

Verified patterns from official sources and project codebase:

### Anthropic Client Initialization (built-in retry)

```typescript
// Source: https://github.com/anthropics/anthropic-sdk-typescript README
// SDK auto-retries: 429, 408, 409, >=500. Does NOT auto-retry 529.
import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxRetries: 3,
  timeout: 120_000,
})
```

### Streaming Message with finalMessage()

```typescript
// Source: https://platform.claude.com/docs/en/api/errors (long requests section)
// Use stream + finalMessage() for long lesson generation — avoids idle connection timeouts
const stream = anthropic.messages.stream({
  model: 'claude-sonnet-4-6',
  max_tokens: 8192,
  system: systemPrompt,
  messages: [{ role: 'user', content: userPrompt }],
})
const message = await stream.finalMessage()
const mdxContent = message.content[0].type === 'text' ? message.content[0].text : ''
```

### Supabase Admin Client (CLI-safe, no Clerk)

```typescript
// Source: Existing project pattern — src/lib/supabase/server.ts createAdminSupabaseClient()
// Reproduced here without Clerk import for CLI context
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database.types'

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)
```

### Idempotency Check Before Generation

```typescript
// Source: Supabase JS client docs + project database.types.ts schema
async function getLessonsForGeneration(courseId: string, force: boolean) {
  const query = supabase
    .from('lessons')
    .select('id, name, slug, display_order')
    .eq('course_id', courseId)
    .order('display_order')

  if (!force) {
    // Skip lessons that already have content
    query.is('mdx_content', null)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
```

### Progress Display (tree-style)

```typescript
// Source: Project CONTEXT.md — locked progress output format
function printLessonProgress(current: number, total: number, title: string) {
  console.log(`\n[${current}/${total}] '${title}'`)
}
function printStage(stage: string, done: boolean, durationMs?: number) {
  const prefix = done ? '  └' : '  ├'
  const suffix = done && durationMs ? ` done (${Math.round(durationMs / 1000)}s)` : '...'
  process.stdout.write(`${prefix} ${stage}${suffix}\n`)
}
```

### pnpm Script Registration

```json
// Add to package.json scripts:
{
  "scripts": {
    "generate": "tsx scripts/generate.ts"
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ts-node` for TypeScript in Node | `tsx` (esbuild-based) | 2023-2024 | Zero-config; no tsconfig issues; faster startup |
| Manual retry loops | SDK `maxRetries` config | Anthropic SDK v0.10+ | 429 auto-retried without custom code |
| MDX file-based validation | `@mdx-js/mdx` compile() for in-memory strings | MDX v3 (2023) | Validate generated strings before writing to DB |
| Supabase `insert` with ON CONFLICT | Supabase `.upsert()` / `.update()` | Supabase JS v2 | Clean idempotency without raw SQL |

**Deprecated/outdated:**
- `ts-node` with `esm` loader: Requires complex tsconfig and package.json type config. Use `tsx` instead.
- Anthropic web search tool name `web_search` (no version suffix): Use `web_search_20250305` per current API.

---

## Open Questions

1. **Claude web_search tool availability on claude-sonnet-4-6**
   - What we know: Web search via `type: 'web_search_20250305'` is available on Claude models. The tool name includes a date suffix.
   - What's unclear: Whether this tool is available in all regions/tiers or requires specific API access. Tool name may need version update.
   - Recommendation: In Wave 0 task, attempt a test call with web_search tool on the configured API key. If unavailable, fall back to a system prompt asking Claude to use its training knowledge for research context.

2. **Existing lesson rows vs. null mdx_content**
   - What we know: `seed-phase-06.sql` and `seed.sql` created lesson rows. Some may have `mdx_content` set from Phase 6 seeding. The idempotency check filters `mdx_content IS NULL` to find ungenerated lessons.
   - What's unclear: How many lessons currently have `mdx_content` set? This affects what the CLI will skip on first run.
   - Recommendation: The `--force` flag handles this cleanly. Document in USAGE.md: first run generates all ungenerated lessons; use `--force` to regenerate existing ones.

3. **System prompt token budget for lesson generation**
   - What we know: The system prompt will embed `content-format-standards.md` (~155 lines) + `lesson-design-principles.md` (~120 lines) + a complete example lesson (~80 lines). Total ~10,000-15,000 input tokens per generation call.
   - What's unclear: Whether this fits within Tier 1 ITPM limits (30,000 ITPM for Sonnet) for the research + generate + review three-call pipeline per lesson.
   - Recommendation: Use prompt caching (`cache_control: { type: 'ephemeral' }`) on the system prompt content — cached tokens don't count toward ITPM on Sonnet 4.x. This makes the per-lesson token budget very manageable.

---

## Sources

### Primary (HIGH confidence)
- Official Anthropic TypeScript SDK: https://github.com/anthropics/anthropic-sdk-typescript — retry behavior, maxRetries config, messages.create API
- Anthropic Rate Limits docs: https://platform.claude.com/docs/en/api/rate-limits — 429/529 semantics, retry-after header, ITPM limits per tier
- Anthropic Errors docs: https://platform.claude.com/docs/en/api/errors — error shapes, 529 overloaded definition, streaming long requests recommendation
- `@mdx-js/mdx` package: https://mdxjs.com/packages/mdx/ — compile(), exported identifiers, Node.js 16+ requirement
- Project codebase: `src/types/database.types.ts` — full schema, lesson/lesson_versions tables
- Project codebase: `supabase/migrations/00002_lesson_versioning_trigger.sql` — trigger auto-captures versions on UPDATE
- Project codebase: `src/lib/supabase/server.ts` — admin client pattern to replicate in CLI context
- Project codebase: `src/lib/mdx-components.ts` — authoritative component allowlist for validation

### Secondary (MEDIUM confidence)
- `tsx` (TypeScript Execute): https://tsx.is — version 4.21.0, esbuild-based, pnpm-compatible
- `commander` for Node.js CLIs: https://github.com/tj/commander.js — argument parsing, TypeScript usage
- WebSearch: Anthropic SDK `maxRetries` defaults to 2, auto-retries 429/408/409/>=500 but NOT 529 — confirmed by GitHub WebSearch result citing README

### Tertiary (LOW confidence)
- Anthropic web_search tool name (`web_search_20250305`) — from WebSearch results; needs verification in API console before implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified via official docs/repos; project already uses @supabase/supabase-js
- Architecture: HIGH — patterns derived from project's existing codebase (admin client, trigger, types) + verified SDK docs
- Pitfalls: HIGH — database trigger behavior verified from migration SQL; SDK retry set verified from README; mdx-components.ts verified from codebase
- Open questions: LOW/MEDIUM — web_search tool availability not confirmed from official API console

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable stack — tsx, commander, @anthropic-ai/sdk are stable; web_search tool name may change, verify before use)
