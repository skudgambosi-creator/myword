// Returns the group considered "current": the most recently started
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

// Returns a group's season number: its 1-indexed position among all
// groups of the same project_type, ordered by start date. Season 1 is
// always the first alphabet (or other project type) ever run; a second
// group of that type starting later is automatically Season 2, and so on.
export async function getSeasonNumber(supabase: any, group: { id: string; project_type: string; start_date: string } | null): Promise<number> {
  if (!group) return 1
  const { count } = await supabase
    .from('groups')
    .select('id', { count: 'exact', head: true })
    .eq('project_type', group.project_type)
    .lte('start_date', group.start_date)
  return count || 1
}
