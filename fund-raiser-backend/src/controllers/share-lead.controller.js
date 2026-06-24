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

exports.adminList = async (req, res, next) => {
    try {
        const data = await shareLeadService.adminList(req.query);
        res.json({ success: true, data });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ success: false, message: err.message });
        next(err);
    }
};

exports.adminExport = async (req, res, next) => {
    try {
        const buf = await shareLeadService.adminExport(req.query);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="share-leads.xlsx"');
        res.send(buf);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ success: false, message: err.message });
        next(err);
    }
};
