// Empirically benchmarked: ~0.47s/piece to render (258 pieces = ~122s).
// 40 pieces/batch budgets ~19s of render time per invocation, leaving
// generous headroom under Vercel's 60s Hobby ceiling for DB fetch time,
// image-fetch time, and the pdf-lib merge step on top of that.
export const EXPORT_BATCH_SIZE = 40

export const EXPORT_BUCKET = 'season-exports'
