import React from 'react'

interface ExerciseProps {
  children: React.ReactNode
}

export function Exercise({ children }: ExerciseProps) {
  return (
    <div className="my-6 rounded-xl border border-amber-500/30 bg-amber-500/10 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-amber-500/20 px-6 py-4">
        <span
          className="shrink-0 text-amber-400 text-lg select-none"
          aria-hidden="true"
        >
          &#x270F;&#xFE0F;
        </span>
        <h3 className="text-base font-semibold text-amber-300 tracking-wide uppercase text-xs">
          Exercise
        </h3>
      </div>
      <div className="px-6 py-5 text-text-secondary leading-relaxed">
        {children}
      </div>
    </div>
  )
}
