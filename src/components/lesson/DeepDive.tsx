'use client'

import React, { createContext, useContext, useState, useId } from 'react'

interface DeepDiveContextValue {
  openId: string | null
  setOpenId: (id: string | null) => void
}

const DeepDiveContext = createContext<DeepDiveContextValue | null>(null)

interface DeepDiveProviderProps {
  children: React.ReactNode
}

export function DeepDiveProvider({ children }: DeepDiveProviderProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <DeepDiveContext.Provider value={{ openId, setOpenId }}>
      {children}
    </DeepDiveContext.Provider>
  )
}

interface DeepDiveProps {
  title: string
  readingMinutes?: number
  id?: string
  children: React.ReactNode
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 64)
}

export function DeepDive({
  title,
  readingMinutes,
  id,
  children,
}: DeepDiveProps) {
  const generatedId = useId()
  const stableId = id ?? `deep-dive-${slugify(title)}-${generatedId}`

  const ctx = useContext(DeepDiveContext)
  const isOpen = ctx ? ctx.openId === stableId : false

  function handleToggle() {
    if (!ctx) return
    ctx.setOpenId(isOpen ? null : stableId)
  }

  return (
    <div className="my-6 rounded-xl border border-border-subtle bg-surface-secondary overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-surface-hover transition-colors duration-150"
        aria-expanded={isOpen}
        aria-controls={`${stableId}-content`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="shrink-0 text-text-muted select-none"
            aria-hidden="true"
          >
            &#x1F50D;
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-0.5">
              Deep Dive
            </span>
            <span className="font-semibold text-text-primary truncate">
              {title}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 ml-4">
          {readingMinutes != null && (
            <span className="text-xs text-text-muted whitespace-nowrap">
              ~{readingMinutes} min read
            </span>
          )}
          <svg
            className={`h-5 w-5 text-text-muted flex-shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>
      <div
        id={`${stableId}-content`}
        role="region"
        aria-labelledby={stableId}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-border-subtle px-6 py-5 text-text-secondary leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  )
}
