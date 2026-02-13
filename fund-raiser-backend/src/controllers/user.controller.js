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

exports.uploadAvatar = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        const filename = req.file.filename;
        const profilePic = `/uploads/profile/${filename}`;
        await userService.updateProfilePic(req.user.id, profilePic);
        res.json({ success: true, message: 'Profile picture updated', data: { profilePic } });
    } catch (error) {
        next(error);
    }
};

exports.removeAvatar = async (req, res, next) => {
    try {
        const profile = await userService.getProfile(req.user.id);
        if (profile.profilePic) {
            const path = require('path');
            const fs = require('fs');
            const filePath = path.join(__dirname, '../../../fund-raiser-frontend/public', profile.profilePic);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await userService.updateProfilePic(req.user.id, null);
        res.json({ success: true, message: 'Profile picture removed' });
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
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE endpoint = VALUES(endpoint), p256dh = VALUES(p256dh), auth = VALUES(auth)`,
            [req.user.id, endpoint, keys.p256dh, keys.auth]
        );
        res.json({ success: true, message: 'Push subscription saved' });
    } catch (error) {
        next(error);
    }
};
exports.getUserEvents = async (req, res, next) => {
    try {
        const data = await userService.getUserEvents(req.user.id);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};
