import { supabase } from '../lib/supabase.js'
import type { GenerateOptions } from '../lib/types.js'
import type { LessonTarget } from '../lib/types.js'

/**
 * Resolve lesson targets for the given scope flags.
 * Exactly one scope flag should be set — this is enforced by generate.ts.
 *
 * Scope hierarchy: pillars -> semesters -> courses -> lessons
 */
export async function queryLessonsForScope(
  opts: GenerateOptions
): Promise<LessonTarget[]> {
  if (opts.pillar) {
    return queryByPillar(parseInt(opts.pillar, 10))
  }
  if (opts.semester) {
    return queryBySemester(opts.semester)
  }
  if (opts.course) {
    return queryCourse(opts.course)
  }
  if (opts.lesson) {
    return queryByLesson(opts.lesson)
  }
  throw new Error(
    'No scope flag provided. Use --pillar, --semester, --course, or --lesson.'
  )
}

// ---------------------------------------------------------------------------
// Internal scope resolvers
// ---------------------------------------------------------------------------

async function queryByPillar(displayOrder: number): Promise<LessonTarget[]> {
  // 1. Resolve pillar row
  const { data: pillar, error: pillarErr } = await supabase
    .from('pillars')
    .select('id, name, slug')
    .eq('display_order', displayOrder)
    .is('deleted_at', null)
    .single()

  if (pillarErr || !pillar) {
    throw new Error(
      `No pillar found with display_order=${displayOrder}. ${pillarErr?.message ?? ''}`
    )
  }

  // 2. Resolve semesters under pillar
  const { data: semesters, error: semestersErr } = await supabase
    .from('semesters')
    .select('id, name, slug, display_order')
    .eq('pillar_id', pillar.id)
    .is('deleted_at', null)

  if (semestersErr) throw new Error(`Failed to query semesters: ${semestersErr.message}`)
  if (!semesters || semesters.length === 0) {
    throw new Error(`No semesters found for pillar "${pillar.name}".`)
  }

  const semesterIds = semesters.map((s) => s.id)

  // 3. Resolve courses under those semesters
  const { data: courses, error: coursesErr } = await supabase
    .from('courses')
    .select('id, name, slug, semester_id, display_order')
    .in('semester_id', semesterIds)
    .is('deleted_at', null)

  if (coursesErr) throw new Error(`Failed to query courses: ${coursesErr.message}`)
  if (!courses || courses.length === 0) {
    throw new Error(`No courses found for pillar "${pillar.name}".`)
  }

  const courseIds = courses.map((c) => c.id)

  // 4. Resolve lessons under those courses, ordered by course display_order then lesson display_order
  const { data: lessons, error: lessonsErr } = await supabase
    .from('lessons')
    .select('id, name, slug, course_id, display_order, mdx_content')
    .in('course_id', courseIds)
    .is('deleted_at', null)
    .order('display_order', { ascending: true })

  if (lessonsErr) throw new Error(`Failed to query lessons: ${lessonsErr.message}`)
  if (!lessons || lessons.length === 0) {
    throw new Error(`No lessons found for pillar "${pillar.name}".`)
  }

  return assembleLessonTargets(lessons, courses, semesters, pillar)
}

async function queryBySemester(semesterSlug: string): Promise<LessonTarget[]> {
  // 1. Resolve semester row
  const { data: semester, error: semesterErr } = await supabase
    .from('semesters')
    .select('id, name, slug, pillar_id, display_order')
    .eq('slug', semesterSlug)
    .is('deleted_at', null)
    .single()

  if (semesterErr || !semester) {
    throw new Error(
      `No semester found with slug="${semesterSlug}". ${semesterErr?.message ?? ''}`
    )
  }

  // 2. Resolve pillar
  const { data: pillar, error: pillarErr } = await supabase
    .from('pillars')
    .select('id, name, slug')
    .eq('id', semester.pillar_id)
    .is('deleted_at', null)
    .single()

  if (pillarErr || !pillar) {
    throw new Error(
      `No pillar found for semester "${semesterSlug}". ${pillarErr?.message ?? ''}`
    )
  }

  // 3. Resolve courses under this semester
  const { data: courses, error: coursesErr } = await supabase
    .from('courses')
    .select('id, name, slug, semester_id, display_order')
    .eq('semester_id', semester.id)
    .is('deleted_at', null)

  if (coursesErr) throw new Error(`Failed to query courses: ${coursesErr.message}`)
  if (!courses || courses.length === 0) {
    throw new Error(`No courses found for semester "${semesterSlug}".`)
  }

  const courseIds = courses.map((c) => c.id)

  // 4. Resolve lessons under those courses
  const { data: lessons, error: lessonsErr } = await supabase
    .from('lessons')
    .select('id, name, slug, course_id, display_order, mdx_content')
    .in('course_id', courseIds)
    .is('deleted_at', null)
    .order('display_order', { ascending: true })

  if (lessonsErr) throw new Error(`Failed to query lessons: ${lessonsErr.message}`)
  if (!lessons || lessons.length === 0) {
    throw new Error(`No lessons found for semester "${semesterSlug}".`)
  }

  return assembleLessonTargets(lessons, courses, [semester], pillar)
}

