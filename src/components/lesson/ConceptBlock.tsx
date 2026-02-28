import React from 'react'

interface ConceptBlockProps {
  title: string
  children: React.ReactNode
}

export function ConceptBlock({ title, children }: ConceptBlockProps) {
  return (
    <div className="my-6 rounded-xl border border-border-subtle bg-surface-secondary overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border-subtle bg-surface-card px-6 py-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-tertiary">
          <svg
            className="h-4 w-4 text-text-secondary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      </div>
      <div className="px-6 py-5 text-text-secondary leading-relaxed">
        {children}
      </div>
    </div>
  )
}
