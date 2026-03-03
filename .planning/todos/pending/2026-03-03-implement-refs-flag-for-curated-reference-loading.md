---
created: 2026-03-03T07:58:54.612Z
title: Implement --refs flag for curated reference loading
area: tooling
files:
  - scripts/generate.ts
  - scripts/prompts/system-prompt.ts
  - scripts/pipeline/research.ts
---

## Problem

The `--refs` flag is accepted by Commander in `scripts/generate.ts` but doesn't actually load files yet. Web search alone provides breadth but not depth — for courses like systems thinking and technical systems, canonical sources (Meadows, Senge, Sterman) matter more than whatever Google surfaces. Without curated references, generated lessons risk "sounding right" without "being right."

## Solution

1. Read file paths from `--refs` option in the orchestrator loop
2. Embed file contents into the system prompt alongside web research notes
3. Weight curated references higher than web results in prompt instructions (e.g., "Prioritize information from the provided reference materials over web search results")
4. Support per-course reference config (e.g., `references/` folder or config entry) in addition to CLI flag
5. Handle gracefully if files can't be read (warn, don't crash)

Phase 12 candidate or early follow-up to phase 11.
