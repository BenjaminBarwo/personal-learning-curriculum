export interface GenerateOptions {
  pillar?: string
  semester?: string
  course?: string
  lesson?: string
  force: boolean
  dryRun: boolean
  model: string
  refs?: string[]
}

export interface LessonTarget {
  id: string
  name: string
  slug: string
  courseSlug: string
  courseName: string
  pillarSlug: string
  pillarName: string
  semesterSlug: string
  semesterNumber: number
  displayOrder: number
  mdxContent: string | null
}

export interface PipelineResult {
  lessonId: string
  lessonName: string
  status: 'generated' | 'skipped' | 'failed' | 'dry-run'
  durationMs: number
  error?: string
}
