const shareLeadService = require('../services/share-lead.service');

exports.create = async (req, res, next) => {
    try {
        const data = await shareLeadService.createLead(req.body || {});
        res.status(201).json({ success: true, data });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ success: false, message: err.message });
        next(err);
    }
};
