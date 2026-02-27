import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-6xl font-bold text-text-muted mb-4" aria-hidden="true">404</p>
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Page not found</h1>
      <p className="text-text-secondary mb-8 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist, or may have been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-surface-card border border-border-subtle px-5 py-2.5 text-sm font-semibold text-text-primary hover:border-border-default hover:bg-surface-hover transition-all"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 12l6-6m-6 6l6 6" />
        </svg>
        Back to Dashboard
      </Link>
    </div>
  )
}
