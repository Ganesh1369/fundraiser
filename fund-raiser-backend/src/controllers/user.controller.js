const userService = require('../services/user.service');

exports.getProfile = async (req, res, next) => {
    try {
        const data = await userService.getProfile(req.user.id);
        res.json({ success: true, data });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const data = await userService.updateProfile(req.user.id, req.body);
        res.json({ success: true, message: 'Profile updated successfully', data });
    } catch (error) {
        next(error);
    }
};

exports.getDonations = async (req, res, next) => {
    try {
        const data = await userService.getDonations(req.user.id, req.query.period);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

exports.getDonationSummary = async (req, res, next) => {
    try {
        const data = await userService.getDonationSummary(req.user.id);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

exports.getReferrals = async (req, res, next) => {
    try {
        const data = await userService.getReferrals(req.user.id, req.user.referral_code);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

exports.getReferralPointsHistory = async (req, res, next) => {
    try {
        const data = await userService.getReferralPointsHistory(req.user.id);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

exports.requestCertificate = async (req, res, next) => {
    try {
        const { panNumber, donationId } = req.body;
        const data = await userService.requestCertificate(req.user.id, panNumber, donationId);
        res.status(201).json({ success: true, message: 'Certificate request submitted successfully', data });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

exports.getCertificateRequests = async (req, res, next) => {
    try {
        const data = await userService.getCertificateRequests(req.user.id);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

exports.subscribePush = async (req, res, next) => {
    try {
        const { endpoint, keys } = req.body;
        if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
            return res.status(400).json({ success: false, message: 'Invalid subscription data' });
        }
        const db = require('../config/db');
        await db.query(
            `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id) DO UPDATE SET endpoint = EXCLUDED.endpoint, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
            [req.user.id, endpoint, keys.p256dh, keys.auth]
        );
        res.json({ success: true, message: 'Push subscription saved' });
    } catch (error) {
        next(error);
    }
};
