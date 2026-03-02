# Phase 3: Lesson Content Pipeline - Research

**Researched:** 2026-02-27
**Domain:** MDX rendering, custom React components, Mermaid diagrams, content versioning
**Confidence:** HIGH (core stack), MEDIUM (Mermaid theme-switch), HIGH (versioning pattern)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Component Visual Style**
- Exercise component uses a warm/action accent color (amber/orange) with distinct colored section
- Takeaways component uses a success accent color (green) with distinct colored section
- Fixed content palette across all lessons — NOT pillar-specific accent colors
- Pillar colors used only on lesson header/breadcrumb, not on content components

**Definition Terms**
- Inline expansion — clicking a term expands the definition right below the word in the text flow
- One definition open at a time — expanding a new one auto-collapses the previous
- Dismiss by clicking anywhere outside the expanded definition

**DeepDive Sections**
- Collapsed by default — learner sees a teaser and actively chooses to expand
- Accordion behavior — one DeepDive open at a time, opening one collapses the previous
- Show estimated reading time (~X min read) next to the expand trigger

**Video Embed Component**
- Support any video URL — YouTube, Vimeo, or direct mp4/webm links
- Click-to-play thumbnail — show a poster image, only load iframe/player on click

**Reading Experience**
- Medium content width (~75-80ch) for lesson body
- No scroll progress indicator
- No table of contents — lessons are read top-to-bottom
- Estimated reading time displayed at the top of the lesson (already on lesson page stub)
- Code blocks with syntax highlighting only — no copy button
- Next/Previous lesson navigation buttons at the bottom of the lesson
- Manual "Mark as complete" button at the end of the lesson

**Diagram Presentation**
- Mermaid diagrams only — no static image diagram component
- Auto-themed to match dark/light mode (dark colors on dark, light on light)
- Optional caption below diagrams (MDX author can specify)

### Claude's Discretion
- Hook component visual treatment
- ConceptBlock component visual treatment
- DeepDive expand/collapse animation style
- Definition term visual indicator styling
- Video embed wrapper/caption design
- Visual separators/spacing between lesson sections
- Diagram mobile behavior
- Loading skeleton design for lesson content
- Error state handling for failed MDX rendering

### Deferred Ideas (OUT OF SCOPE)
- Web-sourcing agents to find educational videos and materials automatically
- Copy button on code blocks
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONT-01 | User can view lessons rendered from MDX with custom components (Hook, ConceptBlock, DeepDive, Exercise, Takeaways) | next-mdx-remote-client/rsc MDXRemote with components prop; custom components as server-compatible React components |
| CONT-02 | User can expand/collapse DeepDive sections within lessons | Client component with useState accordion pattern; one-open-at-a-time via shared state or controlled index |
| CONT-03 | User can hover/tap domain terminology to see inline definitions via Definition component | Client component pulling vocabulary from Supabase; click-to-expand inline pattern with click-outside dismiss |
| CONT-04 | Lesson content is versioned with rollback capability (content_version + lesson_versions table) | PostgreSQL BEFORE UPDATE trigger captures OLD.mdx_content into lesson_versions; schema already exists |
| CONT-05 | User can view Mermaid diagrams rendered inline via Diagram component | Client-only component with dynamic import ssr:false; mermaid.initialize() in useEffect watching theme |
</phase_requirements>

---

## Summary

This phase replaces the lesson page content stub with a complete MDX rendering pipeline. The core technical challenge is rendering a raw MDX string fetched from Supabase at runtime — not from files — using custom React components that are a mix of pure server-renderable components (Hook, ConceptBlock, Exercise, Takeaways) and interactive client components (DeepDive, Definition, Diagram, Video).

**The single biggest decision in this phase is the MDX rendering library.** `next-mdx-remote` (Hashicorp) was **archived on 2026-02-27** (the same day as this research). Its replacement is `next-mdx-remote-client` by ipikuka, which is actively maintained, supports React 19+ (v2.x), and is the direct fork designed specifically for the App Router. It imports from `next-mdx-remote-client/rsc` for server components and accepts an MDX string directly as the `source` prop — a perfect fit for content stored in Supabase.

