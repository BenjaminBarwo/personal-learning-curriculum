'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useTheme } from 'next-themes'

interface DiagramProps {
  chart: string
  caption?: string
}

let diagramCounter = 0

export function Diagram({ chart, caption }: DiagramProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const idRef = useRef<string>(`mermaid-${++diagramCounter}-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    let cancelled = false
    setIsLoading(true)
    setError(null)

    async function render() {
      const mermaidModule = await import('mermaid')
      const mermaid = mermaidModule.default

      mermaid.initialize({
        startOnLoad: false,
        theme: resolvedTheme === 'dark' ? 'dark' : 'default',
      })

      const id = idRef.current
      // Normalise literal \n sequences (from AI-generated content) into real newlines
        const normalizedChart = chart.replace(/\\n/g, '\n')

      try {
        const result = await mermaid.render(id, normalizedChart)
        if (!cancelled) {
          setSvg(result.svg)
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to render diagram'
          setError(message)
          setIsLoading(false)
        }
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [chart, resolvedTheme, mounted])

  if (!mounted || isLoading) {
    return (
      <figure className="my-6 overflow-x-auto">
        <div className="flex items-center justify-center rounded-lg border border-border-subtle bg-surface-secondary px-6 py-10 text-sm text-text-muted">
          Loading diagram...
        </div>
        {caption && (
          <figcaption className="mt-2 text-center text-xs text-text-muted">
            {caption}
          </figcaption>
        )}
      </figure>
    )
  }

  if (error) {
    return (
      <figure className="my-6 overflow-x-auto">
        <div className="rounded-lg border border-border-subtle bg-surface-secondary px-6 py-8 text-sm text-text-muted">
          <p className="font-medium text-text-secondary mb-1">
            Unable to render diagram
          </p>
          <p className="text-xs font-mono opacity-70">{error}</p>
        </div>
        {caption && (
          <figcaption className="mt-2 text-center text-xs text-text-muted">
            {caption}
          </figcaption>
        )}
      </figure>
    )
  }

  return (
    <figure className="my-6 overflow-x-auto">
      <div
        className="flex justify-center"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Mermaid generates safe SVG
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {caption && (
        <figcaption className="mt-2 text-center text-xs text-text-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
