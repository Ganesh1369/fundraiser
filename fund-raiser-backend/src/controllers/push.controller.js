const pushService = require('../services/push.service');

exports.getPublicKey = (req, res) => {
    res.json({ success: true, data: { publicKey: pushService.getPublicKey(), configured: pushService.isConfigured() } });
};

exports.subscribe = async (req, res, next) => {
    try {
        await pushService.saveSubscription(req.user.id, req.body);
        res.status(201).json({ success: true });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ success: false, message: err.message });
        next(err);
    }
};

exports.unsubscribe = async (req, res, next) => {
    try {
        await pushService.removeSubscription(req.user.id);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};
