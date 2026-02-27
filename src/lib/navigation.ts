export interface BreadcrumbItem {
  label: string
  href: string
}

// Build breadcrumb array from hierarchy labels.
// Each page passes its resolved names down; this constructs the crumb chain.
export function buildBreadcrumbs(params: {
  pillarName?: string
  pillarSlug?: string
  semesterName?: string
  semesterSlug?: string
  courseName?: string
  courseSlug?: string
  lessonName?: string
  lessonSlug?: string
}): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [{ label: 'Dashboard', href: '/' }]

  if (params.pillarName && params.pillarSlug) {
    crumbs.push({
      label: params.pillarName,
      href: `/pillars/${params.pillarSlug}`,
    })
  }

  if (params.semesterName && params.semesterSlug && params.pillarSlug) {
    crumbs.push({
      label: params.semesterName,
      href: `/pillars/${params.pillarSlug}/semesters/${params.semesterSlug}`,
    })
  }

  if (params.courseName && params.courseSlug && params.pillarSlug && params.semesterSlug) {
    crumbs.push({
      label: params.courseName,
      href: `/pillars/${params.pillarSlug}/semesters/${params.semesterSlug}/courses/${params.courseSlug}`,
    })
  }

  if (params.lessonName && params.lessonSlug && params.pillarSlug && params.semesterSlug && params.courseSlug) {
    crumbs.push({
      label: params.lessonName,
      href: `/pillars/${params.pillarSlug}/semesters/${params.semesterSlug}/courses/${params.courseSlug}/lessons/${params.lessonSlug}`,
    })
  }

  return crumbs
}
