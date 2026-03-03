import dotenv from 'dotenv'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

// Load environment variables from .env.local (Next.js convention) or .env
if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' })
} else {
  dotenv.config()
}

import { Command } from 'commander'
import type { GenerateOptions, PipelineResult } from './lib/types.js'
import { printLessonHeader, printStage, printSummary } from './lib/progress.js'
import { queryLessonsForScope } from './pipeline/query-lessons.js'
import { researchTopic } from './pipeline/research.js'
import { generateLesson } from './pipeline/generate-lesson.js'
import { reviewLesson } from './pipeline/review-lesson.js'
import { validateMdx } from './pipeline/validate-mdx.js'
import { seedLesson } from './pipeline/seed-lesson.js'

const program = new Command()

program
  .name('generate')
  .description('Generate MDX lessons via Claude API and seed into Supabase')
  .option(
    '--pillar <number>',
    'Generate all lessons for a pillar (by display_order number)'
  )
  .option('--semester <slug>', 'Generate all lessons in a semester')
  .option('--course <slug>', 'Generate all lessons in a course')
  .option('--lesson <slug>', 'Generate a single lesson')
  .option('--force', 'Regenerate existing lessons (default: skip)', false)
  .option('--dry-run', 'Validate without writing to database', false)
  .option('--model <name>', 'Claude model to use', 'claude-sonnet-4-6')
  .option('--refs <paths...>', 'Additional reference file paths')
  .action(async (opts) => {
    try {
      const options = opts as GenerateOptions

      // Require at least one scope flag
      if (
        !options.pillar &&
        !options.semester &&
        !options.course &&
        !options.lesson
      ) {
        console.error(
          'Error: At least one scope flag required (--pillar, --semester, --course, or --lesson)'
        )
        process.exit(1)
      }

      // Log if refs were provided (loading not yet implemented)
      if (options.refs && options.refs.length > 0) {
        console.log(`\nNote: Reference files provided but not yet loaded: ${options.refs.join(', ')}`)
      }

      // -----------------------------------------------------------------------
      // Step 1: Query lessons for the given scope
      // -----------------------------------------------------------------------
      let allTargets
      try {
        allTargets = await queryLessonsForScope(options)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`\nError querying lessons: ${message}`)
        process.exit(1)
      }

      // -----------------------------------------------------------------------
      // Step 2: Apply idempotency filter (GEN-05)
      // -----------------------------------------------------------------------
      const results: PipelineResult[] = []
      const lessonsToProcess = []

      for (const target of allTargets) {
        if (!options.force && target.mdxContent !== null) {
          console.log(
            `Skipping: "${target.name}" (already has content, use --force to regenerate)`
          )
          results.push({
            lessonId: target.id,
            lessonName: target.name,
            status: 'skipped',
            durationMs: 0,
          })
        } else {
          lessonsToProcess.push(target)
        }
      }

      const skippedCount = results.length
      const totalCount = allTargets.length

      // -----------------------------------------------------------------------
      // Step 3: Print banner
      // -----------------------------------------------------------------------
      const scope = options.pillar
        ? `pillar ${options.pillar}`
        : options.semester
          ? `semester ${options.semester}`
          : options.course
            ? `course ${options.course}`
            : `lesson ${options.lesson}`

      console.log('\n=== Content Generation CLI ===')
      console.log(`Model:   ${options.model}`)
      console.log(
        `Scope:   ${scope} (${totalCount} lesson${totalCount !== 1 ? 's' : ''}, ${skippedCount} skipped)`
      )
      console.log(`Mode:    ${options.dryRun ? 'dry-run' : 'normal'}`)

      if (lessonsToProcess.length === 0) {
        console.log('\nAll lessons already have content. Use --force to regenerate.')
        printSummary(results)
        process.exit(0)
      }

      // -----------------------------------------------------------------------
      // Step 4: Sequential lesson loop (GEN-04)
      // Per CONTEXT.md: one at a time, no parallelism
      // -----------------------------------------------------------------------
      const priorLessonSummaries: string[] = []

      for (let i = 0; i < lessonsToProcess.length; i++) {
        const lesson = lessonsToProcess[i]
        const startTime = Date.now()
        printLessonHeader(i + 1, lessonsToProcess.length, lesson.name)

        try {
          // Stage 1: Research
          let stageStart = Date.now()
          printStage('Researching', 'start')
          const researchNotes = await researchTopic({
            topic: lesson.name,
            pillarName: lesson.pillarName,
            courseName: lesson.courseName,
            model: options.model,
          })
          printStage('Researching', 'done', Date.now() - stageStart)

          // Stage 2: Generate
          stageStart = Date.now()
          printStage('Generating', 'start')
          let { mdx, quizQuestions } = await generateLesson({
            lessonTarget: lesson,
            researchNotes,
            priorLessonSummaries,
            model: options.model,
            totalLessons: lessonsToProcess.length,
          })
          printStage('Generating', 'done', Date.now() - stageStart)

          // Stage 3: Review
          stageStart = Date.now()
          printStage('Reviewing', 'start')
          const reviewed = await reviewLesson({
            mdx,
            quizQuestions,
            lessonTarget: lesson,
            priorLessonSummaries,
            model: options.model,
          })
          mdx = reviewed.mdx
          quizQuestions = reviewed.quizQuestions
          printStage('Reviewing', 'done', Date.now() - stageStart)

          // Stage 4: Validate (with one auto-retry on failure)
          stageStart = Date.now()
          printStage('Validating', 'start')
          let validation = await validateMdx(mdx)
          if (!validation.valid) {
            console.warn('  Validation failed, retrying generation...')
            const retry = await generateLesson({
              lessonTarget: lesson,
              researchNotes,
              priorLessonSummaries,
              model: options.model,
              totalLessons: lessonsToProcess.length,
            })
            mdx = retry.mdx
            quizQuestions = retry.quizQuestions
            validation = await validateMdx(mdx)
            if (!validation.valid) {
              throw new Error(
                `Validation failed after retry: ${validation.errors.join(', ')}`
              )
            }
          }
          printStage('Validating', 'done', Date.now() - stageStart)

          // Stage 5: Seed (or dry-run output)
          stageStart = Date.now()
          printStage('Seeding', 'start')

          // For batch dry-run (non-single-lesson scope), save to output/ directory
          if (options.dryRun && !options.lesson) {
            const outputDir = join(process.cwd(), 'scripts', 'output')
            mkdirSync(outputDir, { recursive: true })
            const filename = `${lesson.courseSlug}_${lesson.slug}.mdx`
            const outputPath = join(outputDir, filename)
            writeFileSync(outputPath, mdx, 'utf-8')
            console.log(`\n  Saved dry-run output to scripts/output/${filename}`)
          }

          await seedLesson({
            lessonId: lesson.id,
            mdxContent: mdx,
            quizQuestions,
            dryRun: options.dryRun,
            force: options.force,
          })
          printStage('Seeding', 'done', Date.now() - stageStart)

          // Track for lesson continuity context (progressive enrichment)
          priorLessonSummaries.push(
            `Lesson: "${lesson.name}" — part of course "${lesson.courseName}" in pillar "${lesson.pillarName}". Key topics covered in this lesson.`
          )

          results.push({
            lessonId: lesson.id,
            lessonName: lesson.name,
            status: options.dryRun ? 'dry-run' : 'generated',
            durationMs: Date.now() - startTime,
          })
        } catch (err: unknown) {
          printStage('', 'fail')
          const errorMsg = err instanceof Error ? err.message : String(err)
          console.error(`  Error: ${errorMsg}`)
          results.push({
            lessonId: lesson.id,
            lessonName: lesson.name,
            status: 'failed',
            durationMs: Date.now() - startTime,
            error: errorMsg,
          })
          // Continue to next lesson — don't crash the entire batch
        }
      }

      // -----------------------------------------------------------------------
      // Step 5: Print summary
      // -----------------------------------------------------------------------
      printSummary(results)

      // -----------------------------------------------------------------------
      // Step 6: Save generation log to scripts/logs/
      // -----------------------------------------------------------------------
      try {
        const logsDir = join(process.cwd(), 'scripts', 'logs')
        mkdirSync(logsDir, { recursive: true })

        const now = new Date()
        const timestamp = now
          .toISOString()
          .replace(/[:.]/g, '-')
          .replace('T', '-')
          .slice(0, 19)
        const logPath = join(logsDir, `${timestamp}.md`)

        const generated = results.filter((r) => r.status === 'generated').length
        const skipped = results.filter((r) => r.status === 'skipped').length
        const failed = results.filter((r) => r.status === 'failed').length
        const dryRunCount = results.filter((r) => r.status === 'dry-run').length
        const totalMs = results.reduce((sum, r) => sum + r.durationMs, 0)

        const logLines = [
          `# Generation Log — ${now.toISOString()}`,
          '',
          `**Scope:** ${scope}`,
          `**Model:** ${options.model}`,
          `**Mode:** ${options.dryRun ? 'dry-run' : 'normal'}`,
          '',
          '## Summary',
          '',
          `- Generated: ${generated}`,
          `- Dry-run: ${dryRunCount}`,
          `- Skipped: ${skipped}`,
          `- Failed: ${failed}`,
          `- Duration: ${Math.round(totalMs / 1000)}s total`,
          '',
          '## Results',
          '',
          ...results.map(
            (r) =>
              `- **${r.lessonName}**: ${r.status}${r.error ? ` — ${r.error}` : ''} (${Math.round(r.durationMs / 1000)}s)`
          ),
        ]

        writeFileSync(logPath, logLines.join('\n'), 'utf-8')
        console.log(`\nGeneration log saved to scripts/logs/${timestamp}.md`)
      } catch (logErr) {
        console.warn(
          `[generate] Failed to write generation log: ${logErr instanceof Error ? logErr.message : String(logErr)}`
        )
      }

      // -----------------------------------------------------------------------
      // Step 7: Exit with appropriate code
      // -----------------------------------------------------------------------
      process.exit(results.some((r) => r.status === 'failed') ? 1 : 0)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`\nUnhandled error: ${message}`)
      process.exit(1)
    }
  })

program.parse()
