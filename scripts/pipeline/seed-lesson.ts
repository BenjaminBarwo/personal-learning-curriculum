import { supabase } from '../lib/supabase.js'
import type { GeneratedQuizQuestion } from '../prompts/example-lesson.js'

interface SeedLessonParams {
  lessonId: string
  mdxContent: string
  quizQuestions: GeneratedQuizQuestion[]
  dryRun: boolean
  force?: boolean
}

/**
 * Seed a lesson's MDX content and quiz questions into Supabase.
 *
 * In dry-run mode: prints content to stdout, no DB writes.
 * In normal mode:
 *   1. Delete existing quiz questions if --force
 *   2. Insert quiz questions into quiz_questions table
 *   3. Replace PLACEHOLDER_N references in MDX with real UUIDs
 *   4. Update lesson row with final MDX (triggers trg_lessons_version)
 */
export async function seedLesson(params: SeedLessonParams): Promise<void> {
  const { lessonId, mdxContent, quizQuestions, dryRun, force = false } = params

  if (dryRun) {
    console.log('\n--- DRY RUN: MDX OUTPUT ---\n')
    console.log(mdxContent)
    console.log('\n--- DRY RUN: QUIZ QUESTIONS ---\n')
    console.log(JSON.stringify(quizQuestions, null, 2))
    return
  }

  // Step 1: Delete existing quiz questions if --force
  if (force) {
    const { error: deleteErr } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('lesson_id', lessonId)

    if (deleteErr) {
      throw new Error(`Failed to delete existing quiz questions: ${deleteErr.message}`)
    }
  }

  // Step 2: Insert quiz questions and collect UUIDs
  let finalMdx = mdxContent

  if (quizQuestions.length > 0) {
    const rows = quizQuestions.map((q, index) => {
      // Extract the correct answer text from options
      const correctOption = q.options.find((opt) => opt.isCorrect)
      const correctAnswer = correctOption?.text ?? null

      return {
        lesson_id: lessonId,
        question_type: q.questionType,
        question_text: q.questionText,
        context: q.context,
        options: q.options as unknown as import('../../src/types/database.types').Json,
        correct_answer: correctAnswer,
        explanation: q.explanation,
        display_order: index + 1,
      }
    })

    const { data: insertedRows, error: insertErr } = await supabase
      .from('quiz_questions')
      .insert(rows)
      .select('id')

    if (insertErr) {
      throw new Error(`Failed to insert quiz questions: ${insertErr.message}`)
    }

    if (!insertedRows || insertedRows.length === 0) {
      throw new Error('Quiz question insert returned no rows — check RLS policies.')
    }

    // Step 3: Replace PLACEHOLDER_N with real UUIDs
    for (let i = 0; i < insertedRows.length; i++) {
      const placeholder = `PLACEHOLDER_${i + 1}`
      const uuid = insertedRows[i].id

      if (!finalMdx.includes(placeholder)) {
        console.warn(
          `[seed] No ${placeholder} found in MDX for lesson ${lessonId} — quiz question ${uuid} will not be referenced`
        )
        continue
      }

      finalMdx = finalMdx.replaceAll(placeholder, uuid)
    }

    // Warn if any PLACEHOLDER_N references remain unreplaced
    const remainingPlaceholders = finalMdx.match(/PLACEHOLDER_\d+/g)
    if (remainingPlaceholders) {
      console.warn(
        `[seed] Unreplaced placeholders remain in MDX: ${remainingPlaceholders.join(', ')}`
      )
    }
  }

  // Step 4: Update the lesson row with final MDX
  // The DB trigger trg_lessons_version automatically captures prior content into lesson_versions
  const { data: updatedRows, error: updateErr } = await supabase
    .from('lessons')
    .update({ mdx_content: finalMdx, updated_at: new Date().toISOString() })
    .eq('id', lessonId)
    .select('id')

  if (updateErr) {
    throw new Error(`Failed to update lesson ${lessonId}: ${updateErr.message}`)
  }

  // Per RESEARCH.md Pitfall 4: .update() on a non-existent row silently returns 0 rows
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error(
      `Lesson ${lessonId} not found in database — lesson row must exist before seeding. ` +
        'Run the curriculum seed script first.'
    )
  }
}
