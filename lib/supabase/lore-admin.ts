import { createClient } from '@supabase/supabase-js'

export function createLoreAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_LORE_SUPABASE_URL!,
    process.env.LORE_SUPABASE_SERVICE_ROLE_KEY!
  )
}
