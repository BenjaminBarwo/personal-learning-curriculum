# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-02
**Phases:** 7 | **Plans:** 14 | **Timeline:** 4 days

### What Was Built
- Full-stack learning platform (Next.js 16 + Supabase + Clerk + Tailwind v4)
- 11-table Postgres schema with RLS, deployed to production
- MDX lesson rendering with 8 custom components and content versioning
- Inline quiz engine with 5 question types, immediate feedback, session persistence
- Progress tracking at all hierarchy levels with semester lock/unlock
- 2 hand-written lessons validating the complete end-to-end learning loop
- All 7 knowledge pillars seeded in production database

### What Worked
- **Strict dependency ordering** — schema → data access → display → interactive → content meant each phase had a stable foundation; no rework from missing dependencies
- **Phase-scoped plans** — well-specified plans with clear interfaces executed in 2-3 minutes each (Phases 3-5)
- **Single-user scaffolding** — hardcoded user_id avoided the entire auth UI complexity while maintaining RLS-ready schema
- **VERIFICATION.md pattern** — automated checks caught real issues; Phase 7 gap closure was efficient because the audit identified exactly what was missing
- **Human checkpoint gates** — quiz engine visual verification caught nothing wrong, confirming the automated approach was solid; but the gate forced conscious sign-off

### What Was Inefficient
- **Phase 5 missing VERIFICATION.md** — the execute-phase workflow didn't generate it, requiring an entire Phase 7 to retroactively fill the gap. Process should auto-generate verification during phase execution.
- **Audit required before completion despite all work being done** — the audit flagged Phase 6 as "not started" when it simply hadn't been executed yet. Earlier audit timing or incremental audit would have avoided the "gaps found" noise.
- **Dead code accumulation** — `createClerkSupabaseClient` became dead code when Phase 5 shifted to server actions. Should have been caught and removed during Phase 5 execution, not Phase 7.
- **Traceability table in REQUIREMENTS.md not auto-updated** — some entries showed "Pending" despite the requirement being checked off. Manual tracking drifts.

### Patterns Established
- **Server actions with admin client** — emerged in Phase 5 as the mutation pattern; replaced client-side Supabase entirely
- **Caller-provided Supabase client** — pages create client, pass to helpers; avoids redundant instantiation
- **Batched .in() queries** — collect all IDs, single query; prevents N+1 across all hierarchy pages
- **CSS variable --pillar-color** — runtime dynamic accent threading from DB hex values
- **LessonBody RSC+Client bridge** — MDXRemote renders server-side, LessonBody wraps with client context providers
- **force-dynamic on data pages** — Vercel ISR caches aggressively; explicit opt-out for progress-sensitive pages

### Key Lessons
1. **Build the verification chain during execution, not after** — Phase 5's missing VERIFICATION.md cost an entire gap-closure phase. Integrate verification into the execute-phase workflow.
2. **Audit at 80%, not 100%** — running the milestone audit when Phase 6 wasn't started created noise. Audit when most work is done but execution is still happening, so gaps can be closed inline.
3. **Kill dead code immediately** — when a pattern shifts (browser client → server actions), remove the old pattern in the same phase. Don't defer to a cleanup phase.
4. **Single-user is a legitimate architecture choice** — hardcoded user_id simplified every phase while maintaining the multi-user schema. Worth doing again for MVPs.
5. **Real content reveals real bugs** — Phase 6's seed content exposed the DeepDive title prop issue and force-dynamic caching need. Synthetic test data wouldn't have caught these.

### Cost Observations
- Model mix: ~70% sonnet (plan execution), ~20% opus (planning/research), ~10% haiku (quick checks)
- Sessions: ~8-10 across 4 days
- Notable: Plans 3-5 averaged 2-3 min each — well-specified interfaces are the single biggest velocity lever

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Timeline | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 4 days | 7 | Established GSD workflow with verification chain |

### Cumulative Quality

| Milestone | LOC | Files | Tech Debt Items |
|-----------|-----|-------|-----------------|
| v1.0 | 4,272 TS | 118 | 3 (auth UI, vocabulary view, lesson_versions retrieval) |

### Top Lessons (Verified Across Milestones)

1. Well-specified plans with clear interfaces execute in 2-3 minutes — invest in planning
2. Real content reveals real bugs — don't ship without it
