import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PillarCard } from '@/components/ui/PillarCard'
import { BreadcrumbSetter } from '@/lib/breadcrumb-context'
import type { ActivePillar } from '@/types/database.types'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const { data: pillarsData, error } = await supabase
    .from('active_pillars')
    .select('*')
    .order('display_order')

  if (error) {
    throw error
  }

  const activePillars = (pillarsData ?? []) as ActivePillar[]
  const firstPillar = activePillars[0]

  const dashboardCrumbs = [{ label: 'Dashboard', href: '/' }]

  return (
    <>
      <BreadcrumbSetter items={dashboardCrumbs} />

      <div className="space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Your Learning Journey</h1>
          <p className="mt-2 text-text-secondary">
            Seven pillars of knowledge, from AI engineering to philosophy of mind.
          </p>
        </div>

        {/* Start learning CTA */}
        {firstPillar && (
          <div
            className="rounded-xl p-6 border border-border-subtle bg-surface-card"
            style={{ borderLeftColor: firstPillar.color ?? '#3B82F6', borderLeftWidth: '4px' }}
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
                  Recommended start
                </p>
                <h2 className="text-xl font-semibold text-text-primary">
                  {firstPillar.name}
                </h2>
                {firstPillar.description && (
                  <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                    {firstPillar.description}
                  </p>
                )}
              </div>
              <Link
                href={`/pillars/${firstPillar.slug}`}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 shrink-0"
                style={{ backgroundColor: firstPillar.color ?? '#3B82F6' }}
              >
                Start learning
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Pillar grid */}
        {activePillars.length === 0 ? (
          <div className="rounded-xl bg-surface-card border border-border-subtle p-12 text-center">
            <p className="text-text-muted text-lg">No pillars yet.</p>
            <p className="text-text-muted text-sm mt-1">Content is being prepared.</p>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">All Pillars</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activePillars.map((pillar) => (
                <PillarCard
                  key={pillar.id}
                  name={pillar.name}
                  slug={pillar.slug}
                  description={pillar.description}
                  color={pillar.color ?? '#64748B'}
                  progress={0}
                  lessonCount={0}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
