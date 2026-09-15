// Public API: read-only JSON + the enquiry form + sitemap. The pages themselves are rendered by Next.js (app/).
const express = require('express');
const rateLimit = require('express-rate-limit');
const publicController = require('../controllers/publicController');
const enquiryController = require('../controllers/enquiryController');
const { validateEnquiry } = require('../middleware/validation');

const router = express.Router();

router.get('/sitemap.xml', publicController.sitemap);

router.get('/api/projects', publicController.apiProjects);
router.get('/api/categories', publicController.apiCategories);
router.get('/api/services', publicController.apiServices);

const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 6, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many enquiries from this connection. Please try again in a few minutes.', error: 'RATE_LIMITED' },
});
router.post('/api/enquiries', enquiryLimiter, validateEnquiry, enquiryController.submit);

module.exports = router;
