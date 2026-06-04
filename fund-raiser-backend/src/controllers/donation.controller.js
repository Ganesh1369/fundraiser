const donationService = require('../services/donation.service');

// Create Razorpay order
exports.createOrder = async (req, res, next) => {
    try {
        const { amount, request80g, purpose, projectId } = req.body;
        const result = await donationService.createOrder(
            req.user.id, req.user.name, amount,
            request80g || false, purpose || 'donation', projectId || null
        );
        res.json({ success: true, data: result });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

// Cancel a still-pending donation (e.g. user dismissed Razorpay and wants to retry).
// Marks status='failed' so the row stops cluttering the dashboard as "Pending".
exports.cancelPending = async (req, res, next) => {
    try {
        const { donationId } = req.body;
        if (!donationId) return res.status(400).json({ success: false, message: 'donationId is required' });
        const result = await donationService.cancelPending(req.user.id, donationId);
        res.json({ success: true, data: result });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

// Verify payment
exports.verifyPayment = async (req, res, next) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
        const result = await donationService.verifyPayment(
            req.user.id, req.user.name,
            razorpayOrderId, razorpayPaymentId, razorpaySignature
        );
        res.json({ success: true, message: 'Payment verified successfully', data: result });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};
