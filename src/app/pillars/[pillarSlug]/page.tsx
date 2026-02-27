import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildBreadcrumbs } from '@/lib/navigation'
import { BreadcrumbSetter } from '@/lib/breadcrumb-context'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { ActivePillar, ActiveSemester } from '@/types/database.types'

interface PillarPageProps {
  params: Promise<{ pillarSlug: string }>
}

export default async function PillarPage({ params }: PillarPageProps) {
  const { pillarSlug } = await params
  const supabase = await createServerSupabaseClient()

  // Fetch pillar by slug
  const { data: pillarData, error: pillarError } = await supabase
    .from('active_pillars')
    .select('*')
    .eq('slug', pillarSlug)
    .single()

  if (pillarError || !pillarData) {
    notFound()
  }

  const pillar = pillarData as ActivePillar
  const pillarColor = pillar.color ?? '#64748B'

  // Fetch semesters for this pillar
  const { data: semestersData } = await supabase
    .from('active_semesters')
    .select('*')
    .eq('pillar_id', pillar.id)
    .order('display_order')

  const semesters = (semestersData ?? []) as ActiveSemester[]

  const crumbs = buildBreadcrumbs({
    pillarName: pillar.name,
    pillarSlug,
  })

  return (
    <>
      <BreadcrumbSetter items={crumbs} accentColor={pillarColor} />

      <main
        className="space-y-8 max-w-4xl"
        style={{ '--pillar-color': pillarColor } as React.CSSProperties}
      >
        {/* Page header with pillar color accent */}
        <div
          className="pl-4 border-l-4"
          style={{ borderLeftColor: pillarColor }}
        >
          <h1 className="text-3xl font-bold text-text-primary">{pillar.name}</h1>
          {pillar.description && (
            <p className="mt-2 text-text-secondary">{pillar.description}</p>
          )}
        </div>

        {/* Progress bar (0% mock — Phase 5 fills real data) */}
        <div className="bg-surface-card border border-border-subtle rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-text-secondary">Overall Progress</p>
            <p className="text-sm text-text-muted">0 of {semesters.length} semesters</p>
          </div>
          <ProgressBar percent={0} color={pillarColor} showLabel={false} size="md" />
        </div>

        {/* Semesters list */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-4">Semesters</h2>

          {semesters.length === 0 ? (
            <div className="rounded-xl bg-surface-card border border-border-subtle p-10 text-center">
              <p className="text-text-muted">No semesters available yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {semesters.map((semester) => (
                <Link
                  key={semester.id}
                  href={`/pillars/${pillarSlug}/semesters/${semester.slug}`}
                  className="flex items-center gap-4 bg-surface-card border border-border-subtle rounded-xl p-4 hover:border-border-default hover:bg-surface-hover transition-all group"
                >
                  {/* Semester number indicator */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white text-sm font-semibold"
                    style={{ backgroundColor: pillarColor }}
                  >
                    {semester.display_order}
                  </div>

                  {/* Semester info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary group-hover:text-text-secondary transition-colors truncate">
                      {semester.name}
                    </p>
                    {semester.description && (
                      <p className="text-sm text-text-muted mt-0.5 line-clamp-1">
                        {semester.description}
                      </p>
                    )}
                  </div>

                  {/* Chevron */}
                  <svg
                    className="w-5 h-5 text-text-muted group-hover:text-text-secondary shrink-0 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  )
}
