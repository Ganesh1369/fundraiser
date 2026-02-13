const donationService = require('../services/donation.service');

// Create Razorpay order
exports.createOrder = async (req, res, next) => {
    try {
        const { amount, request80g, purpose } = req.body;
        const result = await donationService.createOrder(req.user.id, req.user.name, amount, request80g || false, purpose || 'donation');
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
