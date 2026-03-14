import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const recipient = process.env.RESEND_TEST_EMAIL || to
  return resend.emails.send({
    from: 'My Word <hello@my-word.co.uk>',
    to: recipient,
    subject: process.env.RESEND_TEST_EMAIL ? `[TEST → ${to}] ${subject}` : subject,
    html,
  })
}
