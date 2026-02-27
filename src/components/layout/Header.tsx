import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'
import { Breadcrumbs } from './Breadcrumbs'
import { MobileMenu } from './MobileMenu'
import type { BreadcrumbItem } from '@/lib/navigation'

interface HeaderProps {
  breadcrumbItems?: BreadcrumbItem[]
  accentColor?: string
}

export function Header({ breadcrumbItems, accentColor }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-surface-primary border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main header row */}
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Left: Logo + breadcrumbs (sm+) */}
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/"
              className="font-bold text-lg text-text-primary shrink-0 hover:text-text-secondary transition-colors"
            >
              Learning
            </Link>

            {/* Breadcrumbs hidden on xs, visible sm+ */}
            {breadcrumbItems && breadcrumbItems.length > 0 && (
              <div className="hidden sm:flex items-center min-w-0">
                <Breadcrumbs items={breadcrumbItems} accentColor={accentColor} />
              </div>
            )}
          </div>

          {/* Right: ThemeToggle always visible + MobileMenu only below sm */}
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <MobileMenu />
          </div>
        </div>

        {/* Mobile breadcrumbs row — only on xs screens when breadcrumbs exist */}
        {breadcrumbItems && breadcrumbItems.length > 0 && (
          <div className="sm:hidden pb-2">
            <Breadcrumbs items={breadcrumbItems} accentColor={accentColor} />
          </div>
        )}
      </div>
    </header>
  )
}
