import type { GeneratedQuizQuestion } from './example-lesson.js'

interface BuildReviewPromptParams {
  mdxContent: string
  quizQuestions: GeneratedQuizQuestion[]
  lessonTitle: string
  courseName: string
  pillarName: string
  semesterNumber: number
  priorLessonSummaries: string[]
}

export function buildReviewPrompt(params: BuildReviewPromptParams): string {
  const {
    mdxContent,
    quizQuestions,
    lessonTitle,
    courseName,
    pillarName,
    semesterNumber,
    priorLessonSummaries,
  } = params

  const difficultyLevel =
    semesterNumber === 1
      ? 'beginner (Semester 1 — zero prior knowledge assumed; all terms defined on first use)'
      : semesterNumber === 2
        ? 'intermediate (Semester 2 — builds on Semester 1 foundations)'
        : 'advanced (Semester 3+ — nuance, edge cases, cross-domain application)'

  const priorLessonsSection =
    priorLessonSummaries.length > 0
      ? priorLessonSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')
      : 'This is the first lesson — no prior lessons to check against.'

  const quizJson = JSON.stringify(quizQuestions, null, 2)

  return `You are a senior curriculum quality reviewer performing a two-pass quality check on a lesson.

## Review Context

- **Pillar:** ${pillarName}
- **Course:** ${courseName}
- **Lesson:** ${lessonTitle}
- **Semester:** ${semesterNumber} — target difficulty: ${difficultyLevel}

## Prior Lessons in This Course

${priorLessonsSection}

---

## Lesson to Review

**MDX Content:**
\`\`\`mdx
${mdxContent}
\`\`\`

**Quiz Questions:**
\`\`\`json
${quizJson}
\`\`\`

---

## Review Checklist

Evaluate the lesson against ALL of the following criteria. For each issue found, describe the problem and the fix applied.

### 1. Consistency with Prior Lessons
- Does the lesson contradict anything taught in prior lessons?
- Does it assume knowledge that was not covered in prior lessons or this lesson's own ConceptBlocks?
- Are terms used that were introduced in prior lessons but not defined here (acceptable) vs terms appearing from nowhere (not acceptable)?

### 2. Difficulty Progression
- Does the difficulty match the semester level (${difficultyLevel})?
- Is the progression within the lesson smooth (does each ConceptBlock build on the previous)?
- Are there any knowledge gaps — concepts assumed but never explained?

### 3. Prerequisite Coverage
- Every term bolded in a ConceptBlock should appear in a <Definition> component on first use
- Terms from prior lessons can be used without re-definition
- Identify any undefined terms that neither appear in prior lessons nor get a <Definition> here

### 4. Cross-Domain Connections
- Are cross-domain connections present and organic (not forced)?
- Do the connections genuinely illuminate the concept, or do they feel tacked on?

### 5. Quiz Alignment
- Do the quiz questions test the actual content of THIS lesson?
- Are the question types varied (recall, application, analysis, comparison)?
- Is each explanation genuinely helpful — does it teach why the correct answer is right, not just restate it?
- Are the incorrect options plausibly wrong (good distractors), not obviously absurd?

### 6. Component Correctness
- Are all Quiz tags self-closing with PLACEHOLDER_N IDs? (e.g., <Quiz questionId="PLACEHOLDER_1" />)
- Are Diagram tags using the chart prop with escaped newlines (\\n)?
- Are no disallowed components present (Question, Option, Explanation, HTML tags)?
- Does the lesson include all 6 required structural components: Hook, ConceptBlock, Quiz, DeepDive, Exercise, Takeaways?

---

## Your Task

1. Apply any necessary fixes to the MDX content and quiz questions based on the checklist above
2. If no changes are needed, return the original content unchanged
3. Keep fixes minimal — do not rewrite content that is already good

---

## Output Format

Return your response in TWO clearly separated sections:

**Section 1 — Revised MDX content (or original if unchanged):**
\`\`\`mdx
... complete lesson MDX here ...
\`\`\`

**Section 2 — Revised quiz questions JSON (or original if unchanged):**
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
`
}
