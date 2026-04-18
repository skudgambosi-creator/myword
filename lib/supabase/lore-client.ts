import { createBrowserClient } from '@supabase/ssr'

export function createLoreClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_LORE_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_LORE_SUPABASE_ANON_KEY!
  )
}
