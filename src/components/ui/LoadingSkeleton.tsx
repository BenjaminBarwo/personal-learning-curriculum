// CardSkeleton mimics PillarCard shape with animated pulse
export function CardSkeleton() {
  return (
    <div className="flex rounded-xl bg-surface-card border border-border-subtle overflow-hidden animate-pulse">
      {/* Accent bar placeholder */}
      <div className="w-1 shrink-0 bg-surface-tertiary rounded-l-xl" />

      {/* Content area */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Title */}
        <div className="h-5 bg-surface-tertiary rounded w-3/4" />

        {/* Description lines */}
        <div className="space-y-1.5">
          <div className="h-3.5 bg-surface-tertiary rounded w-full" />
          <div className="h-3.5 bg-surface-tertiary rounded w-4/5" />
        </div>

        {/* Lesson count */}
        <div className="h-3 bg-surface-tertiary rounded w-1/4" />

        {/* Progress bar */}
        <div className="h-1.5 bg-surface-tertiary rounded-full w-full mt-1" />
      </div>
    </div>
  )
}

// ListSkeleton — rows of content placeholders for list pages
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-xl bg-surface-card border border-border-subtle"
        >
          <div className="h-10 w-10 rounded-lg bg-surface-tertiary shrink-0" />
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="h-4 bg-surface-tertiary rounded w-1/2" />
            <div className="h-3 bg-surface-tertiary rounded w-3/4" />
          </div>
          <div className="h-4 w-16 bg-surface-tertiary rounded shrink-0" />
        </div>
      ))}
    </div>
  )
}

// PageSkeleton — full page skeleton with header area + card grid
export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Page header area */}
      <div className="space-y-2">
        <div className="h-8 bg-surface-tertiary rounded w-48" />
        <div className="h-4 bg-surface-tertiary rounded w-96 max-w-full" />
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
