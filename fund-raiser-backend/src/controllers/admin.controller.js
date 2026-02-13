const adminService = require('../services/admin.service');

exports.getDashboardStats = async (req, res, next) => {
    try {
        const data = await adminService.getDashboardStats();
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

exports.getRegistrations = async (req, res, next) => {
    try {
        const data = await adminService.getRegistrations(req.query);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

exports.exportRegistrations = async (req, res, next) => {
    try {
        const buffer = await adminService.exportRegistrations(req.query);
        res.setHeader('Content-Disposition', 'attachment; filename=registrations.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

exports.getDonations = async (req, res, next) => {
    try {
        const data = await adminService.getDonations(req.query);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

exports.exportDonations = async (req, res, next) => {
    try {
        const buffer = await adminService.exportDonations(req.query);
        res.setHeader('Content-Disposition', 'attachment; filename=donations.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

exports.getUserAnalytics = async (req, res, next) => {
    try {
        const data = await adminService.getUserAnalytics(req.params.id);
        res.json({ success: true, data });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

exports.getLeaderboard = async (req, res, next) => {
    try {
        const data = await adminService.getLeaderboard(req.query);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

exports.exportLeaderboard = async (req, res, next) => {
    try {
        const buffer = await adminService.exportLeaderboard();
        res.setHeader('Content-Disposition', 'attachment; filename=leaderboard.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

exports.exportCertificates = async (req, res, next) => {
    try {
        const buffer = await adminService.exportCertificates(req.query);
        res.setHeader('Content-Disposition', 'attachment; filename=80g-certificates.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

exports.getCertificateRequests = async (req, res, next) => {
    try {
        const data = await adminService.getCertificateRequests(req.query);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

exports.updateCertificateStatus = async (req, res, next) => {
    try {
        const data = await adminService.updateCertificateStatus(req.params.id, req.body);
        res.json({ success: true, message: 'Certificate request updated', data });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

exports.getUserBySlug = async (req, res, next) => {
    try {
        const data = await adminService.getUserBySlug(req.params.slug);
        res.json({ success: true, data });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};
