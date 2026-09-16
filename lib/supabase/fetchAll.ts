// Supabase's REST layer (PostgREST) hard-caps how many rows a single
// request can return — commonly 1000, per the project's "Max Rows" API
// setting — and does this SILENTLY: no error, no partial-content status,
// just fewer rows than actually match, in whatever order the planner
// happened to produce. A plain `.select()` with no `.range()` never sees
// this coming.
//
// Most tables in this app stay well under that per group (a season's
// submissions, say), but `scores` doesn't: it gets a row for every member
// for every week they were around for — hit AND miss, not just hits — so
// it grows with members x weeks rather than with actual content. For a
// large, long-running group that has already sailed past 1000 rows, which
// is exactly what silently undercounted some members' totals on the
// leaderboard.
//
// Pages through in chunks of PAGE_SIZE until a short page confirms we've
// reached the end, so callers get the true full set regardless of size.
const PAGE_SIZE = 1000

export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const rows: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return rows
}
