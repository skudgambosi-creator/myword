// Returns the group considered "current" — the most recently started
// group that has not been completed. Returns null if none exists
// (a genuine between-seasons gap).
export async function getCurrentGroup(supabase: any) {
  const { data } = await supabase
    .from('groups')
    .select('*')
    .is('completed_at', null)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}
