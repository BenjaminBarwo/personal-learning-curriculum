import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildBreadcrumbs } from '@/lib/navigation'
import { BreadcrumbSetter } from '@/lib/breadcrumb-context'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { getLessonProgressForScope, isSemesterLocked } from '@/lib/progress'
import { HARDCODED_USER_ID } from '@/constants/user'
import type { ActivePillar, ActiveSemester, ActiveCourse, ActiveLesson } from '@/types/database.types'

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

  // Batch progress computation — avoid N+1
  // 1. Fetch all courses for all semesters in this pillar
  const semesterIds = semesters.map((s) => s.id)
  let allCourses: Pick<ActiveCourse, 'id' | 'semester_id'>[] = []
  if (semesterIds.length > 0) {
    const { data: coursesData } = await supabase
      .from('active_courses')
      .select('id, semester_id')
      .in('semester_id', semesterIds)
    allCourses = (coursesData ?? []) as Pick<ActiveCourse, 'id' | 'semester_id'>[]
  }

  // 2. Fetch all lessons for all those courses
  const courseIds = allCourses.map((c) => c.id)
  let allLessons: Pick<ActiveLesson, 'id' | 'course_id'>[] = []
  if (courseIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from('active_lessons')
      .select('id, course_id')
      .in('course_id', courseIds)
    allLessons = (lessonsData ?? []) as Pick<ActiveLesson, 'id' | 'course_id'>[]
  }

  // 3. Build course_id -> semester_id mapping
  const courseToSemester = new Map<string, string>()
  for (const course of allCourses) {
    courseToSemester.set(course.id, course.semester_id)
  }

  // 4. Build semester_id -> lesson IDs mapping
  const semesterLessonIds = new Map<string, string[]>()
  for (const lesson of allLessons) {
    const semId = courseToSemester.get(lesson.course_id)
    if (!semId) continue
    const existing = semesterLessonIds.get(semId) ?? []
    existing.push(lesson.id)
    semesterLessonIds.set(semId, existing)
  }

  // 5. Fetch all completed progress for this user once
  const allPillarLessonIds = allLessons.map((l) => l.id)
  let completedLessonIds = new Set<string>()
  if (allPillarLessonIds.length > 0) {
    const { data: progressData } = await supabase
      .from('progress')
      .select('lesson_id')
      .eq('user_id', HARDCODED_USER_ID)
      .eq('status', 'completed')
      .in('lesson_id', allPillarLessonIds)
    completedLessonIds = new Set((progressData ?? []).map((r) => r.lesson_id))
  }

  // 6. Compute per-semester progress
  const semesterProgressList = semesters.map((semester) => {
    const lessonIds = semesterLessonIds.get(semester.id) ?? []
    const total = lessonIds.length
    const completed = lessonIds.filter((id) => completedLessonIds.has(id)).length
    const percent = total === 0 ? 0 : Math.min(100, Math.round((completed / total) * 100))
    return { percent, completed, total }
  })

  // 7. Compute overall pillar progress
  const totalPillarLessons = allPillarLessonIds.length
  const completedPillarLessons = allPillarLessonIds.filter((id) =>
    completedLessonIds.has(id)
  ).length
  const pillarPercent =
    totalPillarLessons === 0
      ? 0
      : Math.min(100, Math.round((completedPillarLessons / totalPillarLessons) * 100))

  // Count completed semesters (100%)
  const completedSemesterCount = semesterProgressList.filter((sp) => sp.percent === 100).length

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

        {/* Progress bar — real data */}
        <div className="bg-surface-card border border-border-subtle rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-text-secondary">Overall Progress</p>
            <p className="text-sm text-text-muted">
              {completedSemesterCount} of {semesters.length} semesters
            </p>
          </div>
          <ProgressBar percent={pillarPercent} color={pillarColor} showLabel={false} size="md" />
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
              {semesters.map((semester, index) => {
                const locked = isSemesterLocked(
                  index,
                  semesterProgressList,
                  semester.manually_unlocked
                )
                const semProgress = semesterProgressList[index]

                if (locked) {
                  return (
                    <div
                      key={semester.id}
                      className="flex items-center gap-4 bg-surface-card border border-border-subtle rounded-xl p-4 opacity-50 cursor-not-allowed"
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-text-primary truncate">
                            {semester.name}
                          </p>
                          {/* Lock icon */}
                          <svg
                            className="w-4 h-4 text-text-muted shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-label="Locked"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                        </div>
                        {semester.description && (
                          <p className="text-sm text-text-muted mt-0.5 line-clamp-1">
                            {semester.description}
                          </p>
                        )}
                        <p className="text-xs text-text-muted mt-1">
                          {semProgress.percent}% complete
                        </p>
                      </div>

                      {/* Lock indicator instead of chevron */}
                      <svg
                        className="w-5 h-5 text-text-muted shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                  )
                }

                return (
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
                      <p className="text-xs text-text-muted mt-1">
                        {semProgress.percent}% complete
                      </p>
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
                )
              })}
            </div>
          )}
        </section>
      </main>
    </>
  )
}
