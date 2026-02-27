'use client'
import Link from 'next/link'
import type { BreadcrumbItem } from '@/lib/navigation'

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  accentColor?: string
}

export function Breadcrumbs({ items, accentColor }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null
  }

  // On mobile: show only the last 2 crumbs with ellipsis for earlier ones
  const shouldTruncate = items.length > 2
  const visibleItems = shouldTruncate ? items.slice(-2) : items
  const hasHiddenItems = shouldTruncate

  return (
    <nav aria-label="Breadcrumb" className="flex items-center">
      <ol className="flex items-center gap-1 text-sm">
        {hasHiddenItems && (
          <>
            <li className="hidden sm:flex items-center gap-1">
              {items.slice(0, -2).map((item, index) => (
                <span key={item.href} className="flex items-center gap-1">
                  <Link
                    href={item.href}
                    className="text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                  <span aria-hidden="true" className="text-text-muted select-none">
                    {'\u203A'}
                  </span>
                </span>
              ))}
            </li>
            <li className="flex sm:hidden items-center gap-1">
              <span className="text-text-muted">&#8230;</span>
              <span aria-hidden="true" className="text-text-muted select-none ml-1">
                {'\u203A'}
              </span>
            </li>
          </>
        )}

        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1
          const overallIndex = hasHiddenItems ? items.length - 2 + index : index

          return (
            <li key={item.href} className="flex items-center gap-1">
              {overallIndex > 0 && !hasHiddenItems && (
                <span aria-hidden="true" className="text-text-muted select-none">
                  {'\u203A'}
                </span>
              )}
              {isLast ? (
                <span
                  className="font-medium text-text-primary"
                  style={accentColor ? { color: accentColor } : undefined}
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <>
                  <Link
                    href={item.href}
                    className="text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                  <span aria-hidden="true" className="text-text-muted select-none">
                    {'\u203A'}
                  </span>
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
