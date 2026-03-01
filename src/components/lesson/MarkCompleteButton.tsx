'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { markLessonComplete } from '@/lib/actions/progress'

interface MarkCompleteButtonProps {
  lessonId: string
  lessonSlug: string
  initialCompleted?: boolean
}

export function MarkCompleteButton({ lessonId, lessonSlug: _lessonSlug, initialCompleted }: MarkCompleteButtonProps) {
  const router = useRouter()

  const [isCompleted, setIsCompleted] = useState(initialCompleted ?? false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleMarkComplete() {
    if (isCompleted || isLoading) return

    setIsLoading(true)
    setErrorMessage(null)
    try {
      const result = await markLessonComplete(lessonId)
      if (!result.success) throw new Error(result.error)
      setIsCompleted(true)
      router.refresh() // triggers RSC re-render so progress bars on parent pages update
    } catch (err) {
      console.error('Failed to mark lesson complete:', err)
      setErrorMessage('Could not save progress. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center mt-10 mb-2 gap-2">
      <button
        type="button"
        onClick={handleMarkComplete}
        disabled={isCompleted || isLoading}
        aria-label={isCompleted ? 'Lesson marked as complete' : 'Mark this lesson as complete'}
        className={`
          inline-flex items-center gap-2.5 rounded-lg px-6 py-3 text-sm font-semibold
          transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          ${
            isCompleted
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default focus-visible:ring-emerald-500'
              : isLoading
              ? 'bg-emerald-600/50 text-emerald-300 border border-emerald-600/30 cursor-wait opacity-75 focus-visible:ring-emerald-500'
              : 'bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-500 hover:border-emerald-500 active:scale-[0.98] focus-visible:ring-emerald-500'
          }
        `}
      >
        {isCompleted ? (
          <>
            <svg
              className="w-4.5 h-4.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Completed
          </>
        ) : isLoading ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
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
            Saving...
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Mark as Complete
          </>
        )}
      </button>
      {errorMessage && (
        <p className="text-sm text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
