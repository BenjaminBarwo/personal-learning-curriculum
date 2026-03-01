import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, LessonStatus } from '@/types/database.types'

type ProgressClient = SupabaseClient<Database>

// ============================================================
// getLessonProgressForScope
// Returns completed/total/percent for a given set of lesson IDs
// Uses head:true optimization — only count transferred, no rows
// ============================================================

export async function getLessonProgressForScope(
  supabase: ProgressClient,
  lessonIds: string[],
  userId: string
): Promise<{ completed: number; total: number; percent: number }> {
  if (lessonIds.length === 0) {
    return { completed: 0, total: 0, percent: 0 }
  }

  const total = lessonIds.length

  const { count } = await supabase
    .from('progress')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
    .in('lesson_id', lessonIds)

  const completed = count ?? 0
  const percent = Math.min(100, Math.round((completed / total) * 100))

  return { completed, total, percent }
}

// ============================================================
// getContinueLesson
// Returns the most recently accessed in-progress lesson with
// full URL path, or null if no in-progress lessons exist
// ============================================================

export async function getContinueLesson(
  supabase: ProgressClient,
  userId: string
): Promise<{
  lessonName: string
  lessonSlug: string
  courseName: string
  courseSlug: string
  semesterSlug: string
  pillarSlug: string
  pillarColor: string
  href: string
} | null> {
  // Find the most recently accessed non-completed lesson
  const { data: progressRow } = await supabase
    .from('progress')
    .select('lesson_id, last_accessed_at')
    .eq('user_id', userId)
    .neq('status', 'completed')
    .order('last_accessed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!progressRow) return null

  // Fetch the lesson details
  const { data: lessonData } = await supabase
    .from('active_lessons')
    .select('id, name, slug, course_id')
    .eq('id', progressRow.lesson_id)
    .maybeSingle()

  if (!lessonData) return null

  // Resolve course -> semester -> pillar chain for URL slugs
  const { data: courseData } = await supabase
    .from('active_courses')
    .select('id, name, slug, semester_id')
    .eq('id', lessonData.course_id)
    .maybeSingle()

  if (!courseData) return null

  const { data: semesterData } = await supabase
    .from('active_semesters')
    .select('id, slug, pillar_id')
    .eq('id', courseData.semester_id)
    .maybeSingle()

  if (!semesterData) return null

  const { data: pillarData } = await supabase
    .from('active_pillars')
    .select('slug, color')
    .eq('id', semesterData.pillar_id)
    .maybeSingle()

  if (!pillarData) return null

  const pillarSlug = pillarData.slug
  const pillarColor = pillarData.color ?? '#64748B'
  const semesterSlug = semesterData.slug
  const courseSlug = courseData.slug
  const lessonSlug = lessonData.slug

  const href = `/pillars/${pillarSlug}/semesters/${semesterSlug}/courses/${courseSlug}/lessons/${lessonSlug}`

  return {
    lessonName: lessonData.name,
    lessonSlug,
    courseName: courseData.name,
    courseSlug,
    semesterSlug,
    pillarSlug,
    pillarColor,
    href,
  }
}

// ============================================================
// markLessonInProgress
// Fire-and-forget: marks lesson as in_progress on page load.
// Preserves completed status if lesson was already completed.
// ============================================================

export async function markLessonInProgress(
  supabase: ProgressClient,
  lessonId: string,
  userId: string
): Promise<void> {
  try {
    // Check existing status — do NOT overwrite completed
    const { data: existing } = await supabase
      .from('progress')
      .select('status')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle()

    if (existing?.status === 'completed') return

    const now = new Date().toISOString()
    await supabase.from('progress').upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        status: 'in_progress' as LessonStatus,
        started_at: existing ? undefined : now,
        last_accessed_at: now,
      },
      { onConflict: 'user_id,lesson_id' }
    )
  } catch (err) {
    // Fire-and-forget: log but do not throw — must not block page render
    console.error('[markLessonInProgress] Failed to upsert progress:', err)
  }
}

// ============================================================
// isSemesterLocked
// Pure function — no DB access.
// Determines if a semester should be locked based on predecessor
// completion or a manual override flag.
// ============================================================

export function isSemesterLocked(
  semesterIndex: number,
  semesterProgressList: Array<{ percent: number }>,
  manuallyUnlocked: boolean
): boolean {
  // First semester is never locked
  if (semesterIndex === 0) return false

  // Manual override takes precedence
  if (manuallyUnlocked) return false

  // Locked if predecessor semester is not 100% complete
  return semesterProgressList[semesterIndex - 1].percent < 100
}

// ============================================================
// getLessonStatuses
// Returns a Map<lessonId, LessonStatus> for a batch of lessons.
// Lessons not in the map are implicitly 'not_started'.
// ============================================================

export async function getLessonStatuses(
  supabase: ProgressClient,
  lessonIds: string[],
  userId: string
): Promise<Map<string, LessonStatus>> {
  if (lessonIds.length === 0) return new Map()

  const { data } = await supabase
    .from('progress')
    .select('lesson_id, status')
    .eq('user_id', userId)
    .in('lesson_id', lessonIds)

  const map = new Map<string, LessonStatus>()
  for (const row of data ?? []) {
    map.set(row.lesson_id, row.status as LessonStatus)
  }
  return map
}
