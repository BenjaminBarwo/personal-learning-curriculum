import { ThemeToggle } from './ThemeToggle'

// Stub — replaced in Task 2 with full implementation
export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-surface-primary border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <span className="font-bold text-lg text-text-primary">Learning</span>
        <ThemeToggle />
      </div>
    </header>
  )
}
