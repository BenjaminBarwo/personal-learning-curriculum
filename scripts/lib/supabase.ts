import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database.types'

// CLI context — no Next.js, no Clerk. Use service role key directly.
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)