Content versioning (CONT-04) requires a **PostgreSQL BEFORE UPDATE trigger** on the `lessons` table. The `lesson_versions` table already exists from Phase 1. The trigger captures `OLD.mdx_content` and `OLD.content_version` into `lesson_versions` before any update, making rollback as simple as querying by `lesson_id` and `version_number`. No application-level code is needed for versioning — it is enforced at the database layer.

**Primary recommendation:** Use `next-mdx-remote-client@^2` from `next-mdx-remote-client/rsc`, `@tailwindcss/typography` for baseline prose styles, `rehype-pretty-code` + `shiki` for server-side syntax highlighting, and a client-only Mermaid component with `dynamic({ ssr: false })`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-mdx-remote-client | ^2.1 | Render raw MDX strings from DB as RSC | Active fork of archived next-mdx-remote; React 19 + App Router native; imports from `/rsc` subpath |
| @tailwindcss/typography | latest v4-compat | Prose baseline styles for MDX output | Official Tailwind plugin; `@plugin` CSS-first for v4; `prose-invert` for dark mode |
| rehype-pretty-code | latest | Server-side syntax highlighting in code blocks | Build-time, no client JS, shiki-powered, works with RSC; no copy button needed (matches decision) |
| shiki | ^1.0 | Tokenizer for rehype-pretty-code | Peer dependency; best language coverage |
| mermaid | ^11 | Render Mermaid diagram syntax to SVG | Only diagram library required; built-in dark theme |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-player | ^3.4 | Video embed with click-to-play light mode | YouTube, Vimeo, mp4/webm support; `light={true}` shows poster, loads player on click |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next-mdx-remote-client | @next/mdx | @next/mdx requires MDX files on disk — can't render DB strings at runtime |
| next-mdx-remote-client | next-mdx-remote (original) | Archived 2026-02-27, no longer maintained |
| rehype-pretty-code | react-syntax-highlighter | react-syntax-highlighter is client-side only; adds bundle weight; copy-paste heavy for this use case |
| react-player | Hand-rolled iframe + state | react-player handles URL parsing for YT/Vimeo/mp4; `light` prop does click-to-play out of the box |

**Installation:**
```bash
pnpm add next-mdx-remote-client rehype-pretty-code shiki react-player
pnpm add -D @tailwindcss/typography
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── layout/              # existing — Header, Breadcrumbs
│   ├── ui/                  # existing — ProgressBar, LoadingSkeleton, PillarCard
│   └── lesson/              # NEW — all MDX custom components for Phase 3
│       ├── Hook.tsx          # Server component — lesson opener callout
│       ├── ConceptBlock.tsx  # Server component — concept explanation card
│       ├── DeepDive.tsx      # Client component ('use client') — accordion
│       ├── Exercise.tsx      # Server component — amber/action section
│       ├── Takeaways.tsx     # Server component — green/summary section
│       ├── Definition.tsx    # Client component ('use client') — inline expand term
│       ├── Diagram.tsx       # Client component ('use client') — Mermaid render
│       ├── Video.tsx         # Client component ('use client') — react-player light
│       └── index.ts          # re-export all for clean MDXRemote components prop
├── lib/
│   └── mdx-components.ts    # MDX components map — passed to MDXRemote
```

### Pattern 1: MDXRemote RSC Rendering

**What:** Render a raw MDX string from Supabase using `MDXRemote` as an async server component.
**When to use:** The lesson page already fetches `lesson.mdx_content` from `active_lessons`. Pass it directly to `MDXRemote`.

```typescript
// Source: next-mdx-remote-client/rsc docs
import { MDXRemote } from 'next-mdx-remote-client/rsc'
import { mdxComponents } from '@/lib/mdx-components'

// In LessonPage (server component):
{lesson.mdx_content ? (
  <Suspense fallback={<LessonContentSkeleton />}>
    <MDXRemote
      source={lesson.mdx_content}
      components={mdxComponents}
      onError={LessonRenderError}
    />
  </Suspense>
) : (
  <LessonContentEmpty />
)}
```

### Pattern 2: MDX Components Map

**What:** A plain object mapping MDX element names / custom component names to React components.
**When to use:** Passed as the `components` prop to `MDXRemote`. MDX authors use components by name in MDX source.

