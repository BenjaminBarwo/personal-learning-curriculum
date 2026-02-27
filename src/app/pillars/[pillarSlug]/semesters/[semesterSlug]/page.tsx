import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildBreadcrumbs } from '@/lib/navigation'
import { BreadcrumbSetter } from '@/lib/breadcrumb-context'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { ActivePillar, ActiveSemester, ActiveCourse } from '@/types/database.types'

interface SemesterPageProps {
  params: Promise<{ pillarSlug: string; semesterSlug: string }>
}

export default async function SemesterPage({ params }: SemesterPageProps) {
  const { pillarSlug, semesterSlug } = await params
  const supabase = await createServerSupabaseClient()

  // Fetch pillar by slug (needed for color + breadcrumb name)
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

  // Fetch semester by slug + pillar_id
  const { data: semesterData, error: semesterError } = await supabase
    .from('active_semesters')
    .select('*')
    .eq('slug', semesterSlug)
    .eq('pillar_id', pillar.id)
    .single()

  if (semesterError || !semesterData) {
    notFound()
  }

  const semester = semesterData as ActiveSemester

  // Fetch courses for this semester
  const { data: coursesData } = await supabase
    .from('active_courses')
    .select('*')
    .eq('semester_id', semester.id)
    .order('display_order')

  const courses = (coursesData ?? []) as ActiveCourse[]

  const crumbs = buildBreadcrumbs({
    pillarName: pillar.name,
    pillarSlug,
    semesterName: semester.name,
    semesterSlug,
  })

  return (
    <>
      <BreadcrumbSetter items={crumbs} accentColor={pillarColor} />

      <main
        className="space-y-8 max-w-4xl"
        style={{ '--pillar-color': pillarColor } as React.CSSProperties}
      >
        {/* Page header */}
        <div>
          <p className="text-sm text-text-muted mb-1">
            <span style={{ color: pillarColor }}>{pillar.name}</span>
          </p>
          <div
            className="pl-4 border-l-4"
            style={{ borderLeftColor: pillarColor }}
          >
            <h1 className="text-3xl font-bold text-text-primary">{semester.name}</h1>
            {semester.description && (
              <p className="mt-2 text-text-secondary">{semester.description}</p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-surface-card border border-border-subtle rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-text-secondary">Semester Progress</p>
            <p className="text-sm text-text-muted">0 of {courses.length} courses</p>
          </div>
          <ProgressBar percent={0} color={pillarColor} showLabel={false} size="md" />
        </div>

        {/* Courses list */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-4">Courses</h2>

          {courses.length === 0 ? (
            <div className="rounded-xl bg-surface-card border border-border-subtle p-10 text-center">
              <p className="text-text-muted">No courses available yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/pillars/${pillarSlug}/semesters/${semesterSlug}/courses/${course.slug}`}
                  className="flex items-center gap-4 bg-surface-card border border-border-subtle rounded-xl p-4 hover:border-border-default hover:bg-surface-hover transition-all group"
                >
                  {/* Course number */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white text-sm font-semibold"
                    style={{ backgroundColor: pillarColor }}
                  >
                    {course.display_order}
                  </div>

                  {/* Course info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary group-hover:text-text-secondary transition-colors truncate">
                      {course.name}
                    </p>
                    {course.description && (
                      <p className="text-sm text-text-muted mt-0.5 line-clamp-2">
                        {course.description}
                      </p>
                    )}
                    {/* Progress bar per course */}
                    <div className="mt-2">
                      <ProgressBar percent={0} color={pillarColor} showLabel={false} size="sm" />
                    </div>
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
