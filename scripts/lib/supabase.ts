import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database.types'

// CLI context — no Next.js, no Clerk. Use service role key directly.
// Lazy-initialised so that --help works without env vars being set.
let _supabase: ReturnType<typeof createClient<Database>> | null = null

export function getSupabase(): ReturnType<typeof createClient<Database>> {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL is not set. Add it to .env.local before running the CLI.'
      )
    }
    if (!key) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local before running the CLI.'
      )
    }

    _supabase = createClient<Database>(url, key, {
      auth: { persistSession: false },
    })
  }
  return _supabase
}

// Convenience export — same interface as before for files that destructure it
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop: string) {
    return getSupabase()[prop as keyof ReturnType<typeof createClient<Database>>]
  },
})
