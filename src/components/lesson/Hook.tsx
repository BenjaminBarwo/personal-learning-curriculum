import React from 'react'

interface HookProps {
  children: React.ReactNode
}

export function Hook({ children }: HookProps) {
  return (
    <div className="relative my-8 rounded-2xl border border-border-default bg-surface-card px-8 py-6 overflow-hidden">
      {/* Decorative accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gradient-to-b from-text-secondary to-text-muted opacity-40" />
      <div className="flex items-start gap-4">
        <span
          className="mt-0.5 shrink-0 text-2xl select-none"
          aria-hidden="true"
        >
          &#x1F4A1;
        </span>
        <p className="text-xl font-medium leading-relaxed text-text-primary">
          {children}
        </p>
      </div>
    </div>
  )
}
