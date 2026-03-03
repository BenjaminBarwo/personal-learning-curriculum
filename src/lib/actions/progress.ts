'use server'

import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'
import { createEmptyCard } from 'ts-fsrs'
import type { FsrsCardState } from '@/types/database.types'

export async function markLessonComplete(lessonId: string): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: 'Unauthorized' }

  const supabase = createAdminSupabaseClient()

  const { error } = await supabase
    .from('progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        status: 'completed' as const,
        completed_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    )

  if (error) {
    console.error('Failed to mark lesson complete:', error)
    return { success: false, error: 'Could not save progress. Please try again.' }
  }

  // 2. Seed FSRS cards for all quiz questions in this lesson (non-fatal)
  const { data: questions, error: questionError } = await supabase
    .from('quiz_questions')
    .select('id')
    .eq('lesson_id', lessonId)
    .is('deleted_at', null)

  if (questionError) {
    console.error('Failed to fetch quiz questions for FSRS seeding:', questionError)
    // Non-fatal: progress was saved; FSRS seeding failure should not block the user
    return { success: true }
  }

  if (questions && questions.length > 0) {
    const now = new Date()
    const emptyCard = createEmptyCard(now)
    const cardRows = questions.map((q) => ({
      user_id: userId,
      question_id: q.id,
      lesson_id: lessonId,
      due: emptyCard.due.toISOString(),
      stability: emptyCard.stability,
      difficulty: emptyCard.difficulty,
      elapsed_days: emptyCard.elapsed_days,
      scheduled_days: emptyCard.scheduled_days,
      reps: emptyCard.reps,
      lapses: emptyCard.lapses,
      state: emptyCard.state as unknown as FsrsCardState,  // State.New = 0
      last_review: null,
    }))

    const { error: cardError } = await supabase
      .from('fsrs_cards')
      .upsert(cardRows, { onConflict: 'user_id,question_id', ignoreDuplicates: true })

    if (cardError) {
      console.error('Failed to seed FSRS cards:', cardError)
      // Non-fatal: log but do not surface to user
    }
  }

  return { success: true }
}

export async function persistQuizAttempt(params: {
  questionId: string
  lessonId: string
  selectedAnswer: string
  correctAnswer: string
  isCorrect: boolean
  timeSpentSeconds: number | null
}): Promise<{ success: boolean }> {
  const { userId } = await auth()
  if (!userId) return { success: false }

  const supabase = createAdminSupabaseClient()

  const { count, error: countError } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('question_id', params.questionId)
    .eq('user_id', userId)

  if (countError) {
    console.error('[Quiz] Failed to count attempts:', countError)
  }

  const { error: insertError } = await supabase.from('quiz_attempts').insert({
    user_id: userId,
    question_id: params.questionId,
    lesson_id: params.lessonId,
    selected_answer: params.selectedAnswer,
    correct_answer: params.correctAnswer,
    is_correct: params.isCorrect,
    time_spent_seconds: params.timeSpentSeconds,
    attempt_number: (count ?? 0) + 1,
  })

  if (insertError) {
    console.error('[Quiz] Failed to persist attempt:', insertError)
    return { success: false }
  }

  return { success: true }
}
