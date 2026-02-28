import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote-client/rsc'
import rehypePrettyCode from 'rehype-pretty-code'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildBreadcrumbs } from '@/lib/navigation'
import { BreadcrumbSetter } from '@/lib/breadcrumb-context'
import { mdxComponents } from '@/lib/mdx-components'
import { LessonBody } from '@/components/lesson/LessonBody'
import { LessonNavigation } from '@/components/lesson/LessonNavigation'
import { MarkCompleteButton } from '@/components/lesson/MarkCompleteButton'
import type { ActivePillar, ActiveSemester, ActiveCourse, ActiveLesson, ActiveQuizQuestion } from '@/types/database.types'

interface LessonPageProps {
  params: Promise<{
    pillarSlug: string
    semesterSlug: string
    courseSlug: string
    lessonSlug: string
  }>
}

function LessonContentSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="h-4 bg-surface-hover rounded w-3/4" />
      <div className="h-4 bg-surface-hover rounded w-full" />
      <div className="h-4 bg-surface-hover rounded w-5/6" />
      <div className="h-4 bg-surface-hover rounded w-4/5" />
      <div className="h-4 bg-surface-hover rounded w-full" />
      <div className="h-4 bg-surface-hover rounded w-2/3" />
      <div className="mt-8 h-4 bg-surface-hover rounded w-1/2" />
      <div className="h-4 bg-surface-hover rounded w-full" />
      <div className="h-4 bg-surface-hover rounded w-3/4" />
    </div>
  )
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

  // Fetch quiz questions for this lesson
  const { data: questionsData } = await supabase
    .from('active_quiz_questions')
    .select('*')
    .eq('lesson_id', lesson.id)
    .order('display_order', { ascending: true })

  const quizQuestions = (questionsData ?? []) as ActiveQuizQuestion[]

  // Fetch sibling lessons for navigation
  const { data: siblings } = await supabase
    .from('active_lessons')
    .select('id, name, slug, display_order')
    .eq('course_id', course.id)
    .order('display_order', { ascending: true })

  const siblingLessons = (siblings ?? []) as Pick<ActiveLesson, 'id' | 'name' | 'slug' | 'display_order'>[]
  const currentIndex = siblingLessons.findIndex((l) => l.slug === lessonSlug)
  const prevLesson = currentIndex > 0 ? siblingLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < siblingLessons.length - 1 ? siblingLessons[currentIndex + 1] : null
  const basePath = `/pillars/${pillarSlug}/semesters/${semesterSlug}/courses/${courseSlug}/lessons`

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

        {/* Lesson content */}
        {lesson.mdx_content ? (
          <article
            className="prose prose-invert max-w-none
                       prose-headings:text-text-primary prose-p:text-text-secondary
                       prose-a:text-blue-400 prose-strong:text-text-primary
                       prose-code:before:content-none prose-code:after:content-none
                       [&_pre]:bg-surface-card [&_pre]:border [&_pre]:border-border-subtle
                       light:prose light:not-prose-invert"
            style={{ maxWidth: '75ch' }}
          >
            <LessonBody quizQuestions={quizQuestions}>
              <Suspense fallback={<LessonContentSkeleton />}>
                <MDXRemote
                  source={lesson.mdx_content}
                  components={mdxComponents}
                  options={{
                    mdxOptions: {
                      rehypePlugins: [
                        [rehypePrettyCode, { theme: 'github-dark' }],
                      ],
                    },
                  }}
                />
              </Suspense>
            </LessonBody>
          </article>
        ) : (
          <section>
            <div className="rounded-xl border-2 border-dashed border-border-subtle p-12 text-center bg-surface-card">
              <p className="text-text-muted font-medium">No content available for this lesson yet</p>
            </div>
          </section>
        )}

        {/* Mark as complete */}
        <MarkCompleteButton lessonId={lesson.id} lessonSlug={lessonSlug} />

        {/* Lesson navigation */}
        <LessonNavigation
          prevLesson={prevLesson ? { name: prevLesson.name, href: `${basePath}/${prevLesson.slug}` } : null}
          nextLesson={nextLesson ? { name: nextLesson.name, href: `${basePath}/${nextLesson.slug}` } : null}
        />
      </main>
    </>
  )
}
