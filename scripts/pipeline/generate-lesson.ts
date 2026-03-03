import { anthropic } from '../lib/anthropic.js'
import { withBackoff } from '../lib/retry.js'
import { buildSystemPrompt } from '../prompts/system-prompt.js'
import type { GeneratedQuizQuestion } from '../prompts/example-lesson.js'
import type { LessonTarget } from '../lib/types.js'

interface GenerateLessonParams {
  lessonTarget: LessonTarget
  researchNotes: string
  priorLessonSummaries: string[]
  model: string
  totalLessons: number
}

interface GenerateLessonResult {
  mdx: string
  quizQuestions: GeneratedQuizQuestion[]
}

/**
 * Parse MDX content from between ```mdx and ``` markers.
 * Returns null if the markers are not found.
 */
function extractMdxBlock(text: string): string | null {
  const match = text.match(/```mdx\s*\n([\s\S]*?)```/)
  return match ? match[1].trim() : null
}

/**
 * Parse quiz questions JSON from between ```json and ``` markers.
 * Returns empty array if markers are absent or JSON is malformed.
 */
function extractQuizJson(text: string): GeneratedQuizQuestion[] {
  const match = text.match(/```json\s*\n([\s\S]*?)```/)
  if (!match) return []

  try {
    const parsed = JSON.parse(match[1].trim()) as unknown
    if (!Array.isArray(parsed)) {
      console.warn('[generate] Quiz JSON was not an array — skipping quiz questions')
      return []
    }
    return parsed as GeneratedQuizQuestion[]
  } catch (err) {
    console.warn(
      `[generate] Failed to parse quiz questions JSON: ${err instanceof Error ? err.message : String(err)}`
    )
    return []
  }
}

export async function generateLesson(
  params: GenerateLessonParams
): Promise<GenerateLessonResult> {
  const { lessonTarget, researchNotes, priorLessonSummaries, model, totalLessons } = params

  const systemPrompt = buildSystemPrompt({
    pillarName: lessonTarget.pillarName,
    courseName: lessonTarget.courseName,
    semesterNumber: lessonTarget.semesterNumber,
    priorLessonSummaries,
    lessonPosition: lessonTarget.displayOrder,
    totalLessons,
  })

  const userMessage = `Write a complete lesson for: "${lessonTarget.name}"

## Research Notes (use these to ground your examples and connections)

${researchNotes}

Now write the full lesson following all instructions in the system prompt. Return ONLY the two sections (MDX content and quiz questions JSON) — no additional commentary.`

  // Use streaming to avoid idle connection timeouts on long generations (recommended in RESEARCH.md Pitfall 5)
  const fullText = await withBackoff(async () => {
    const stream = anthropic.messages.stream({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const finalMessage = await stream.finalMessage()

    const textBlocks: string[] = []
    for (const block of finalMessage.content) {
      if (block.type === 'text') {
        textBlocks.push(block.text)
      }
    }
    return textBlocks.join('\n\n')
  })

  const mdx = extractMdxBlock(fullText)
  const quizQuestions = extractQuizJson(fullText)

  if (!mdx) {
    // Claude didn't use the expected format — extract entire response as MDX fallback
    console.warn(
      `[generate] Response did not contain \`\`\`mdx markers for lesson "${lessonTarget.name}" — using full text as MDX fallback`
    )
    return {
      mdx: fullText,
      quizQuestions,
    }
  }

  return { mdx, quizQuestions }
}
