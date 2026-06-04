const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donation.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Create Razorpay order (requires auth)
router.post('/create-order', verifyToken, donationController.createOrder);

// Cancel a still-pending donation (requires auth, ownership-checked in service)
router.post('/cancel-pending', verifyToken, donationController.cancelPending);

// Verify payment (requires auth)
router.post('/verify', verifyToken, donationController.verifyPayment);

module.exports = router;
