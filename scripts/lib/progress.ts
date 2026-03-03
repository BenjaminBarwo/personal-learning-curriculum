import type { PipelineResult } from './types'

export function printLessonHeader(
  current: number,
  total: number,
  title: string
): void {
  console.log(`\n[${current}/${total}] '${title}'`)
}

export function printStage(
  stage: string,
  status: 'start' | 'done' | 'fail',
  durationMs?: number
): void {
  if (status === 'start') {
    process.stdout.write(`  ├ ${stage}...`)
  } else if (status === 'done') {
    const seconds = durationMs !== undefined ? Math.round(durationMs / 1000) : 0
    process.stdout.write(` done (${seconds}s)\n`)
  } else {
    process.stdout.write(` FAILED\n`)
  }
}

export function printSummary(results: PipelineResult[]): void {
  const generated = results.filter((r) => r.status === 'generated').length
  const skipped = results.filter((r) => r.status === 'skipped').length
  const failed = results.filter((r) => r.status === 'failed').length
  const dryRun = results.filter((r) => r.status === 'dry-run').length
  const totalMs = results.reduce((sum, r) => sum + r.durationMs, 0)

  console.log('\n=== Generation Summary ===')
  console.log(`Generated: ${generated}`)
  if (dryRun > 0) console.log(`Dry-run:   ${dryRun}`)
  console.log(`Skipped:   ${skipped}`)
  console.log(`Failed:    ${failed}`)
  console.log(`Duration:  ${Math.round(totalMs / 1000)}s total`)

  const failures = results.filter((r) => r.status === 'failed')
  if (failures.length > 0) {
    console.log('\nFailures:')
    for (const f of failures) {
      console.log(`  - ${f.lessonName}: ${f.error ?? 'Unknown error'}`)
    }
  }
}
