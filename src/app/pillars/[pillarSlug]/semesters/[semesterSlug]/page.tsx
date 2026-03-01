import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { buildBreadcrumbs } from '@/lib/navigation'
import { BreadcrumbSetter } from '@/lib/breadcrumb-context'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { getLessonProgressForScope, isSemesterLocked } from '@/lib/progress'
import { HARDCODED_USER_ID } from '@/constants/user'
import type { ActivePillar, ActiveSemester, ActiveCourse, ActiveLesson } from '@/types/database.types'

interface SemesterPageProps {
  params: Promise<{ pillarSlug: string; semesterSlug: string }>
}

export default async function SemesterPage({ params }: SemesterPageProps) {
  const { pillarSlug, semesterSlug } = await params
  const supabase = await createServerSupabaseClient()
  const adminSupabase = createAdminSupabaseClient()

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

  // Fetch ALL semesters for this pillar (needed for lock check)
  const { data: allSemestersData } = await supabase
    .from('active_semesters')
    .select('*')
    .eq('pillar_id', pillar.id)
    .order('display_order')

  const allSemesters = (allSemestersData ?? []) as ActiveSemester[]

  // Find the current semester
  const semester = allSemesters.find((s) => s.slug === semesterSlug)
  if (!semester) {
    notFound()
  }

  const currentIndex = allSemesters.indexOf(semester)

  // Semester lock check — batch compute all sibling semesters' progress
  const allSemesterIds = allSemesters.map((s) => s.id)

  // Fetch all courses for ALL semesters (needed for lock check across siblings)
  const { data: siblingCoursesData } = await supabase
    .from('active_courses')
    .select('id, semester_id')
    .in('semester_id', allSemesterIds)

  const siblingCourses = (siblingCoursesData ?? []) as Pick<ActiveCourse, 'id' | 'semester_id'>[]
  const siblingCourseIds = siblingCourses.map((c) => c.id)

  // Fetch all lessons for those courses
  let siblingLessons: Pick<ActiveLesson, 'id' | 'course_id'>[] = []
  if (siblingCourseIds.length > 0) {
    const { data: siblingLessonsData } = await supabase
      .from('active_lessons')
      .select('id, course_id')
      .in('course_id', siblingCourseIds)
    siblingLessons = (siblingLessonsData ?? []) as Pick<ActiveLesson, 'id' | 'course_id'>[]
  }

  // Build course_id -> semester_id mapping
  const courseToSemester = new Map<string, string>()
  for (const course of siblingCourses) {
    courseToSemester.set(course.id, course.semester_id)
  }

  // Build semester_id -> lesson IDs mapping
  const semesterLessonIds = new Map<string, string[]>()
  for (const lesson of siblingLessons) {
    const semId = courseToSemester.get(lesson.course_id)
    if (!semId) continue
    const existing = semesterLessonIds.get(semId) ?? []
    existing.push(lesson.id)
    semesterLessonIds.set(semId, existing)
  }

  // Fetch progress for all sibling lessons at once
  const allSiblingLessonIds = siblingLessons.map((l) => l.id)
  let completedSiblingLessonIds = new Set<string>()
  if (allSiblingLessonIds.length > 0) {
    const { data: siblingProgressData } = await adminSupabase
      .from('progress')
      .select('lesson_id')
      .eq('user_id', HARDCODED_USER_ID)
      .eq('status', 'completed')
      .in('lesson_id', allSiblingLessonIds)
    completedSiblingLessonIds = new Set((siblingProgressData ?? []).map((r) => r.lesson_id))
  }

  // Build progress list for all semesters (for isSemesterLocked)
  const semesterProgressList = allSemesters.map((sem) => {
    const lessonIds = semesterLessonIds.get(sem.id) ?? []
    const total = lessonIds.length
    const completed = lessonIds.filter((id) => completedSiblingLessonIds.has(id)).length
    const percent = total === 0 ? 0 : Math.min(100, Math.round((completed / total) * 100))
    return { percent }
  })

  const locked = isSemesterLocked(currentIndex, semesterProgressList, semester.manually_unlocked)

  // Fetch courses for this semester (needed even for locked state UI)
  const { data: coursesData } = await supabase
    .from('active_courses')
    .select('*')
    .eq('semester_id', semester.id)
    .order('display_order')

  const courses = (coursesData ?? []) as ActiveCourse[]

  // Course progress — batch fetch lessons and progress for all courses in this semester
  const courseIds = courses.map((c) => c.id)
  let currentSemLessons: Pick<ActiveLesson, 'id' | 'course_id'>[] = []
  if (courseIds.length > 0) {
    const { data: semLessonsData } = await supabase
      .from('active_lessons')
      .select('id, course_id')
      .in('course_id', courseIds)
    currentSemLessons = (semLessonsData ?? []) as Pick<ActiveLesson, 'id' | 'course_id'>[]
  }

  // Fetch progress for lessons in this semester
  const currentSemLessonIds = currentSemLessons.map((l) => l.id)
  let completedCourseIds = new Set<string>()
  if (currentSemLessonIds.length > 0) {
    const { data: semProgressData } = await adminSupabase
      .from('progress')
      .select('lesson_id')
      .eq('user_id', HARDCODED_USER_ID)
      .eq('status', 'completed')
      .in('lesson_id', currentSemLessonIds)
    completedCourseIds = new Set((semProgressData ?? []).map((r) => r.lesson_id))
  }

  // Build course_id -> lesson IDs mapping for this semester
  const courseLessonIds = new Map<string, string[]>()
  for (const lesson of currentSemLessons) {
    const existing = courseLessonIds.get(lesson.course_id) ?? []
    existing.push(lesson.id)
    courseLessonIds.set(lesson.course_id, existing)
  }

  // Compute per-course progress
  const courseProgressMap = new Map<string, { completed: number; total: number; percent: number }>()
  for (const course of courses) {
    const lessonIds = courseLessonIds.get(course.id) ?? []
    const total = lessonIds.length
    const completed = lessonIds.filter((id) => completedCourseIds.has(id)).length
    const percent = total === 0 ? 0 : Math.min(100, Math.round((completed / total) * 100))
    courseProgressMap.set(course.id, { completed, total, percent })
  }

  // Semester-level aggregated progress
  const semesterProgress = await getLessonProgressForScope(
    adminSupabase,
    currentSemLessonIds,
    HARDCODED_USER_ID
  )

  const completedCourseCount = courses.filter(
    (c) => (courseProgressMap.get(c.id)?.percent ?? 0) === 100
  ).length

  const crumbs = buildBreadcrumbs({
    pillarName: pillar.name,
    pillarSlug,
    semesterName: semester.name,
    semesterSlug,
  })

  // Previous semester name (for locked state message)
  const previousSemester = currentIndex > 0 ? allSemesters[currentIndex - 1] : null

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

        {locked ? (
          /* Locked state UI */
          <div className="rounded-xl bg-surface-card border border-border-subtle p-12 text-center">
            <svg
              className="w-12 h-12 text-text-muted mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <p className="text-text-muted font-medium mt-4">
              {previousSemester
                ? `Complete ${previousSemester.name} first to unlock this semester`
                : 'This semester is locked'}
            </p>
            <Link
              href={`/pillars/${pillarSlug}`}
              className="inline-flex items-center gap-2 mt-6 text-sm font-medium transition-colors"
              style={{ color: pillarColor }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to {pillar.name}
            </Link>
          </div>
        ) : (
          <>
            {/* Progress bar — real data */}
            <div className="bg-surface-card border border-border-subtle rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-text-secondary">Semester Progress</p>
                <p className="text-sm text-text-muted">
                  {completedCourseCount} of {courses.length} courses
                </p>
              </div>
              <ProgressBar
                percent={semesterProgress.percent}
                color={pillarColor}
                showLabel={false}
                size="md"
              />
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
                  {courses.map((course) => {
                    const cp = courseProgressMap.get(course.id) ?? {
                      completed: 0,
                      total: 0,
                      percent: 0,
                    }
                    return (
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
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-text-primary group-hover:text-text-secondary transition-colors truncate">
                              {course.name}
                            </p>
                            <span className="text-xs text-text-muted shrink-0">
                              {cp.completed}/{cp.total} lessons
                            </span>
                          </div>
                          {course.description && (
                            <p className="text-sm text-text-muted mt-0.5 line-clamp-2">
                              {course.description}
                            </p>
                          )}
                          {/* Progress bar per course */}
                          <div className="mt-2">
                            <ProgressBar
                              percent={cp.percent}
                              color={pillarColor}
                              showLabel={false}
                              size="sm"
                            />
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
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  )
}
