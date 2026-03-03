import { auth } from '@clerk/nextjs/server'
import { getDueCardsForReview, getNextDueCard } from '@/lib/actions/fsrs'
import { ReviewSession } from '@/components/review/ReviewSession'
import Link from 'next/link'

// Required: prevents Next.js from statically generating this page.
// Due cards are per-user, per-request — they must be fetched fresh on every visit.
export const dynamic = 'force-dynamic'

/**
 * Format the number of milliseconds until a future ISO date string as a
 * human-readable string ("5 minutes", "2 hours", "3 days", etc.).
 * Returns "very soon" if the date is in the past.
 */
function formatTimeUntil(dueIso: string): string {
  const diff = new Date(dueIso).getTime() - Date.now()
  if (diff <= 0) return 'very soon'

  const mins = Math.round(diff / 60000)
  if (mins < 60) return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`

  const hours = Math.round(diff / 3600000)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`

  const days = Math.round(diff / 86400000)
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

export default async function ReviewPage() {
  // Auth guard — middleware handles the redirect; this is a defensive safety check
  const { userId } = await auth()
  if (!userId) return null

  const dueCards = await getDueCardsForReview()

  // No cards due: show "All caught up" state with next review time (FSRS-07)
  if (dueCards.length === 0) {
    const nextCard = await getNextDueCard()

    return (
      <div className="mx-auto max-w-2xl space-y-6 text-center py-12">
        <div className="rounded-xl border border-border-subtle bg-surface-card p-8 space-y-4">
          {/* Checkmark icon */}
          <svg
            className="w-16 h-16 text-emerald-500 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>

          <h1 className="text-2xl font-bold text-text-primary">All caught up!</h1>

          {nextCard ? (
            <p className="text-text-secondary">
              Next review in {formatTimeUntil(nextCard.due)}
            </p>
          ) : (
            <p className="text-text-secondary">
              Complete some lessons to start building your review deck.
            </p>
          )}

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors mt-4"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Cards are due: render the review session (FSRS-04)
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-text-primary">Review</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Rate your recall to optimize your learning schedule
        </p>
      </div>
      <ReviewSession cards={dueCards} />
    </div>
  )
}
