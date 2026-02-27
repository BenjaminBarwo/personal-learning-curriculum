'use client'

import { useBreadcrumbs } from '@/lib/breadcrumb-context'
import { Breadcrumbs } from './Breadcrumbs'

// BreadcrumbsConnected — reads breadcrumb state from context and renders.
// Client component so it can read from BreadcrumbContext.
export function BreadcrumbsConnected() {
  const { items, accentColor } = useBreadcrumbs()

  if (items.length === 0) return null

  return <Breadcrumbs items={items} accentColor={accentColor} />
}