```typescript
// src/lib/mdx-components.ts
import type { MDXComponents } from 'mdx/types'
import {
  Hook, ConceptBlock, DeepDive, Exercise,
  Takeaways, Definition, Diagram, Video
} from '@/components/lesson'

export const mdxComponents: MDXComponents = {
  // Custom named components (used as <Hook>, <DeepDive>, etc. in MDX)
  Hook,
  ConceptBlock,
  DeepDive,
  Exercise,
  Takeaways,
  Definition,
  Diagram,
  Video,
  // Override default prose elements if needed
  // pre: CustomCodeBlock, — not needed; rehype-pretty-code handles this
}
```

### Pattern 3: Client Component in MDX

**What:** Interactive components like `DeepDive` and `Definition` must be `'use client'` because they use `useState`. They are passed as values in the `components` map, not imported inside MDX.

```typescript
// src/components/lesson/DeepDive.tsx
'use client'
import { useState } from 'react'

interface DeepDiveProps {
  title: string
  readingMinutes?: number
  children: React.ReactNode
}

export function DeepDive({ title, readingMinutes, children }: DeepDiveProps) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="border border-border-subtle rounded-xl my-6">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center justify-between w-full px-5 py-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-text-primary">{title}</span>
        <span className="text-xs text-text-muted">
          {readingMinutes ? `~${readingMinutes} min read` : null}
        </span>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 prose dark:prose-invert max-w-none">
          {children}
        </div>
      )}
    </div>
  )
}
```

**Accordion (one-open-at-a-time):** Since MDXRemote renders in a single RSC tree and each DeepDive is a separate client island, use a parent `'use client'` wrapper `LessonContent` that tracks `openDeepDiveIndex` and passes it down via props. Alternatively, use a module-level WeakMap pattern — but the simplest approach is a context or a parent wrapper.

**Recommended:** Create a `LessonBody` client wrapper component that wraps all MDX output and provides `DeepDiveContext` — a context that tracks which DeepDive is open by ID.

### Pattern 4: Mermaid Client Component

**What:** Mermaid cannot run on the server (it manipulates the DOM to produce SVG). Use `dynamic({ ssr: false })` to load it client-only.

```typescript
// src/components/lesson/Diagram.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

interface DiagramProps {
  chart: string       // Raw mermaid syntax
  caption?: string
}

export function Diagram({ chart, caption }: DiagramProps) {
  const { resolvedTheme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    async function render() {
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({
        startOnLoad: false,
        theme: resolvedTheme === 'dark' ? 'dark' : 'default',
      })
      const id = `mermaid-${Math.random().toString(36).slice(2)}`
      try {
        const { svg } = await mermaid.render(id, chart)
        if (!cancelled) setSvg(svg)
      } catch {
        // render error — show fallback
      }
    }
    render()
    return () => { cancelled = true }
  }, [chart, resolvedTheme])  // re-render when theme changes

  return (
    <figure className="my-6 overflow-x-auto">
      {svg
        ? <div ref={containerRef} dangerouslySetInnerHTML={{ __html: svg }} />
        : <div className="text-text-muted text-sm">Loading diagram...</div>}
      {caption && <figcaption className="text-center text-xs text-text-muted mt-2">{caption}</figcaption>}
    </figure>
  )
}
```

**CRITICAL:** `useTheme().resolvedTheme` is `undefined` on SSR. Only read it client-side inside `useEffect` or after a `mounted` check. The Diagram component is already client-only so this is safe.

### Pattern 5: Tailwind Typography Plugin — Prose Wrapper

**What:** Wrap MDX output in `prose` classes to get sensible typographic defaults for `h2`, `p`, `ul`, `code`, etc. Dark mode via `prose-invert`.

```typescript
// In LessonPage or a wrapper div around MDXRemote:
<div className="prose dark:prose-invert prose-slate max-w-none
                prose-headings:text-text-primary prose-p:text-text-secondary
                prose-code:before:content-none prose-code:after:content-none">
  <MDXRemote ... />
</div>
```

