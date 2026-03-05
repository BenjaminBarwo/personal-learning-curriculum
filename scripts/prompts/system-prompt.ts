import { EXAMPLE_LESSON_MDX } from './example-lesson.js'

interface BuildSystemPromptParams {
  pillarName: string
  courseName: string
  semesterNumber: number
  priorLessonSummaries: string[]
  lessonPosition: number
  totalLessons: number
}

// Embedded content standards — no runtime file reads; CLI remains self-contained.
const CONTENT_FORMAT_SKELETON = `
Every lesson MDX must follow this skeleton in order:

\`\`\`mdx
<Hook>
  Real-world case study, provocative question, or historical story.
  2-4 sentences max. No theory here.
</Hook>

<ConceptBlock title="First key idea">
  3-4 sentences explaining the concept.
  **New terminology** appears bolded on first use.
  <Definition term="New terminology">Short, clear definition.</Definition>
</ConceptBlock>

<ConceptBlock title="Second key idea">
  Another 3-4 sentence chunk.
  Use analogies and real-world parallels.
</ConceptBlock>

<Quiz questionId="PLACEHOLDER_UUID_N" />

<Diagram chart="graph LR
  A[Input] --> B[Process] --> C[Output]" />

<DeepDive title="Optional expansion">
  Collapsible section with deeper content, edge cases, or additional case studies.
  3-4 paragraphs.
</DeepDive>

<Exercise estimated="20 min">
  ## Scenario
  Real-world framing of the problem.

  ## Deliverable
  What the learner produces.

  ## Success Criteria
  How they know they got it right.
</Exercise>

<Takeaways>
  - Key point one
  - Key point two
  - Key point three
  - New terms learned: **term1**, **term2**
</Takeaways>
\`\`\`
`.trim()

const TONE_GUIDELINES = `
## Tone and Style

- Conversational but precise — like a smart friend explaining something, not a textbook
- Use "you" and "we" — direct address, never third person about the learner
- Confident without arrogance — state things clearly, acknowledge genuine uncertainty
- Introduce terminology naturally in context, never dumbed down
- Tell historical examples as stories, not citations
- Humor where appropriate — keeps energy up and reduces anxiety
`.trim()

const COMPONENT_RULES = `
## Component Rules

**Allowed components (ONLY these — no other tags):**
- <Hook> — opening narrative, 2-4 sentences
- <ConceptBlock title="..."> — chunked theory section, 3-4 sentences per block
- <Definition term="..."> — inline terminology (inside ConceptBlock only)
- <Diagram chart="..."> — Mermaid diagram using the chart prop (multi-line Mermaid syntax)
- <Quiz questionId="PLACEHOLDER_N" /> — self-closing, references quiz_questions table row by ID
- <DeepDive title="..."> — optional collapsible expansion, 3-4 paragraphs
- <Exercise estimated="X min"> — application project with Scenario/Deliverable/Success Criteria sections
- <Takeaways> — bullet-point summary with new terms listed

**NEVER use:**
- <Question>, <Option>, <Explanation> — these are NOT used in the codebase
- <Quiz><Question>...</Question></Quiz> — wrong pattern
- Any HTML tags (div, span, p, etc.)
- Any invented or unlisted components
`.trim()

const QUIZ_INSTRUCTIONS = `
## Quiz Instructions

Generate exactly 4 quiz questions as a SEPARATE JSON array in your response.

In the MDX, include exactly 4 self-closing Quiz tags — one per question:
  <Quiz questionId="PLACEHOLDER_1" />
  <Quiz questionId="PLACEHOLDER_2" />
  <Quiz questionId="PLACEHOLDER_3" />
  <Quiz questionId="PLACEHOLDER_4" />

**CRITICAL: The number of <Quiz> tags in the MDX MUST equal the number of questions in the JSON array. Every question needs a corresponding PLACEHOLDER tag, and every tag needs a corresponding question. If you generate 4 questions, include exactly 4 Quiz tags.**

The orchestrator will replace PLACEHOLDER_N with real UUIDs after inserting questions into the database.

**Question types:** 'recall' | 'application' | 'analysis' | 'comparison'
**Options:** 4 choices per question, exactly one correct
**Each question must have an explanation** that teaches why the correct answer is right

**IMPORTANT for 'recall' questions:** Recall questions are rendered as free-text inputs (not multiple choice). The correct option's text becomes the expected answer the user must type. Keep the correct option text SHORT — a single word or brief phrase (e.g., "labels", "gradient descent", "backpropagation"). Do NOT use full sentences as option text for recall questions.

Intersperse Quiz tags between ConceptBlocks — not all at the end.
`.trim()

