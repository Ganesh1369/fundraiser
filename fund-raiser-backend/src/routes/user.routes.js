const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken, isOrganization } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);

// Get user profile
router.get('/profile', userController.getProfile);

// Update user profile
router.put('/profile', userController.updateProfile);

// Get user donations with filters
router.get('/donations', userController.getDonations);

// Get donation summary
router.get('/donations/summary', userController.getDonationSummary);

// Get referral statistics
router.get('/referrals', userController.getReferrals);

// Get referral points history
router.get('/referrals/history', userController.getReferralPointsHistory);

// Request 80G certificate (organization only)
router.post('/certificate-request', isOrganization, userController.requestCertificate);

// Get certificate request status
router.get('/certificate-requests', isOrganization, userController.getCertificateRequests);

// Subscribe to push notifications
router.post('/push-subscribe', userController.subscribePush);

// Get user's registered events
router.get('/events', userController.getUserEvents);

module.exports = router;
