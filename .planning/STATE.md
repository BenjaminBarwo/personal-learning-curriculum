# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** Every lesson must be so frictionless to start and so engaging to continue that the learner never talks themselves out of opening one.
**Current focus:** Phase 1 — Infrastructure

## Current Position

Phase: 1 of 6 (Infrastructure)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-02-27 — Roadmap created; 6 phases derived from 21 v1 requirements

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: — min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-Phase 1]: Clerk JWT template for Supabase must be configured in Clerk dashboard BEFORE any RLS policy is written — Day 0 task; verify with `SELECT auth.uid()` returning non-null
- [Pre-Phase 1]: Use raw MDX string in `lessons.mdx_content` (not JSON AST) — simpler, sufficient for current scope; decide before schema is finalized
- [Pre-Phase 1]: No `users` table in Supabase for Phase 1 — bare Clerk user ID string on all tables avoids webhook complexity for single-user case

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Clerk JWT + Supabase RLS integration is CRITICAL — if `auth.uid()` returns null, all user data queries silently return zero rows. Must be resolved before any data access code is written.
- [Phase 1]: Service role key must NEVER appear in a `NEXT_PUBLIC_` variable or any `"use client"` file. Establish two Supabase client factories from the start.
- [Phase 3]: `quiz_attempts` table schema must exist in Phase 1 schema (not Phase 4) — FSRS in Phase 3 requires accumulated attempt history; retrofitting loses early data.
- [Phase 3]: `lesson_content_versions` table must exist in Phase 1 schema — AI generation in Phase 2 can overwrite hand-written content without rollback otherwise.

## Session Continuity

Last session: 2026-02-27
Stopped at: Roadmap written; REQUIREMENTS.md traceability updated; ready to plan Phase 1
Resume file: None
