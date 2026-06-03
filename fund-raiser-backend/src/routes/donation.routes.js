const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donation.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Create Razorpay order (requires auth)
router.post('/create-order', verifyToken, donationController.createOrder);

// Resume a pending/failed donation — re-opens checkout against existing order_id
router.post('/resume', verifyToken, donationController.resumeDonation);

// Verify payment (requires auth)
router.post('/verify', verifyToken, donationController.verifyPayment);

module.exports = router;