Add to `globals.css` (Tailwind v4 pattern already in use):
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
/* existing @custom-variant dark and @theme block unchanged */
```

**Note:** The project uses dark-first design with a `.light` class override (not `.dark` class toggle). The `@custom-variant dark` is already set to `(&:where(.dark, .dark *))`. The `prose-invert` modifier needs to target `.light` mode OFF — because the default palette IS dark. The wrapper should use: `prose dark:prose-invert` will invert on `.dark` class. Since this project defaults to dark and adds `.light` for light mode, the correct approach is: `prose prose-invert light:prose` (invert by default, un-invert in light mode). Verify with existing `@custom-variant dark` definition in `globals.css`.

### Pattern 6: Content Versioning Trigger

**What:** A PostgreSQL BEFORE UPDATE trigger on `lessons` automatically saves the current `mdx_content` into `lesson_versions` before any update. No application code required.

```sql
-- Migration: add to a new migration file
CREATE OR REPLACE FUNCTION capture_lesson_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only snapshot when mdx_content actually changes
  IF OLD.mdx_content IS DISTINCT FROM NEW.mdx_content THEN
    INSERT INTO lesson_versions (
      lesson_id,
      version_number,
      mdx_content,
      learning_objectives,
      change_note
    ) VALUES (
      OLD.id,
      OLD.content_version,
      OLD.mdx_content,
      OLD.learning_objectives,
      'Auto-captured before update'
    );
    -- Increment version number on the new record
    NEW.content_version := OLD.content_version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lessons_version
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION capture_lesson_version();
```

Rollback query (for future admin use):
```sql
-- Retrieve any previous version:
SELECT mdx_content, version_number, created_at, change_note
FROM lesson_versions
WHERE lesson_id = $1
ORDER BY version_number DESC;
```

### Pattern 7: Next/Previous Lesson Navigation

**What:** Fetch sibling lessons from the same course by `display_order` relative to the current lesson. Render as navigation buttons at the bottom of the lesson page.

```typescript
// In LessonPage server component:
const { data: siblings } = await supabase
  .from('active_lessons')
  .select('id, name, slug, display_order')
  .eq('course_id', course.id)
  .order('display_order', { ascending: true })

const currentIndex = siblings?.findIndex(l => l.id === lesson.id) ?? -1
const prevLesson = currentIndex > 0 ? siblings![currentIndex - 1] : null
const nextLesson = siblings && currentIndex < siblings.length - 1
  ? siblings[currentIndex + 1] : null
