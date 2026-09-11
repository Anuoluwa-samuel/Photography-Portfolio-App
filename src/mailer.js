// Email notifications for new enquiries. If SMTP isn't configured the message is logged instead.
const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function sendEnquiryNotification(e, siteName) {
  const to = process.env.NOTIFY_EMAIL;
  const subject = `New enquiry from ${e.name}${e.service ? ` — ${e.service}` : ''}`;
  const text = [
    `Name: ${e.name}`, `Email: ${e.email}`, `Phone: ${e.phone || '—'}`, `Service: ${e.service || '—'}`,
    `Preferred date: ${e.preferred_date || '—'}`, '', e.message,
  ].join('\n');
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#0b0d0e;color:#f2f4f4;padding:32px">
      <p style="color:#1fd1c1;letter-spacing:.2em;font-size:12px;text-transform:uppercase;margin:0 0 8px">${esc(siteName)}</p>
      <h2 style="margin:0 0 24px;font-weight:400">New enquiry from ${esc(e.name)}</h2>
      <table style="border-collapse:collapse;font-size:14px">
        ${[['Email', e.email], ['Phone', e.phone || '—'], ['Service', e.service || '—'], ['Preferred date', e.preferred_date || '—']]
          .map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#a4acad">${k}</td><td style="padding:6px 0">${esc(v)}</td></tr>`).join('')}
      </table>
      <p style="white-space:pre-wrap;margin-top:24px;line-height:1.6">${esc(e.message)}</p>
      <p style="margin-top:32px"><a href="mailto:${esc(e.email)}" style="background:#1fd1c1;color:#0b0d0e;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Reply to ${esc(e.name.split(' ')[0])}</a></p>
    </div>`;

  if (!transporter || !to) {
    console.log(`[mail] SMTP not configured — enquiry logged only.\n${text}\n`);
    return { logged: true };
  }
  return transporter.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, replyTo: e.email, subject, text, html });
}

module.exports = { sendEnquiryNotification };
