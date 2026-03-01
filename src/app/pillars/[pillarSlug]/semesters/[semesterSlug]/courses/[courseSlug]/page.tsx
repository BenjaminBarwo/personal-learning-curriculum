import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { buildBreadcrumbs } from '@/lib/navigation'
import { BreadcrumbSetter } from '@/lib/breadcrumb-context'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { getLessonProgressForScope, getLessonStatuses } from '@/lib/progress'
import { HARDCODED_USER_ID } from '@/constants/user'
import type { ActivePillar, ActiveSemester, ActiveCourse, ActiveLesson, LessonStatus } from '@/types/database.types'

interface CoursePageProps {
  params: Promise<{ pillarSlug: string; semesterSlug: string; courseSlug: string }>
}

function LessonStatusIcon({ status, color }: { status: LessonStatus; color: string }) {
  if (status === 'completed') {
    return (
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: color }}
        title="Completed"
        aria-label="Completed"
      >
        <svg
          className="w-3.5 h-3.5 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )
  }

  if (status === 'in_progress') {
    return (
      <div
        className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center shrink-0"
        title="In progress"
        aria-label="In progress"
      >
        <div className="w-2 h-2 rounded-full bg-blue-500" />
      </div>
    )
  }

  // not_started (default)
  return (
    <div
      className="w-6 h-6 rounded-full border-2 border-border-subtle shrink-0 flex items-center justify-center"
      title="Not started"
      aria-label="Not started"
    />
  )
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { pillarSlug, semesterSlug, courseSlug } = await params
  const supabase = await createServerSupabaseClient()
  const adminSupabase = createAdminSupabaseClient()

  // Fetch pillar
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

  // Fetch semester
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

  // Fetch course
  const { data: courseData, error: courseError } = await supabase
    .from('active_courses')
    .select('*')
    .eq('slug', courseSlug)
    .eq('semester_id', semester.id)
    .single()

  if (courseError || !courseData) {
    notFound()
  }

  const course = courseData as ActiveCourse

  // Fetch lessons for this course
  const { data: lessonsData } = await supabase
    .from('active_lessons')
    .select('*')
    .eq('course_id', course.id)
    .order('display_order')

  const lessons = (lessonsData ?? []) as ActiveLesson[]

  // Batch progress queries — get all lesson IDs first
  const lessonIds = lessons.map((l) => l.id)

  // Get lesson statuses and overall course progress in parallel
  const [statuses, courseProgress] = await Promise.all([
    getLessonStatuses(adminSupabase, lessonIds, HARDCODED_USER_ID),
    getLessonProgressForScope(adminSupabase, lessonIds, HARDCODED_USER_ID),
  ])

  const crumbs = buildBreadcrumbs({
    pillarName: pillar.name,
    pillarSlug,
    semesterName: semester.name,
    semesterSlug,
    courseName: course.name,
    courseSlug,
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
            <span className="mx-1">·</span>
            {semester.name}
          </p>
          <div
            className="pl-4 border-l-4"
            style={{ borderLeftColor: pillarColor }}
          >
            <h1 className="text-3xl font-bold text-text-primary">{course.name}</h1>
            {course.description && (
              <p className="mt-2 text-text-secondary">{course.description}</p>
            )}
          </div>
        </div>

        {/* Progress bar — real data */}
        <div className="bg-surface-card border border-border-subtle rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-text-secondary">Course Progress</p>
            <p className="text-sm text-text-muted">
              {courseProgress.completed} of {courseProgress.total} lessons
            </p>
          </div>
          <ProgressBar percent={courseProgress.percent} color={pillarColor} showLabel={false} size="md" />
        </div>

        {/* Lessons list */}
        <section>
          <h2 className="text-xl font-semibold text-text-primary mb-4">Lessons</h2>

          {lessons.length === 0 ? (
            <div className="rounded-xl bg-surface-card border border-border-subtle p-10 text-center">
              <p className="text-text-muted">No lessons available yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson) => {
                const estimatedMinutes = lesson.estimated_minutes ?? 5
                const status = statuses.get(lesson.id) ?? 'not_started'
                return (
                  <Link
                    key={lesson.id}
                    href={`/pillars/${pillarSlug}/semesters/${semesterSlug}/courses/${courseSlug}/lessons/${lesson.slug}`}
                    className="flex items-center gap-4 bg-surface-card border border-border-subtle rounded-xl p-4 hover:border-border-default hover:bg-surface-hover transition-all group"
                  >
                    {/* Status icon — dynamic based on real progress */}
                    <LessonStatusIcon status={status} color={pillarColor} />

                    {/* Lesson info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary group-hover:text-text-secondary transition-colors">
                        {lesson.name}
                      </p>
                    </div>

                    {/* Estimated time */}
                    <div className="flex items-center gap-1.5 shrink-0 text-text-muted">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs">{estimatedMinutes} min</span>
                    </div>

                    {/* Chevron */}
                    <svg
                      className="w-4 h-4 text-text-muted group-hover:text-text-secondary shrink-0 transition-colors"
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
