import { createClient } from '@supabase/supabase-js'
import { useSession } from '@clerk/nextjs'
import type { Database } from '@/types/database.types'

export function createClerkSupabaseClient() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { session } = useSession()

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => session?.getToken() ?? null,
    }
  )
}
