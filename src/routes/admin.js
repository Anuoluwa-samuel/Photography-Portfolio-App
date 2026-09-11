// Admin dashboard API. Everything under /api/admin (besides login) requires a signed-in session.
const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const authController = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');
const projectController = require('../controllers/projectController');
const categoryController = require('../controllers/categoryController');
const serviceController = require('../controllers/serviceController');
const enquiryController = require('../controllers/enquiryController');
const settingsController = require('../controllers/settingsController');

const router = express.Router();

/* ---------------------------------------------------------------- */
/* Auth                                                              */
/* ---------------------------------------------------------------- */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.', error: 'RATE_LIMITED' },
});
router.post('/api/admin/login', loginLimiter, authController.login);
router.post('/api/admin/logout', authController.logout);
router.get('/api/admin/me', authController.me);

// Everything below requires login
router.use('/api/admin', requireAdmin);

router.post('/api/admin/password', authController.changePassword);

/* ---------------------------------------------------------------- */
/* Dashboard                                                         */
/* ---------------------------------------------------------------- */
router.get('/api/admin/summary', dashboardController.summary);

/* ---------------------------------------------------------------- */
/* Projects + their images                                          */
/* ---------------------------------------------------------------- */
router.get('/api/admin/projects', projectController.list);
router.post('/api/admin/projects', projectController.create);
router.put('/api/admin/projects/order', projectController.reorder);
router.get('/api/admin/projects/:id', projectController.get);
router.patch('/api/admin/projects/:id', projectController.update);
router.delete('/api/admin/projects/:id', projectController.remove);

router.post('/api/admin/projects/:id/images', upload.array('photos', 20), projectController.uploadImages);
router.put('/api/admin/projects/:id/images/order', projectController.reorderImages);
router.patch('/api/admin/projects/:id/images/:imageId', projectController.updateImage);
router.delete('/api/admin/projects/:id/images/:imageId', projectController.removeImage);

/* ---------------------------------------------------------------- */
/* Categories                                                        */
/* ---------------------------------------------------------------- */
router.get('/api/admin/categories', categoryController.list);
router.post('/api/admin/categories', categoryController.create);
router.put('/api/admin/categories/order', categoryController.reorder);
router.patch('/api/admin/categories/:id', categoryController.update);
router.delete('/api/admin/categories/:id', categoryController.remove);

/* ---------------------------------------------------------------- */
/* Services                                                          */
/* ---------------------------------------------------------------- */
router.get('/api/admin/services', serviceController.list);
router.post('/api/admin/services', serviceController.create);
router.put('/api/admin/services/order', serviceController.reorder);
router.patch('/api/admin/services/:id', serviceController.update);
router.delete('/api/admin/services/:id', serviceController.remove);

/* ---------------------------------------------------------------- */
/* Enquiries                                                         */
/* ---------------------------------------------------------------- */
router.get('/api/admin/enquiries', enquiryController.list);
router.get('/api/admin/enquiries/:id', enquiryController.get);
router.patch('/api/admin/enquiries/:id', enquiryController.setStatus);
router.delete('/api/admin/enquiries/:id', enquiryController.remove);

/* ---------------------------------------------------------------- */
/* Settings                                                          */
/* ---------------------------------------------------------------- */
router.get('/api/admin/settings', settingsController.get);
router.put('/api/admin/settings', settingsController.update);
router.post('/api/admin/settings/image/:key', upload.single('photo'), settingsController.uploadImage);

module.exports = router;
