import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendNotification(toEmail, message) {
  if (!toEmail) {
    console.log('[Notification skipped] No contact info provided')
    return
  }

  try {
    await resend.emails.send({
      from: 'QueueLess <onboarding@resend.dev>',
      to: toEmail,
      subject: "You're almost up!",
      text: message
    })
    console.log(`Notification sent to ${toEmail}`)
  } catch (err) {
    console.error('Failed to send notification:', err.message)
  }
}