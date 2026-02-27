import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'
import { BreadcrumbsConnected } from './BreadcrumbsConnected'
import { MobileMenu } from './MobileMenu'

export function Header() {
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
            <div className="hidden sm:flex items-center min-w-0">
              <BreadcrumbsConnected />
            </div>
          </div>

          {/* Right: ThemeToggle always visible + MobileMenu only below sm */}
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <MobileMenu />
          </div>
        </div>

        {/* Mobile breadcrumbs row — only on xs screens */}
        <div className="sm:hidden pb-2">
          <BreadcrumbsConnected />
        </div>
      </div>
    </header>
  )
}
