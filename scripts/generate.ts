import dotenv from 'dotenv'
import { existsSync } from 'fs'

// Load environment variables from .env.local (Next.js convention) or .env
if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' })
} else {
  dotenv.config()
}

import { Command } from 'commander'
import type { GenerateOptions } from './lib/types'

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

      console.log('\n=== Content Generation CLI ===\n')
      console.log(`Model:   ${options.model}`)
      console.log(`Dry run: ${options.dryRun}`)
      console.log(`Force:   ${options.force}`)

      // Pipeline not yet implemented — see Plan 02 and 03
      console.log('\nPipeline not yet implemented — see Plan 02 and 03')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`\nUnhandled error: ${message}`)
      process.exit(1)
    }
  })

program.parse()
