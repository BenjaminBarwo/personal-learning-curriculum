import Link from 'next/link'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getContinueLesson, getLessonProgressForScope } from '@/lib/progress'
import { HARDCODED_USER_ID } from '@/constants/user'
import { PillarCard } from '@/components/ui/PillarCard'
import { BreadcrumbSetter } from '@/lib/breadcrumb-context'
import type { ActivePillar, ActiveSemester, ActiveCourse, ActiveLesson } from '@/types/database.types'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const adminSupabase = createAdminSupabaseClient()

  const { data: pillarsData, error } = await supabase
    .from('active_pillars')
    .select('*')
    .order('display_order')

  if (error) {
    throw error
  }

  const activePillars = (pillarsData ?? []) as ActivePillar[]
  const firstPillar = activePillars[0]

  // Continue card — most recently accessed in-progress lesson
  const continueData = await getContinueLesson(adminSupabase, HARDCODED_USER_ID)

  // Pillar progress — batched queries to avoid N+1
  // Fetch all semesters, courses, and lessons in one pass each
  const { data: allSemestersData } = await supabase
    .from('active_semesters')
    .select('id, pillar_id')

  const { data: allCoursesData } = await supabase
    .from('active_courses')
    .select('id, semester_id')

  const { data: allLessonsData } = await supabase
    .from('active_lessons')
    .select('id, course_id')

  const allSemesters = (allSemestersData ?? []) as Pick<ActiveSemester, 'id' | 'pillar_id'>[]
  const allCourses = (allCoursesData ?? []) as Pick<ActiveCourse, 'id' | 'semester_id'>[]
  const allLessons = (allLessonsData ?? []) as Pick<ActiveLesson, 'id' | 'course_id'>[]

  // Build mapping: course_id -> semester_id
  const courseToSemester = new Map<string, string>()
  for (const course of allCourses) {
    courseToSemester.set(course.id, course.semester_id)
  }

  // Build mapping: semester_id -> pillar_id
  const semesterToPillar = new Map<string, string>()
  for (const semester of allSemesters) {
    semesterToPillar.set(semester.id, semester.pillar_id)
  }

  // Build mapping: pillar_id -> list of lesson IDs
  const pillarLessonIds = new Map<string, string[]>()
  for (const lesson of allLessons) {
    const semesterId = courseToSemester.get(lesson.course_id)
    if (!semesterId) continue
    const pillarId = semesterToPillar.get(semesterId)
    if (!pillarId) continue
    const existing = pillarLessonIds.get(pillarId) ?? []
    existing.push(lesson.id)
    pillarLessonIds.set(pillarId, existing)
  }

  // Fetch all completed lessons for this user in one query
  const { data: completedProgressData } = await adminSupabase
    .from('progress')
    .select('lesson_id')
    .eq('user_id', HARDCODED_USER_ID)
    .eq('status', 'completed')

  const completedLessonIds = new Set((completedProgressData ?? []).map((r) => r.lesson_id))

  // Compute per-pillar progress
  const pillarProgressMap = new Map<string, { progress: number; lessonCount: number }>()
  for (const pillar of activePillars) {
    const lessonIds = pillarLessonIds.get(pillar.id) ?? []
    const total = lessonIds.length
    const completed = lessonIds.filter((id) => completedLessonIds.has(id)).length
    const progress = total === 0 ? 0 : Math.min(100, Math.round((completed / total) * 100))
    pillarProgressMap.set(pillar.id, { progress, lessonCount: total })
  }

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

        {/* Continue card or recommended start CTA */}
        {continueData ? (
          <div
            className="rounded-xl p-6 border border-border-subtle bg-surface-card"
            style={{ borderLeftColor: continueData.pillarColor, borderLeftWidth: '4px' }}
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
                  Continue where you left off
                </p>
                <h2 className="text-xl font-semibold text-text-primary">
                  {continueData.lessonName}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">{continueData.courseName}</p>
              </div>
              <Link
                href={continueData.href}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 shrink-0"
                style={{ backgroundColor: continueData.pillarColor }}
              >
                Continue
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
        ) : firstPillar ? (
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
        ) : null}

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
              {activePillars.map((pillar) => {
                const { progress, lessonCount } = pillarProgressMap.get(pillar.id) ?? {
                  progress: 0,
                  lessonCount: 0,
                }
                return (
                  <PillarCard
                    key={pillar.id}
                    name={pillar.name}
                    slug={pillar.slug}
                    description={pillar.description}
                    color={pillar.color ?? '#64748B'}
                    progress={progress}
                    lessonCount={lessonCount}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
