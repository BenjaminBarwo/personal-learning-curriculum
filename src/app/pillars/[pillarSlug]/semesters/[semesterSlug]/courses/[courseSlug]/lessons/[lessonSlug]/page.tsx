import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildBreadcrumbs } from '@/lib/navigation'
import { BreadcrumbSetter } from '@/lib/breadcrumb-context'
import type { ActivePillar, ActiveSemester, ActiveCourse, ActiveLesson } from '@/types/database.types'

interface LessonPageProps {
  params: Promise<{
    pillarSlug: string
    semesterSlug: string
    courseSlug: string
    lessonSlug: string
  }>
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { pillarSlug, semesterSlug, courseSlug, lessonSlug } = await params
  const supabase = await createServerSupabaseClient()

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

  // Fetch lesson
  const { data: lessonData, error: lessonError } = await supabase
    .from('active_lessons')
    .select('*')
    .eq('slug', lessonSlug)
    .eq('course_id', course.id)
    .single()

  if (lessonError || !lessonData) {
    notFound()
  }

  const lesson = lessonData as ActiveLesson

  const crumbs = buildBreadcrumbs({
    pillarName: pillar.name,
    pillarSlug,
    semesterName: semester.name,
    semesterSlug,
    courseName: course.name,
    courseSlug,
    lessonName: lesson.name,
    lessonSlug,
  })

  const estimatedMinutes = lesson.estimated_minutes ?? 5

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
            <span className="mx-1">·</span>
            {course.name}
          </p>
          <div
            className="pl-4 border-l-4"
            style={{ borderLeftColor: pillarColor }}
          >
            <h1 className="text-3xl font-bold text-text-primary">{lesson.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              {lesson.description && (
                <p className="text-text-secondary">{lesson.description}</p>
              )}
              <span className="flex items-center gap-1 text-xs text-text-muted shrink-0">
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
                {estimatedMinutes} min read
              </span>
            </div>
          </div>
        </div>

        {/* Learning objectives */}
        {lesson.learning_objectives && lesson.learning_objectives.length > 0 && (
          <section className="bg-surface-card border border-border-subtle rounded-xl p-5">
            <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
              <span
                className="inline-block w-1.5 h-5 rounded-full"
                style={{ backgroundColor: pillarColor }}
                aria-hidden="true"
              />
              Learning Objectives
            </h2>
            <ul className="space-y-2">
              {lesson.learning_objectives.map((objective, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-text-secondary">
                  <span
                    className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: pillarColor }}
                    aria-hidden="true"
                  />
                  {objective}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Content stub — Phase 3 will replace this with MDX rendering */}
        <section>
          <div className="rounded-xl border-2 border-dashed border-border-subtle p-12 text-center bg-surface-card">
            <div
              className="inline-flex w-12 h-12 rounded-xl items-center justify-center mb-4"
              style={{ backgroundColor: `${pillarColor}20` }}
              aria-hidden="true"
            >
              <svg
                className="w-6 h-6"
                style={{ color: pillarColor }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-text-muted font-medium">Lesson content will be rendered here</p>
            <p className="text-sm text-text-muted mt-1 opacity-75">Phase 3 — MDX rendering</p>
          </div>
        </section>
      </main>
    </>
  )
}
