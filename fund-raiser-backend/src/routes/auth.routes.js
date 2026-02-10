const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// User Registration
router.post('/register', authController.register);

// User Login
router.post('/login', authController.login);

// Admin Login
router.post('/admin/login', authController.adminLogin);

// Validate referral code
router.get('/validate-referral/:code', authController.validateReferralCode);

module.exports = router;
