'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { fsrs, Rating } from 'ts-fsrs'
import { submitFsrsReview } from '@/lib/actions/fsrs'
import type { DueCardForReview } from '@/lib/actions/fsrs'

// FSRS singleton at module level — same default params as server action
const f = fsrs()

/**
 * Compute interval hints for all 4 ratings given the current card state.
 * Returns a map of rating number -> human-readable interval string.
 *
 * For learning-phase cards (scheduled_days === 0), interval is computed
 * from the due date difference in minutes (minimum 1 min).
 * For review-phase cards, interval is in days.
 */
function computeIntervalHints(card: DueCardForReview): Record<1 | 2 | 3 | 4, string> {
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

  const now = new Date()
  const repeatLog = f.repeat(fsrsCard, now)

  function formatInterval(scheduledDays: number, due: Date): string {
    if (scheduledDays === 0) {
      // Learning phase — compute minutes until due
      const mins = Math.max(1, Math.round((due.getTime() - now.getTime()) / 60000))
      return `${mins} ${mins === 1 ? 'min' : 'min'}`
    }
    return `${scheduledDays} ${scheduledDays === 1 ? 'day' : 'days'}`
  }

  return {
    1: formatInterval(repeatLog[Rating.Again].card.scheduled_days, repeatLog[Rating.Again].card.due),
    2: formatInterval(repeatLog[Rating.Hard].card.scheduled_days, repeatLog[Rating.Hard].card.due),
    3: formatInterval(repeatLog[Rating.Good].card.scheduled_days, repeatLog[Rating.Good].card.due),
    4: formatInterval(repeatLog[Rating.Easy].card.scheduled_days, repeatLog[Rating.Easy].card.due),
  }
}

interface ReviewSessionProps {
  cards: DueCardForReview[]
}

export function ReviewSession({ cards }: ReviewSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const currentCard = cards[currentIndex]

  // Guard: if no card (shouldn't happen but defensive)
  if (!currentCard) return null

  const intervalHints = computeIntervalHints(currentCard)
  const isLastCard = currentIndex === cards.length - 1

  function handleReveal() {
    setIsAnswerRevealed(true)
  }

  function handleRate(rating: 1 | 2 | 3 | 4) {
    startTransition(async () => {
      await submitFsrsReview({ cardId: currentCard.cardId, rating })

      if (isLastCard) {
        // Trigger RSC re-render — server will see no more due cards and show "All caught up"
        router.refresh()
      } else {
        setCurrentIndex((prev) => prev + 1)
        setIsAnswerRevealed(false)
      }
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress indicator */}
      <p className="text-sm text-text-muted text-center">
        Card {currentIndex + 1} of {cards.length}
      </p>

      {/* Card container */}
      <div className="rounded-xl border border-border-subtle bg-surface-card p-6 space-y-4">
        {/* Question */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">Question</p>
          <p className="text-lg text-text-primary">{currentCard.questionText}</p>
        </div>

        {/* Context block — additional info referenced by the question */}
        {currentCard.context && (
          <div className="rounded-lg border border-border-subtle bg-surface-primary px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">Context</p>
            <p className="text-sm text-text-secondary italic">{currentCard.context}</p>
          </div>
        )}

        {/* Multiple choice options — shown as read-only list; correct answer highlighted when revealed */}
        {currentCard.options && (
          <div className="space-y-2">
            {currentCard.options.map((opt) => (
              <div
                key={opt.id}
                className={`rounded-lg border px-4 py-3 text-sm ${
                  isAnswerRevealed && opt.isCorrect
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : isAnswerRevealed && !opt.isCorrect
                    ? 'border-border-subtle bg-surface-primary text-text-muted'
                    : 'border-border-subtle bg-surface-primary text-text-secondary'
                }`}
              >
                {opt.text}
              </div>
            ))}
          </div>
        )}

        {/* Answer section — only shown after reveal */}
        {isAnswerRevealed && (
          <div className="border-t border-border-subtle pt-4 space-y-3">
            {/* Correct answer for non-MC questions */}
            {currentCard.correctAnswer && !currentCard.options && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400 mb-1">Answer</p>
                <p className="text-text-primary">{currentCard.correctAnswer}</p>
              </div>
            )}
            {/* Explanation */}
            {currentCard.explanation && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">Explanation</p>
                <p className="text-sm text-text-secondary">{currentCard.explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Show Answer button — visible before reveal */}
      {!isAnswerRevealed && (
        <button
          type="button"
          onClick={handleReveal}
          className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          Show Answer
        </button>
      )}

      {/* Rating buttons with interval hints — visible after reveal */}
      {isAnswerRevealed && (
        <div className="grid grid-cols-4 gap-3">
          {(
            [
              { rating: 1 as const, label: 'Again', color: 'bg-red-600 hover:bg-red-500' },
              { rating: 2 as const, label: 'Hard', color: 'bg-orange-600 hover:bg-orange-500' },
              { rating: 3 as const, label: 'Good', color: 'bg-blue-600 hover:bg-blue-500' },
              { rating: 4 as const, label: 'Easy', color: 'bg-emerald-600 hover:bg-emerald-500' },
            ] as const
          ).map(({ rating, label, color }) => (
            <button
              key={rating}
              type="button"
              onClick={() => handleRate(rating)}
              disabled={isPending}
              className={`rounded-lg px-3 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${color}`}
            >
              <span className="block">{label}</span>
              <span className="block text-xs font-normal opacity-80 mt-0.5">{intervalHints[rating]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
