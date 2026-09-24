const Enquiry = require('../models/Enquiry');
const Settings = require('../models/Settings');
const { sendEnquiryNotification } = require('../services/emailService');
const { ENQUIRY_STATUSES } = require('../constants');

/* ---------- Public: submit ---------- */
async function submit(req, res) {
  if (req.honeypotTripped) return res.json({ ok: true }); // pretend success
  const id = await Enquiry.create(req.enquiry);
  const siteName = await Settings.get('site_name');
  sendEnquiryNotification(req.enquiry, siteName).catch(err => console.error('[mail] failed:', err.message));
  res.status(201).json({ ok: true, id });
}

/* ---------- Admin ---------- */
async function list(req, res) {
  const status = ENQUIRY_STATUSES.includes(req.query.status) ? req.query.status : undefined;
  const [items, counts] = await Promise.all([Enquiry.all(status), Enquiry.counts()]);
  res.json({ items, counts });
}
async function get(req, res) {
  const e = await Enquiry.get(req.params.id);
  if (!e) return res.status(404).json({ success: false, message: 'Enquiry not found', error: 'ENQUIRY_NOT_FOUND' });
  if (e.status === 'new') { await Enquiry.setStatus(e.id, 'read'); e.status = 'read'; }
  res.json(e);
}
async function setStatus(req, res) {
  const status = req.body?.status;
  if (!ENQUIRY_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status', error: 'VALIDATION_ERROR' });
  await Enquiry.setStatus(req.params.id, status);
  res.json({ ok: true });
}
async function remove(req, res) { await Enquiry.remove(req.params.id); res.json({ ok: true }); }

module.exports = { submit, list, get, setStatus, remove };
