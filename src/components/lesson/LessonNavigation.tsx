import Link from 'next/link'

interface LessonLink {
  name: string
  href: string
}

interface LessonNavigationProps {
  prevLesson: LessonLink | null
  nextLesson: LessonLink | null
}

export function LessonNavigation({ prevLesson, nextLesson }: LessonNavigationProps) {
  if (!prevLesson && !nextLesson) {
    return null
  }

  return (
    <nav
      aria-label="Lesson navigation"
      className="flex items-stretch justify-between gap-4 mt-8 pt-8 border-t border-border-subtle"
    >
      {prevLesson ? (
        <Link
          href={prevLesson.href}
          className="group flex items-center gap-3 flex-1 bg-surface-card border border-border-subtle rounded-lg px-5 py-4 hover:border-border-default hover:bg-surface-hover transition-colors duration-150"
        >
          <svg
            className="w-5 h-5 text-text-muted shrink-0 group-hover:text-text-secondary transition-colors duration-150"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-0.5">
              Previous
            </p>
            <p className="text-sm font-semibold text-text-primary truncate">
              {prevLesson.name}
            </p>
          </div>
        </Link>
      ) : (
        <div className="flex-1" aria-hidden="true" />
      )}

      {nextLesson ? (
        <Link
          href={nextLesson.href}
          className="group flex items-center justify-end gap-3 flex-1 bg-surface-card border border-border-subtle rounded-lg px-5 py-4 hover:border-border-default hover:bg-surface-hover transition-colors duration-150 text-right"
        >
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-0.5">
              Next
            </p>
            <p className="text-sm font-semibold text-text-primary truncate">
              {nextLesson.name}
            </p>
          </div>
          <svg
            className="w-5 h-5 text-text-muted shrink-0 group-hover:text-text-secondary transition-colors duration-150"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ) : (
        <div className="flex-1" aria-hidden="true" />
      )}
    </nav>
  )
}