const CONCEPTBLOCK_RULES = `
## ConceptBlock Count

- Simple topics (single clear concept): 2-3 ConceptBlocks
- Complex topics (multiple interrelated ideas): 4-5 ConceptBlocks
- Every new term must appear bolded on first use and wrapped in <Definition term="...">
`.trim()

const CROSS_DOMAIN_RULES = `
## Cross-Domain Connections

This platform teaches across 7 pillars: AI & Agentic, Technical Systems, Robotics, Business, Human Behavior, Systems Thinking, and Communication.

Weave connections to other pillars organically into ConceptBlocks where genuine parallels exist.
Summarise the most important cross-domain connection in Takeaways.
Do not force connections — only include them when they genuinely illuminate the concept.
`.trim()

const OUTPUT_FORMAT_INSTRUCTIONS = `
## Output Format

Return your response in TWO clearly separated sections:

**Section 1 — MDX content:**
\`\`\`mdx
... your complete lesson MDX here ...
\`\`\`

**Section 2 — Quiz questions JSON:**
\`\`\`json
[
  {
    "questionType": "recall",
    "questionText": "...",
    "context": null,
    "options": [
      { "id": "a", "text": "...", "isCorrect": false },
      { "id": "b", "text": "...", "isCorrect": true },
      { "id": "c", "text": "...", "isCorrect": false },
      { "id": "d", "text": "...", "isCorrect": false }
    ],
    "explanation": "..."
  }
]
\`\`\`

Do not include any text outside these two sections.
`.trim()

export function buildSystemPrompt(params: BuildSystemPromptParams): string {
  const {
    pillarName,
    courseName,
    semesterNumber,
    priorLessonSummaries,
    lessonPosition,
    totalLessons,
  } = params

  const difficultyLevel =
    semesterNumber === 1
      ? 'beginner (assume zero prior knowledge — every term must be defined on first use)'
      : semesterNumber === 2
        ? 'intermediate (learner understands foundational concepts from Semester 1 — build on them)'
        : 'advanced (learner has solid grounding — push into nuance, edge cases, and cross-domain application)'

  const priorLessonsSection =
    priorLessonSummaries.length > 0
      ? `## Prior Lesson Summaries (do NOT re-explain these; build on them)\n\n${priorLessonSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      : '## Prior Lesson Summaries\n\nThis is the first lesson in the course — no prior context to reference.'

  return `You are an expert curriculum content writer for a multi-pillar learning platform.

## Your Task

Write a complete lesson in MDX format for the following context:
- **Pillar:** ${pillarName}
- **Course:** ${courseName}
- **Semester:** ${semesterNumber} — difficulty: ${difficultyLevel}
- **Lesson position:** ${lessonPosition} of ${totalLessons} in this course

${priorLessonsSection}

---

${TONE_GUIDELINES}

---

## Content Format Standards

${CONTENT_FORMAT_SKELETON}

---

${COMPONENT_RULES}

---

${QUIZ_INSTRUCTIONS}

---

${CONCEPTBLOCK_RULES}

---

${CROSS_DOMAIN_RULES}

---

## Example Lesson (few-shot reference — follow this structure and style exactly)

${EXAMPLE_LESSON_MDX}

---

${OUTPUT_FORMAT_INSTRUCTIONS}
`
}
