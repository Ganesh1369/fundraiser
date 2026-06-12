const notificationService = require('../services/notification.service');

exports.preview = async (req, res, next) => {
    try {
        const data = await notificationService.previewAudience(req.body?.filters || {});
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

exports.send = async (req, res, next) => {
    try {
        const { filters, channels, payload } = req.body || {};
        if (!payload?.title || !payload?.body) {
            return res.status(400).json({ success: false, message: 'title and body are required' });
        }
        if (!channels?.push && !channels?.email) {
            return res.status(400).json({ success: false, message: 'select at least one channel' });
        }
        const data = await notificationService.dispatch({ filters: filters || {}, channels, payload });
        res.json({ success: true, data });
    } catch (err) { next(err); }
};