```

### Anti-Patterns to Avoid

- **Importing mermaid at module level:** Mermaid calls `document` and `window` on import — crashes SSR. Always use `await import('mermaid')` inside `useEffect`.
- **Rendering MDX on the client:** Don't serialize MDX in a client component. `MDXRemote` from `/rsc` is async server — use `Suspense` for loading states.
- **MDXProvider in App Router:** `MDXProvider` context is ineffective in RSC because server components cannot consume context. Pass `components` directly to `MDXRemote` via props.
- **Calling `useTheme().resolvedTheme` at render time outside useEffect:** Returns `undefined` on first render. Always check `if (!mounted) return null` or read inside `useEffect`.
- **Using `dark:prose-invert` without verifying dark mode direction:** This project is dark-FIRST. The `.dark` class is the default, `.light` is the override. Typography inversion must match this direction.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Remote MDX rendering from DB string | Custom unified/remark pipeline | next-mdx-remote-client@^2/rsc | RSC-native, maintained, handles compilation + rendering in one step |
| Prose typography styles | Custom CSS for h1-h6, p, ul, ol, code | @tailwindcss/typography | Handles all edge cases including nested lists, blockquotes, tables |
| Syntax highlighting | Custom tokenizer | rehype-pretty-code + shiki | Build-time, zero client JS, excellent language coverage, no copy button needed |
| Video URL detection + embed | Regex + iframe ternary | react-player with `light` prop | Handles YouTube/Vimeo ID extraction, poster image fetching, mp4 fallback |
| Mermaid SVG rendering | Custom SVG parser | mermaid.render() | Already generates clean SVG; just call the API |
| Content versioning | Application-level version save on every update | PostgreSQL BEFORE UPDATE trigger | Atomic, cannot be bypassed, no risk of "forgot to version" bugs |

**Key insight:** The MDX rendering pipeline (parsing → AST → transform → React components) is extremely complex. Using the library stack avoids hundreds of edge cases around escaping, frontmatter, imports/exports in MDX, and RSC boundaries.

---

## Common Pitfalls

### Pitfall 1: next-mdx-remote (archived) vs next-mdx-remote-client

**What goes wrong:** Installing `next-mdx-remote` (Hashicorp) which was archived 2026-02-27. RSC mode is broken on Next.js 15.2+/16.
**Why it happens:** The package name is more prominent in search results and documentation.
**How to avoid:** Install `next-mdx-remote-client` specifically; import from `next-mdx-remote-client/rsc`.
**Warning signs:** "Cannot use RSC mode at all" errors; GitHub issue #488 on hashicorp/next-mdx-remote.

### Pitfall 2: Mermaid SSR Crash

**What goes wrong:** `ReferenceError: document is not defined` during server rendering.
**Why it happens:** Mermaid's module-level code accesses browser globals.
**How to avoid:** Only import mermaid inside `useEffect` with `await import('mermaid')`. Component must be `'use client'` with `dynamic({ ssr: false })` wrapper or defined entirely as client component.
**Warning signs:** Build succeeds but runtime throws `document is not defined` in terminal.

### Pitfall 3: Prose Inversion in Dark-First Project

**What goes wrong:** Text becomes unreadable — prose inversion applies when it shouldn't (or doesn't when it should).
**Why it happens:** Standard Tailwind docs show `dark:prose-invert` where `dark:` targets a `.dark` class. This project defaults to dark and uses `.light` for light override.
**How to avoid:** Use `prose prose-invert light:prose` where `light:` is the custom variant defined in `globals.css`. Verify that `@custom-variant dark` is set as `(&:where(.dark, .dark *))` (already done in existing `globals.css`). Prose should be inverted by default and un-inverted on `.light`.
**Warning signs:** White text on white background in light mode, or dark text on dark background in dark mode.

### Pitfall 4: DeepDive/Definition Accordion State Isolation

**What goes wrong:** Each `<DeepDive>` is an independent client island — there is no shared state between them by default. "One open at a time" behavior requires shared state.
**Why it happens:** RSC renders each client component boundary as a separate island without shared context unless explicitly wired.
**How to avoid:** Wrap the MDX output in a `LessonBody` client wrapper that provides `DeepDiveContext` tracking `openId: string | null`. Each `DeepDive` calls `setOpenId(myId)` on expand and reads `openId === myId` to know if it's open.
**Warning signs:** Multiple DeepDive sections can be open simultaneously.

### Pitfall 5: Content Versioning on Empty mdx_content

**What goes wrong:** Trigger inserts `NULL` into `lesson_versions.mdx_content` (which has a `NOT NULL` constraint) if a lesson is created without content and then updated.
**Why it happens:** `OLD.mdx_content` is `NULL` when lesson was created without content.
**How to avoid:** Add `IF OLD.mdx_content IS NOT NULL AND OLD.mdx_content IS DISTINCT FROM NEW.mdx_content THEN` in the trigger.
**Warning signs:** Supabase migration error: `null value in column "mdx_content" violates not-null constraint`.

### Pitfall 6: react-player Bundle Size

**What goes wrong:** react-player imports all player types even if only YouTube/Vimeo needed.
**Why it happens:** Default import includes all supported platforms.
**How to avoid:** Import only the light version: `import ReactPlayer from 'react-player/lazy'` for code-split on demand, or use `react-player/youtube` and `react-player/vimeo` if only those are needed.
**Warning signs:** Large initial bundle; Vercel build shows react-player contributing significant weight.

### Pitfall 7: rehype-pretty-code + next-mdx-remote-client Plugin Wiring

**What goes wrong:** Syntax highlighting not applied; code blocks render as plain `<code>` elements.
**Why it happens:** rehype plugins must be passed in the `options` prop of `MDXRemote`, not configured elsewhere.
**How to avoid:**
```typescript
import rehypePrettyCode from 'rehype-pretty-code'

<MDXRemote
  source={source}
  components={components}
  options={{
    mdxOptions: {
      rehypePlugins: [
        [rehypePrettyCode, { theme: 'github-dark' }]
      ]
    }
  }}