async function queryCourse(courseSlug: string): Promise<LessonTarget[]> {
  // 1. Resolve course row
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('id, name, slug, semester_id, display_order')
    .eq('slug', courseSlug)
    .is('deleted_at', null)
    .single()

  if (courseErr || !course) {
    throw new Error(
      `No course found with slug="${courseSlug}". ${courseErr?.message ?? ''}`
    )
  }

  // 2. Resolve semester and pillar
  const { data: semester, error: semesterErr } = await supabase
    .from('semesters')
    .select('id, name, slug, pillar_id, display_order')
    .eq('id', course.semester_id)
    .is('deleted_at', null)
    .single()

  if (semesterErr || !semester) {
    throw new Error(
      `No semester found for course "${courseSlug}". ${semesterErr?.message ?? ''}`
    )
  }

  const { data: pillar, error: pillarErr } = await supabase
    .from('pillars')
    .select('id, name, slug')
    .eq('id', semester.pillar_id)
    .is('deleted_at', null)
    .single()

  if (pillarErr || !pillar) {
    throw new Error(
      `No pillar found for course "${courseSlug}". ${pillarErr?.message ?? ''}`
    )
  }

  // 3. Resolve lessons under this course
  const { data: lessons, error: lessonsErr } = await supabase
    .from('lessons')
    .select('id, name, slug, course_id, display_order, mdx_content')
    .eq('course_id', course.id)
    .is('deleted_at', null)
    .order('display_order', { ascending: true })

  if (lessonsErr) throw new Error(`Failed to query lessons: ${lessonsErr.message}`)
  if (!lessons || lessons.length === 0) {
    throw new Error(`No lessons found for course "${courseSlug}".`)
  }

  return assembleLessonTargets(lessons, [course], [semester], pillar)
}

async function queryByLesson(lessonSlug: string): Promise<LessonTarget[]> {
  // 1. Resolve lesson row
  const { data: lesson, error: lessonErr } = await supabase
    .from('lessons')
    .select('id, name, slug, course_id, display_order, mdx_content')
    .eq('slug', lessonSlug)
    .is('deleted_at', null)
    .single()

  if (lessonErr || !lesson) {
    throw new Error(
      `No lesson found with slug="${lessonSlug}". ${lessonErr?.message ?? ''}`
    )
  }

  // 2. Resolve course, semester, pillar
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('id, name, slug, semester_id, display_order')
    .eq('id', lesson.course_id)
    .is('deleted_at', null)
    .single()

  if (courseErr || !course) {
    throw new Error(
      `No course found for lesson "${lessonSlug}". ${courseErr?.message ?? ''}`
    )
  }

  const { data: semester, error: semesterErr } = await supabase
    .from('semesters')
    .select('id, name, slug, pillar_id, display_order')
    .eq('id', course.semester_id)
    .is('deleted_at', null)
    .single()

  if (semesterErr || !semester) {
    throw new Error(
      `No semester found for lesson "${lessonSlug}". ${semesterErr?.message ?? ''}`
    )
  }

  const { data: pillar, error: pillarErr } = await supabase
    .from('pillars')
    .select('id, name, slug')
    .eq('id', semester.pillar_id)
    .is('deleted_at', null)
    .single()

  if (pillarErr || !pillar) {
    throw new Error(
      `No pillar found for lesson "${lessonSlug}". ${pillarErr?.message ?? ''}`
    )
  }

  return assembleLessonTargets([lesson], [course], [semester], pillar)
}

// ---------------------------------------------------------------------------
// LessonTarget assembly
// ---------------------------------------------------------------------------

type PillarRow = { id: string; name: string; slug: string }
type SemesterRow = { id: string; name: string; slug: string; pillar_id: string; display_order: number }
type CourseRow = { id: string; name: string; slug: string; semester_id: string; display_order: number }
type LessonRow = { id: string; name: string; slug: string; course_id: string; display_order: number; mdx_content: string | null }

function assembleLessonTargets(
  lessons: LessonRow[],
  courses: CourseRow[],
  semesters: SemesterRow[],
  pillar: PillarRow
): LessonTarget[] {
  const courseMap = new Map(courses.map((c) => [c.id, c]))
  const semesterMap = new Map(semesters.map((s) => [s.id, s]))

  // Sort by course display_order first, then lesson display_order
  const sorted = [...lessons].sort((a, b) => {
    const courseA = courseMap.get(a.course_id)
    const courseB = courseMap.get(b.course_id)
    const courseOrderA = courseA?.display_order ?? 0
    const courseOrderB = courseB?.display_order ?? 0
    if (courseOrderA !== courseOrderB) return courseOrderA - courseOrderB
    return a.display_order - b.display_order
  })

  const targets: LessonTarget[] = []

  for (const lesson of sorted) {
    const course = courseMap.get(lesson.course_id)
    if (!course) {
      console.warn(`[query] Skipping lesson "${lesson.name}" — no course found in map`)
      continue
    }

    const semester = semesterMap.get(course.semester_id)
    if (!semester) {
      console.warn(`[query] Skipping lesson "${lesson.name}" — no semester found in map`)
      continue
    }

    targets.push({
      id: lesson.id,
      name: lesson.name,
      slug: lesson.slug,
      courseSlug: course.slug,
      courseName: course.name,
      pillarSlug: pillar.slug,
      pillarName: pillar.name,
      semesterSlug: semester.slug,
      semesterNumber: semester.display_order,
      displayOrder: lesson.display_order,
      mdxContent: lesson.mdx_content,
    })
  }

  if (targets.length === 0) {
    throw new Error('No lesson targets could be assembled from query results.')
  }

  return targets
}
