'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useSession } from '@clerk/nextjs'
import { createClerkSupabaseClient } from '@/lib/supabase/client'
import { HARDCODED_USER_ID } from '@/constants/user'
import { useQuizContext } from './QuizProvider'
import type { ActiveQuizQuestion, QuizOption } from '@/types/database.types'

// ============================================================
// Types
// ============================================================

interface QuizProps {
  questionId: string
}

// ============================================================
// Helpers
// ============================================================

const QUESTION_TYPE_LABELS: Record<ActiveQuizQuestion['question_type'], string> = {
  multiple_choice: 'Multiple Choice',
  recall: 'Recall',
  application: 'Application',
  analysis: 'Analysis',
  comparison: 'Comparison',
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E']

function computeIsCorrect(question: ActiveQuizQuestion, selectedAnswer: string): boolean {
  if (question.question_type === 'recall') {
    const accepted = question.accepted_answers ?? []
    return accepted.some(
      (ans) => ans.toLowerCase().trim() === selectedAnswer.toLowerCase().trim()
    )
  }
  return selectedAnswer === question.correct_answer
}

// ============================================================
// Sub-components
// ============================================================

interface OptionListProps {
  options: QuizOption[]
  localSelected: string | null
  submitted: boolean
  correctAnswer: string | null
  onSelect: (value: string) => void
}

function OptionList({ options, localSelected, submitted, correctAnswer, onSelect }: OptionListProps) {
  return (
    <div className="space-y-2">
      {options.map((option, index) => {
        const label = OPTION_LABELS[index] ?? String(index + 1)
        const isSelected = localSelected === option.text
        const isCorrect = option.text === correctAnswer

        let borderClass = 'border-border-subtle'
        let bgClass = 'bg-surface-card'
        let opacityClass = ''

        if (submitted) {
          if (isCorrect) {
            borderClass = 'border-emerald-500'
            bgClass = 'bg-emerald-500/10'
          } else if (isSelected && !isCorrect) {
            borderClass = 'border-red-500'
            bgClass = 'bg-red-500/10'
          } else {
            opacityClass = 'opacity-50'
          }
        } else if (isSelected) {
          borderClass = 'border-blue-500'
          bgClass = 'bg-blue-500/10'
        }

        return (
          <button
            key={option.id}
            type="button"
            disabled={submitted}
            onClick={() => onSelect(option.text)}
            className={[
              'w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors',
              borderClass,
              bgClass,
              opacityClass,
              submitted ? 'cursor-default' : 'hover:border-blue-400 hover:bg-blue-500/5 cursor-pointer',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="shrink-0 w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-semibold text-text-secondary">
              {label}
            </span>
            <span className="text-sm text-text-primary">{option.text}</span>
          </button>
        )
      })}
    </div>
  )
}

interface FeedbackProps {
  isCorrect: boolean
  explanation: string
  acceptedAnswers?: string[] | null
  questionType: ActiveQuizQuestion['question_type']
}

function Feedback({ isCorrect, explanation, acceptedAnswers, questionType }: FeedbackProps) {
  return (
    <div
      className={[
        'mt-4 rounded-lg border p-4',
        isCorrect
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-red-500/10 border-red-500/30',
      ].join(' ')}
    >
      <p
        className={[
          'text-sm font-semibold mb-1',
          isCorrect ? 'text-emerald-400' : 'text-red-400',
        ].join(' ')}
      >
        {isCorrect ? 'Correct!' : 'Not quite'}
      </p>
      <p className="text-sm text-text-secondary">{explanation}</p>
      {questionType === 'recall' && acceptedAnswers && acceptedAnswers.length > 0 && (
        <p className="text-xs text-text-muted mt-2">
          Accepted answers: {acceptedAnswers.join(', ')}
        </p>
      )}
    </div>
  )
}

// ============================================================
// Main component
// ============================================================

export function Quiz({ questionId }: QuizProps) {
  // CRITICAL: createClerkSupabaseClient calls useSession internally — must be at top level
  const supabase = createClerkSupabaseClient()
  const { session } = useSession()
  const { questions, answers, submitAnswer } = useQuizContext()

  const [localSelected, setLocalSelected] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const timeStarted = useRef<number | null>(null)

  useEffect(() => {
    timeStarted.current = Date.now()
  }, [])

  const question = questions[questionId]
  const existingAnswer = answers[questionId]
  const submitted = existingAnswer?.submitted ?? false

  // Graceful fallback if question not found in context
  if (!question) {
    return (
      <div className="bg-surface-card border border-border-subtle rounded-xl p-5 my-6 not-prose">
        <p className="text-sm text-text-muted">Question not available</p>
      </div>
    )
  }

  const userId = session?.user?.id ?? HARDCODED_USER_ID

  async function handleSubmit() {
    if (!localSelected || submitted || isSubmitting) return

    const isCorrect = computeIsCorrect(question, localSelected)
    setIsSubmitting(true)

    const timeSpent =
      timeStarted.current !== null
        ? Math.round((Date.now() - timeStarted.current) / 1000)
        : null

    try {
      // Count existing attempts for attempt_number
      const { count } = await supabase
        .from('quiz_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('question_id', questionId)
        .eq('user_id', userId)

      await supabase.from('quiz_attempts').insert({
        user_id: userId,
        question_id: questionId,
        lesson_id: question.lesson_id,
        selected_answer: localSelected,
        correct_answer: question.correct_answer ?? '',
        is_correct: isCorrect,
        time_spent_seconds: timeSpent,
        attempt_number: (count ?? 0) + 1,
      })
    } catch (error) {
      console.error('[Quiz] Failed to persist attempt:', error)
      // Do NOT block UX — always submit to context
    } finally {
      submitAnswer(questionId, localSelected!, isCorrect)
      setIsSubmitting(false)
    }
  }

  // Render question type UI
  function renderInput() {
    switch (question.question_type) {
      case 'multiple_choice':
      case 'comparison': {
        const options = (question.options as unknown as QuizOption[]) ?? []
        return (
          <OptionList
            options={options}
            localSelected={submitted ? existingAnswer.selectedAnswer : localSelected}
            submitted={submitted}
            correctAnswer={question.correct_answer ?? null}
            onSelect={setLocalSelected}
          />
        )
      }

      case 'application':
      case 'analysis': {
        const options = (question.options as unknown as QuizOption[]) ?? []
        return (
          <>
            {question.context && (
              <div className="bg-surface-card border border-border-subtle rounded-lg p-4 text-sm text-text-secondary italic mb-4">
                {question.context}
              </div>
            )}
            <OptionList
              options={options}
              localSelected={submitted ? existingAnswer.selectedAnswer : localSelected}
              submitted={submitted}
              correctAnswer={question.correct_answer ?? null}
              onSelect={setLocalSelected}
            />
          </>
        )
      }

      case 'recall': {
        return (
          <input
            type="text"
            value={submitted ? existingAnswer.selectedAnswer : (localSelected ?? '')}
            onChange={(e) => setLocalSelected(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handleSubmit()
              }
            }}
            disabled={submitted}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Type your answer..."
            className="w-full px-4 py-3 rounded-lg border border-border-subtle bg-surface-card text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-default"
          />
        )
      }

      default: {
        const _exhaustive: never = question.question_type
        return null
      }
    }
  }

  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl p-5 my-6 not-prose">
      {/* Question type badge */}
      <span className="inline-block mb-3 px-2 py-0.5 rounded-full bg-surface-hover border border-border-subtle text-xs font-semibold uppercase tracking-wide text-text-muted">
        {QUESTION_TYPE_LABELS[question.question_type]}
      </span>

      {/* Question text */}
      <p className="text-base font-semibold text-text-primary mb-4">
        {question.question_text}
      </p>

      {/* Input area */}
      {renderInput()}

      {/* Submit button — hidden after submission */}
      {!submitted && (
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!localSelected || isSubmitting}
          className="mt-4 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Checking...
            </>
          ) : (
            'Check Answer'
          )}
        </button>
      )}

      {/* Feedback section */}
      {submitted && (
        <Feedback
          isCorrect={existingAnswer.isCorrect}
          explanation={question.explanation}
          acceptedAnswers={question.accepted_answers}
          questionType={question.question_type}
        />
      )}
    </div>
  )
}
