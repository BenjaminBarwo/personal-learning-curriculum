'use server'

import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

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