/>
```
**Warning signs:** Code blocks have no coloring; inspect rendered HTML for absence of `data-rehype-pretty-code-*` attributes.

---

## Code Examples

### MDX Source Format (expected in DB)

Authors write MDX that uses custom components by name:

```mdx
<Hook>
  Agents don't just answer questions — they take actions. Understanding how they reason is the unlock.
</Hook>

<ConceptBlock title="The ReAct Loop">
  ReAct (Reason + Act) interleaves thinking steps with tool calls, letting the agent self-correct mid-task.
</ConceptBlock>

<DeepDive title="Why CoT Matters for Agents" readingMinutes={4}>
  Chain-of-thought prompting forces the model to externalize intermediate reasoning steps...
</DeepDive>

<Exercise>
  Build a minimal ReAct agent in Python that can search the web and answer a factual question.
</Exercise>

<Takeaways>
  - ReAct combines reasoning traces with action execution in one loop
  - Tool calls are the "act" step — the model decides which tool and what arguments
  - Self-correction emerges from observing tool output and reasoning about it
</Takeaways>

## Standard Prose

Text between custom components is standard MDX. Code blocks use fenced syntax:

\`\`\`python
def react_agent(question):
    ...
\`\`\`

<Definition term="ReAct">
  A prompting strategy that interleaves "Thought:", "Action:", and "Observation:" steps.
</Definition>

<Diagram caption="ReAct loop flow">
flowchart TD
  A[User Query] --> B[Thought]
  B --> C[Action: call tool]
  C --> D[Observation]
  D --> B
  B --> E[Final Answer]
</Diagram>

<Video url="https://www.youtube.com/watch?v=abc123" caption="Building ReAct agents from scratch" />
```

### LessonPage Integration

```typescript
// Source: next-mdx-remote-client/rsc docs + project patterns
import { Suspense } from 'react'
import { MDXRemote } from 'next-mdx-remote-client/rsc'
import rehypePrettyCode from 'rehype-pretty-code'
import { mdxComponents } from '@/lib/mdx-components'
import { LessonContentSkeleton } from '@/components/ui/LoadingSkeleton'

// In LessonPage server component, after fetching lesson:
{lesson.mdx_content ? (
  <article className="prose prose-invert light:prose prose-slate max-w-none
                       prose-headings:text-text-primary prose-p:text-text-secondary
                       prose-code:before:content-none prose-code:after:content-none
                       [&_pre]:bg-surface-card [&_pre]:border [&_pre]:border-border-subtle">
    <Suspense fallback={<LessonContentSkeleton />}>
      <MDXRemote
        source={lesson.mdx_content}
        components={mdxComponents}
        onError={LessonRenderError}
        options={{
          mdxOptions: {
            rehypePlugins: [
              [rehypePrettyCode, { theme: { dark: 'github-dark', light: 'github-light' } }]
            ]
          }
        }}
      />
    </Suspense>
  </article>
) : (
  <EmptyContentState />
)}
```

### Versioning Trigger (new migration)

