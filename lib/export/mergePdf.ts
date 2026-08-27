import { PDFDocument } from 'pdf-lib'

// Appends the pages of `addition` onto `existing` (or starts a fresh
// document if there's nothing to merge into yet), returning the combined
// bytes. Used to stitch together the batches of a chunked "all" export —
// react-pdf renders each batch independently (they're too large to render
// as one Document within a serverless function's time budget), and this is
// what joins them back into a single downloadable file.
export async function mergePdfBuffers(existing: Buffer | null, addition: Buffer): Promise<Buffer> {
  const merged = existing ? await PDFDocument.load(existing) : await PDFDocument.create()
  const additionDoc = await PDFDocument.load(addition)
  const pages = await merged.copyPages(additionDoc, additionDoc.getPageIndices())
  pages.forEach(p => merged.addPage(p))
  const bytes = await merged.save()
  return Buffer.from(bytes)
}
