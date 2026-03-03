# Content Generation CLI — Usage Guide

Generate AI-authored MDX lessons and seed them into Supabase using Claude.

---

## Prerequisites

- **Node.js 18+** and **pnpm** installed
- **ANTHROPIC_API_KEY** — get from [Anthropic Console](https://console.anthropic.com/settings/keys)
- **NEXT_PUBLIC_SUPABASE_URL** and **SUPABASE_SERVICE_ROLE_KEY** — from your Supabase project settings
- All three must be in `.env.local` in the project root (same file used by Next.js)

Verify your `.env.local` contains:

```bash
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Installation

```bash
pnpm install
```

The CLI is registered as `pnpm generate` (runs `scripts/generate.ts` via `tsx`).

---

## Basic Usage

### Generate all lessons for a pillar

Pillar is selected by its `display_order` number in the database.

```bash
pnpm generate --pillar 2
```

### Generate all lessons in a course

```bash
pnpm generate --course causal-loop-diagrams
```

### Generate a single lesson

```bash
pnpm generate --lesson some-lesson-slug
```

### Generate all lessons in a semester

```bash
pnpm generate --semester systems-thinking-foundations
```

---

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--pillar <number>` | Generate all lessons for a pillar (by display_order) | — |
| `--semester <slug>` | Generate all lessons in a semester | — |
| `--course <slug>` | Generate all lessons in a course | — |
| `--lesson <slug>` | Generate a single lesson | — |
| `--force` | Regenerate lessons that already have content | `false` |
| `--dry-run` | Run the pipeline without writing to the database | `false` |
| `--model <name>` | Claude model to use | `claude-sonnet-4-6` |
| `--refs <paths...>` | Additional reference file paths (future use) | — |

---

## Common Scenarios

### Dry run — preview output without writing to DB

```bash
pnpm generate --pillar 2 --dry-run
```

Single lesson dry-run prints MDX to stdout. Batch dry-runs save `.mdx` files to `scripts/output/`.

### Force regeneration of existing lessons

```bash
pnpm generate --course some-course --force
```

Without `--force`, lessons that already have `mdx_content` are skipped.

### Use the more capable Opus model

```bash
pnpm generate --pillar 2 --model claude-opus-4-6
```

Use Opus for higher-quality output; Sonnet (default) is faster and cheaper for iteration.

### Provide additional reference files

```bash
pnpm generate --course causal-loop-diagrams --refs references/book.pdf references/paper.pdf
```

Note: reference file loading is logged but not yet implemented — they are noted for future use.

---

## What Happens on Each Run

For every lesson in the scope, the CLI runs this pipeline:

```
Query scope
  └── Filter (skip existing unless --force)
        └── For each lesson:
              ├── 1. Research   — web search for current examples and context
              ├── 2. Generate   — Claude writes full MDX + quiz questions
              ├── 3. Review     — Claude checks quality and consistency
              ├── 4. Validate   — MDX parsed; required components checked
              └── 5. Seed       — quiz questions inserted; MDX saved to Supabase
```

Progress is printed in tree style:

```
[1/5] 'Introduction to Systems Thinking'
  ├ Researching... done (4s)
  ├ Generating... done (42s)
  ├ Reviewing... done (8s)
  ├ Validating... done (1s)
  ├ Seeding... done (1s)
```

---

## Idempotency

The CLI is safe to run multiple times on the same scope:

- **First run:** generates and seeds all lessons
- **Second run (no flags):** skips all lessons that already have `mdx_content` — effectively a no-op
- **With `--force`:** regenerates and re-seeds even if content exists. Existing quiz questions are deleted and replaced. The DB trigger `trg_lessons_version` automatically captures the prior MDX into `lesson_versions` before updating.

---

## Error Handling

- **Individual lesson failures** are caught and logged; the batch continues with the next lesson
- **Validation failures** trigger one automatic retry (re-generates the lesson)
- **Unrecoverable errors** (no Supabase connection, invalid scope, missing API key) crash the CLI with exit code 1
- The exit code is `1` if any lessons failed, `0` if all succeeded or were skipped

---

## Logs

After each run, a markdown report is saved to `scripts/logs/YYYY-MM-DDTHH-MM-SS.md` with:
- Scope, model, and mode
- Per-lesson results (status, duration, error message if any)
- Summary counts (generated, skipped, failed)

---

## Troubleshooting

### "Error: ANTHROPIC_API_KEY not set"

Ensure `.env.local` exists in the project root with a valid `ANTHROPIC_API_KEY`.

### "No pillar found with display_order=N"

The pillar number refers to `display_order` in the `pillars` table, not the pillar's name or slug. Check your Supabase dashboard for the correct value.

### "No lessons found for course X"

The course slug must match exactly what's in the `courses.slug` column. Check for typos.

### "Lesson X not found in database"

Lesson rows must exist before the CLI can seed content. Run the curriculum seed script first to create the lesson stubs.

### "Validation failed after retry"

The generated MDX did not contain one or more required components after two attempts. Check the error message for which components are missing. You can try again or lower the scope to a single lesson for debugging.

### Supabase connection errors

Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly in `.env.local`. The CLI uses the service role key directly (no Clerk auth).
