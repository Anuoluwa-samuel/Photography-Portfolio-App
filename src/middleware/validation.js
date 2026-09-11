// Validates the public enquiry form server-side; attaches the cleaned record as req.enquiry.
function validateEnquiry(req, res, next) {
  const b = req.body || {};
  if (b.company) { req.honeypotTripped = true; return next(); } // pretend success upstream

  const errors = {};
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim();
  const phone = String(b.phone || '').trim();
  const service = String(b.service || '').trim();
  const date = String(b.date || '').trim();
  const message = String(b.message || '').trim();

  if (name.length < 2 || name.length > 120) errors.name = 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) errors.email = 'Enter a valid email address.';
  if (phone && !/^[+\d][\d\s()-]{6,30}$/.test(phone)) errors.phone = 'Enter a valid phone number, or leave it blank.';
  if (!service) errors.service = 'Choose the type of photography.';
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date) < new Date(new Date().toDateString()))) errors.date = "Choose a date that hasn't passed.";
  if (message.length < 10 || message.length > 5000) errors.message = 'Add a little detail so I can send an accurate quote.';

  if (Object.keys(errors).length) return res.status(422).json({ success: false, message: 'Please fix the highlighted fields.', error: 'VALIDATION_ERROR', fields: errors });

  req.enquiry = { name, email, phone, service, preferred_date: date, message, ip: req.ip || '' };
  next();
}

module.exports = { validateEnquiry };
