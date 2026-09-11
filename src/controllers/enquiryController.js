const Enquiry = require('../models/Enquiry');
const Settings = require('../models/Settings');
const { sendEnquiryNotification } = require('../services/emailService');
const { ENQUIRY_STATUSES } = require('../constants');

/* ---------- Public: submit ---------- */
function submit(req, res) {
  if (req.honeypotTripped) return res.json({ ok: true }); // pretend success
  const id = Enquiry.create(req.enquiry);
  sendEnquiryNotification(req.enquiry, Settings.get('site_name')).catch(err => console.error('[mail] failed:', err.message));
  res.status(201).json({ ok: true, id });
}

/* ---------- Admin ---------- */
function list(req, res) {
  const status = ENQUIRY_STATUSES.includes(req.query.status) ? req.query.status : undefined;
  res.json({ items: Enquiry.all(status), counts: Enquiry.counts() });
}
function get(req, res) {
  const e = Enquiry.get(req.params.id);
  if (!e) return res.status(404).json({ success: false, message: 'Enquiry not found', error: 'ENQUIRY_NOT_FOUND' });
  if (e.status === 'new') { Enquiry.setStatus(e.id, 'read'); e.status = 'read'; }
  res.json(e);
}
function setStatus(req, res) {
  const status = req.body?.status;
  if (!ENQUIRY_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status', error: 'VALIDATION_ERROR' });
  Enquiry.setStatus(req.params.id, status);
  res.json({ ok: true });
}
function remove(req, res) { Enquiry.remove(req.params.id); res.json({ ok: true }); }

module.exports = { submit, list, get, setStatus, remove };
