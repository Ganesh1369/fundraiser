const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const adminController = require('../controllers/admin.controller');
const settingsController = require('../controllers/settings.controller');
const { verifyAdmin } = require('../middleware/auth.middleware');

// All routes require admin authentication
router.use(verifyAdmin);

// Dashboard stats
router.get('/stats', adminController.getDashboardStats);

// Registration Management
router.get('/registrations', adminController.getRegistrations);
router.get('/registrations/export', adminController.exportRegistrations);

// Donation Tracking
router.get('/donations', adminController.getDonations);
router.get('/donations/export', adminController.exportDonations);

// User Analytics
router.get('/users/by-slug/:slug', adminController.getUserBySlug);
router.get('/users/:id', adminController.getUserAnalytics);

// Leaderboard
router.get('/leaderboard', adminController.getLeaderboard);
router.get('/leaderboard/export', adminController.exportLeaderboard);

// 80G Certificate Management
router.get('/certificates', adminController.getCertificateRequests);
router.get('/certificates/export', adminController.exportCertificates);
router.patch('/certificates/:id', adminController.updateCertificateStatus);

// === Phase 2.1: Organization settings ===

// Org image uploads (signatory + logo) saved under fund-raiser-backend/uploads/org/.
// Files use a timestamped name so old uploads are not overwritten — historical PDFs
// (which embedded the bytes at generation time) are unaffected, and the latest URL
// is stored in org_settings.
const orgUploadDir = path.join(__dirname, '../../uploads/org');
if (!fs.existsSync(orgUploadDir)) fs.mkdirSync(orgUploadDir, { recursive: true });

const orgStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, orgUploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const prefix = req.url.includes('signatory') ? 'signature'
                     : req.url.includes('logo')      ? 'logo'
                     : 'org';
        cb(null, `${prefix}-${Date.now()}${ext}`);
    }
});

const orgUpload = multer({
    storage: orgStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only JPG, PNG, and WebP images are allowed'));
    }
});

router.get('/settings', settingsController.getAll);
router.put('/settings', settingsController.updateMany);
router.get('/settings/required-status', settingsController.getRequiredStatus);
router.post('/settings/upload/signatory', orgUpload.single('image'), settingsController.uploadSignatory);
router.post('/settings/upload/logo', orgUpload.single('image'), settingsController.uploadLogo);

module.exports = router;
