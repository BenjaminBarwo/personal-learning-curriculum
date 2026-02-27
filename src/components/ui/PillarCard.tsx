import Link from 'next/link'
import { ProgressBar } from './ProgressBar'

interface PillarCardProps {
  name: string
  slug: string
  description: string | null
  color: string       // hex color for accent bar
  progress: number    // 0-100 (mock in Phase 2, real in Phase 5)
  lessonCount: number
}

export function PillarCard({ name, slug, description, color, progress, lessonCount }: PillarCardProps) {
  return (
    <Link
      href={`/pillars/${slug}`}
      className="flex rounded-xl bg-surface-card border border-border-subtle hover:border-border-default hover:bg-surface-hover transition-all overflow-hidden group"
    >
      {/* Left accent bar */}
      <div
        className="w-1 shrink-0 rounded-l-xl"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />

      {/* Card content */}
      <div className="flex flex-col gap-2 p-4 flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-text-primary leading-tight group-hover:text-text-secondary transition-colors">
          {name}
        </h3>

        {description && (
          <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}

        <p className="text-xs text-text-muted">
          {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
        </p>

        <div className="mt-auto pt-1">
          <ProgressBar percent={progress} color={color} size="sm" />
        </div>
      </div>
    </Link>
  )
}
