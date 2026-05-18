import { redirect } from 'next/navigation'

export default function SubmissionRedirectPage({
  params,
}: {
  params: { id: string; week: string; submissionId: string }
}) {
  redirect(`/groups/${params.id}/submissions?view=read&anchor=${params.submissionId}`)
}
