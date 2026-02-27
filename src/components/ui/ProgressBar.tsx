interface ProgressBarProps {
  percent: number     // 0-100
  color: string       // hex value for fill (pillar color)
  showLabel?: boolean // show percentage text (default true)
  size?: 'sm' | 'md' // sm = h-1.5, md = h-2.5 (default md)
}

export function ProgressBar({ percent, color, showLabel = true, size = 'md' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent))
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2.5'

  return (
    <div>
      <div
        className={`w-full rounded-full bg-surface-tertiary ${heightClass}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`${heightClass} rounded-full transition-all duration-300`}
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-text-muted mt-1">{clamped}%</p>
      )}
    </div>
  )
}