```sql
-- Migration: 00002_lesson_versioning_trigger.sql
CREATE OR REPLACE FUNCTION capture_lesson_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.mdx_content IS NOT NULL
     AND OLD.mdx_content IS DISTINCT FROM NEW.mdx_content THEN
    INSERT INTO lesson_versions (
      lesson_id,
      version_number,
      mdx_content,
      learning_objectives,
      change_note
    ) VALUES (
      OLD.id,
      OLD.content_version,
      OLD.mdx_content,
      OLD.learning_objectives,
      'Auto-versioned before update'
    );
    NEW.content_version := OLD.content_version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lessons_version
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION capture_lesson_version();
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-mdx-remote (Hashicorp) | next-mdx-remote-client (ipikuka) | Archived 2026-02-27 | Must use the fork; hashicorp version broken for RSC in Next.js 15.2+ |
| react-syntax-highlighter | rehype-pretty-code + shiki | 2024-2025 | Zero client JS for highlighting; server-side tokenization |
| tailwind.config.js plugins | `@plugin` in CSS | Tailwind v4 | Already the pattern in this project; typography plugin follows same pattern |
| mermaid.init() on DOM | mermaid.render() async API | Mermaid v10+ | `render()` returns SVG string cleanly; no DOM mutation from outside |

**Deprecated/outdated:**
- `next-mdx-remote`: Archived. Do not use.
- `@mdx-js/react` MDXProvider: Ineffective in RSC/App Router. Don't use for component injection.
- `mermaid.init()` targeting class selectors: Old API. Use `mermaid.render(id, source)` for explicit control.

---

## Open Questions

1. **Prose inversion direction for dark-first project**
   - What we know: Project uses dark as default, `.light` class for light override; `@custom-variant dark (&:where(.dark, .dark *))` is set in globals.css
   - What's unclear: Whether `light:prose` and `light:not-prose-invert` work cleanly with Tailwind v4's custom variant system for prose
   - Recommendation: Build Prose wrapper first in isolation, test light/dark toggle visually before wiring to all content

2. **DeepDive accordion shared state architecture**
   - What we know: Each `DeepDive` is a separate client island; RSC doesn't share client state across boundaries by default
   - What's unclear: Whether a `LessonBody` client wrapper that re-renders all DeepDives on state change causes re-render performance issues for long lessons
   - Recommendation: Use `LessonBody` client wrapper with `openDeepDiveId` state; `DeepDive` accepts `isOpen` + `onToggle` as props for controlled mode

3. **rehype-pretty-code dual theme (dark/light) behavior**
   - What we know: rehype-pretty-code accepts `theme: { dark, light }` to emit both sets of CSS variables
   - What's unclear: Whether CSS variable emission (`data-theme` toggling) works cleanly with this project's `.light` class strategy vs. the more common `.dark` class strategy
   - Recommendation: Use single `theme: 'github-dark'` first (matches dark-first default) and re-evaluate in light mode testing pass

---

## Sources

### Primary (HIGH confidence)
- Official Next.js MDX docs (nextjs.org/docs/app/guides/mdx) — fetched directly, version 16.1.6, 2026-02-27
- next-mdx-remote-client GitHub README (github.com/ipikuka/next-mdx-remote-client) — fetched directly
- next-mdx-remote GitHub (github.com/hashicorp/next-mdx-remote) — fetched; confirmed archived 2026-02-27
- tailwindcss-typography GitHub README (github.com/tailwindlabs/tailwindcss-typography) — fetched directly
- Mermaid theme docs (mermaid.ai/open-source/config/theming.html) — fetched directly
- Supabase PostgreSQL triggers docs (supabase.com/docs/guides/database/postgres/triggers) — fetched directly
- Project schema (supabase/migrations/00001_initial_schema.sql) — read directly; lesson_versions table confirmed present
- Project types (src/types/database.types.ts) — read directly; LessonVersion type confirmed
- Project globals.css — read directly; Tailwind v4 + dark-first pattern confirmed

### Secondary (MEDIUM confidence)
- WebSearch: next-mdx-remote-client v2 React 19 compatibility — multiple sources confirming v2.x = React 19+
- WebSearch: rehype-pretty-code + Shiki as current standard for Next.js syntax highlighting
- WebSearch: react-player v3.4.0, last published ~3 months ago (late 2025), considered maintained
- WebSearch: Tailwind v4 `@plugin "@tailwindcss/typography"` CSS-first configuration pattern

### Tertiary (LOW confidence — flag for validation)
- WebSearch: Mermaid `mermaid.render()` async API pattern — unverified against mermaid v11 official docs; should confirm API signature
- WebSearch: react-player React 19 explicit compatibility — package is maintained but React 19 support not explicitly confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — next-mdx-remote-client confirmed via GitHub + npm; typography plugin confirmed via official repo; rehype-pretty-code confirmed via official site
- Architecture: HIGH — RSC pattern from official next-mdx-remote-client docs; Mermaid client-only pattern from multiple sources
- Versioning: HIGH — SQL trigger pattern from Supabase official docs; schema already exists and confirmed
- Mermaid theme-switch: MEDIUM — render() API pattern described by community sources; theme: 'dark'/'default' confirmed in official docs

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (30 days — stable ecosystem; only watch for next-mdx-remote-client patch releases)
