'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from 'react'

interface DefinitionContextValue {
  openTerm: string | null
  setOpenTerm: (term: string | null) => void
}

const DefinitionContext = createContext<DefinitionContextValue | null>(null)

interface DefinitionProviderProps {
  children: React.ReactNode
}

export function DefinitionProvider({ children }: DefinitionProviderProps) {
  const [openTerm, setOpenTerm] = useState<string | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const definitionEls = document.querySelectorAll('[data-definition-root]')
      let clickedInsideADefinition = false
      definitionEls.forEach((el) => {
        if (el.contains(target)) {
          clickedInsideADefinition = true
        }
      })
      if (!clickedInsideADefinition) {
        setOpenTerm(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <DefinitionContext.Provider value={{ openTerm, setOpenTerm }}>
      {children}
    </DefinitionContext.Provider>
  )
}

interface DefinitionProps {
  term: string
  children: React.ReactNode
}

export function Definition({ term, children }: DefinitionProps) {
  const ctx = useContext(DefinitionContext)
  const isOpen = ctx ? ctx.openTerm === term : false
  const rootRef = useRef<HTMLSpanElement>(null)

  function handleClick(event: React.MouseEvent) {
    event.stopPropagation()
    if (!ctx) return
    ctx.setOpenTerm(isOpen ? null : term)
  }

  return (
    <span
      ref={rootRef}
      data-definition-root=""
      className="inline"
    >
      <button
        type="button"
        onClick={handleClick}
        aria-expanded={isOpen}
        className={`
          inline border-b-2 border-dashed cursor-pointer bg-transparent
          transition-colors duration-150 font-medium
          border-text-muted text-text-primary
          hover:border-text-secondary hover:text-text-primary
          focus:outline-none focus-visible:ring-2 focus-visible:ring-text-secondary focus-visible:ring-offset-1
          ${isOpen ? 'border-text-secondary' : ''}
        `}
      >
        {term}
      </button>
      {isOpen && (
        <span className="block mt-2 ml-0 rounded-lg border border-border-default bg-surface-card px-4 py-3 text-sm text-text-secondary leading-relaxed shadow-lg">
          <span className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
            Definition
          </span>
          {children}
        </span>
      )}
    </span>
  )
}
