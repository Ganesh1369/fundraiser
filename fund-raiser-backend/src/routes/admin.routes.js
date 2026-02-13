const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
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

module.exports = router;
