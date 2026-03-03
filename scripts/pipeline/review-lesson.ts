import { anthropic } from '../lib/anthropic.js'
import { withBackoff } from '../lib/retry.js'
import { buildReviewPrompt } from '../prompts/review-prompt.js'
import type { GeneratedQuizQuestion } from '../prompts/example-lesson.js'
import type { LessonTarget } from '../lib/types.js'

interface ReviewLessonParams {
  mdx: string
  quizQuestions: GeneratedQuizQuestion[]
  lessonTarget: LessonTarget
  priorLessonSummaries: string[]
  model: string
}

interface ReviewLessonResult {
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
 * Returns null if markers are absent or JSON is malformed.
 */
function extractQuizJson(text: string): GeneratedQuizQuestion[] | null {
  const match = text.match(/```json\s*\n([\s\S]*?)```/)
  if (!match) return null

  try {
    const parsed = JSON.parse(match[1].trim()) as unknown
    if (!Array.isArray(parsed)) {
      console.warn('[review] Quiz JSON was not an array — keeping original quiz questions')
      return null
    }
    return parsed as GeneratedQuizQuestion[]
  } catch (err) {
    console.warn(
      `[review] Failed to parse reviewer quiz questions JSON: ${err instanceof Error ? err.message : String(err)} — keeping original`
    )
    return null
  }
}

export async function reviewLesson(params: ReviewLessonParams): Promise<ReviewLessonResult> {
  const { mdx, quizQuestions, lessonTarget, priorLessonSummaries, model } = params

  const reviewPrompt = buildReviewPrompt({
    mdxContent: mdx,
    quizQuestions,
    lessonTitle: lessonTarget.name,
    courseName: lessonTarget.courseName,
    pillarName: lessonTarget.pillarName,
    semesterNumber: lessonTarget.semesterNumber,
    priorLessonSummaries,
  })

  // Use streaming to avoid idle connection timeout on long reviews
  const response = await withBackoff(async () => {
    const stream = anthropic.messages.stream({
      model,
      max_tokens: 8192,
      messages: [{ role: 'user', content: reviewPrompt }],
    })
    return stream.finalMessage()
  })

  const textBlocks: string[] = []
  for (const block of response.content) {
    if (block.type === 'text') {
      textBlocks.push(block.text)
    }
  }
  const fullText = textBlocks.join('\n\n')

  const revisedMdx = extractMdxBlock(fullText)
  const revisedQuizQuestions = extractQuizJson(fullText)

  // If the reviewer didn't return expected format, keep the original content unchanged
  if (!revisedMdx) {
    console.warn(
      `[review] Reviewer response did not contain \`\`\`mdx markers for lesson "${lessonTarget.name}" — keeping original MDX`
    )
    return { mdx, quizQuestions }
  }

  return {
    mdx: revisedMdx,
    quizQuestions: revisedQuizQuestions ?? quizQuestions,
  }
}
