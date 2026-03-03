'use server'

import { fsrs } from 'ts-fsrs'
import type { Grade } from 'ts-fsrs'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'
import type { FsrsCard, FsrsCardState, FsrsRating, QuizOption } from '@/types/database.types'

export interface DueCardForReview {
  cardId: string
  questionId: string
  questionText: string
  questionType: string
  correctAnswer: string | null
  acceptedAnswers: string[] | null
  explanation: string
  options: QuizOption[] | null
  // FSRS card state fields needed for f.repeat() computation on the client
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: FsrsCardState
  last_review: string | null
}

const f = fsrs() // FSRS-5 default parameters — singleton, stateless

/**
 * Apply a rating to an FSRS card after the user reviews it.
 * Computes the next card state using ts-fsrs, persists the updated card,
 * and appends a review log entry.
 *
 * Called from the review UI (Phase 10) when the user taps Again/Hard/Good/Easy.
 */
export async function submitFsrsReview(params: {
  cardId: string
  rating: 1 | 2 | 3 | 4  // Again=1, Hard=2, Good=3, Easy=4
}): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: 'Unauthorized' }

  const supabase = createAdminSupabaseClient()

  // 1. Fetch current card state — cast to FsrsCard for explicit typing
  const { data, error: fetchError } = await supabase
    .from('fsrs_cards')
    .select('*')
    .eq('id', params.cardId)
    .eq('user_id', userId)
    .single()

  if (fetchError || !data) {
    return { success: false, error: 'Card not found' }
  }

  const card = data as unknown as FsrsCard

  // 2. Reconstruct ts-fsrs Card from DB row
  const fsrsCard = {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  }

  // 3. Compute next card state
  const now = new Date()
  const grade = params.rating as Grade
  const recordLog = f.next(fsrsCard, now, grade)

  // NOTE: f.next() with a specific grade returns { card: Card, log: ReviewLog } directly.
  const nextCard = recordLog.card
  const log = recordLog.log

  // 4. Update card state in DB
  const { error: updateError } = await supabase
    .from('fsrs_cards')
    .update({
      due: nextCard.due.toISOString(),
      stability: nextCard.stability,
      difficulty: nextCard.difficulty,
      elapsed_days: nextCard.elapsed_days,
      scheduled_days: nextCard.scheduled_days,
      reps: nextCard.reps,
      lapses: nextCard.lapses,
      state: nextCard.state as unknown as FsrsCardState,
      last_review: now.toISOString(),
      // updated_at is auto-set by trigger
    })
    .eq('id', params.cardId)
    .eq('user_id', userId)

  if (updateError) {
    console.error('Failed to update FSRS card:', updateError)
    return { success: false, error: 'Could not save review. Please try again.' }
  }

  // 5. Append review log (non-fatal — card was already updated)
  const { error: logError } = await supabase
    .from('fsrs_review_logs')
    .insert({
      user_id: userId,
      card_id: params.cardId,
      question_id: card.question_id,
      rating: log.rating as unknown as FsrsRating,
      state: log.state as unknown as FsrsCardState,
      due: log.due.toISOString(),
      stability: log.stability,
      difficulty: log.difficulty,
      elapsed_days: log.elapsed_days,
      last_elapsed_days: log.last_elapsed_days,
      scheduled_days: log.scheduled_days,
      review: log.review.toISOString(),
    })

  if (logError) {
    console.error('Failed to insert FSRS review log:', logError)
    // Non-fatal: card was updated; log insertion failure should not block the user
  }

  return { success: true }
}

/**
 * Get the count of cards due for review right now.
 * Used by the dashboard widget (Phase 10) to show "X due today".
 * Returns 0 if no cards are due or if the user is not authenticated.
 */
export async function getDueCardCount(): Promise<number> {
  const { userId } = await auth()
  if (!userId) return 0

  const supabase = createAdminSupabaseClient()

  const { count, error } = await supabase
    .from('fsrs_cards')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .lte('due', new Date().toISOString())

  if (error) {
    console.error('Failed to get due card count:', error)
    return 0
  }

  return count ?? 0
}

/**
 * Get all cards due for review right now, joined with their quiz question content.
 * Used by the review page (Phase 10) to populate the review session.
 * Returns an empty array if no cards are due or if the user is not authenticated.
 * Orphaned cards (soft-deleted questions) are filtered out.
 */
export async function getDueCardsForReview(): Promise<DueCardForReview[]> {
  const { userId } = await auth()
  if (!userId) return []

  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from('fsrs_cards')
    .select('id, question_id, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review, quiz_questions(question_text, question_type, correct_answer, accepted_answers, explanation, options)')
    .eq('user_id', userId)
    .lte('due', new Date().toISOString())
    .order('due', { ascending: true })

  if (error) {
    console.error('Failed to get due cards for review:', error)
    return []
  }

  return (data ?? [])
    .filter((row) => row.quiz_questions !== null)
    .map((row) => {
      const q = row.quiz_questions as {
        question_text: string
        question_type: string
        correct_answer: string | null
        accepted_answers: string[] | null
        explanation: string
        options: unknown
      }
      return {
        cardId: row.id,
        questionId: row.question_id,
        questionText: q.question_text,
        questionType: q.question_type,
        correctAnswer: q.correct_answer,
        acceptedAnswers: q.accepted_answers,
        explanation: q.explanation,
        options: q.options as unknown as QuizOption[] | null,
        due: row.due,
        stability: row.stability,
        difficulty: row.difficulty,
        elapsed_days: row.elapsed_days,
        scheduled_days: row.scheduled_days,
        learning_steps: row.learning_steps,
        reps: row.reps,
        lapses: row.lapses,
        state: row.state as FsrsCardState,
        last_review: row.last_review,
      } satisfies DueCardForReview
    })
}

/**
 * Get the soonest future due card for the current user.
 * Used by the review page "all caught up" state to display when the next card is due.
 * Returns null if no future cards exist or if the user is not authenticated.
 */
export async function getNextDueCard(): Promise<{ due: string } | null> {
  const { userId } = await auth()
  if (!userId) return null

  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from('fsrs_cards')
    .select('due')
    .eq('user_id', userId)
    .gt('due', new Date().toISOString())
    .order('due', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Failed to get next due card:', error)
    return null
  }

  if (!data) return null

  return { due: data.due }
}
