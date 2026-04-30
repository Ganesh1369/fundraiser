const settingsService = require('../services/settings.service');

const handleError = (res, next, error) => {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
};

exports.getAll = async (req, res, next) => {
    try {
        const settings = await settingsService.getAll();
        res.json({ success: true, data: settings });
    } catch (error) { handleError(res, next, error); }
};

exports.updateMany = async (req, res, next) => {
    try {
        const updated = await settingsService.updateMany(req.body, req.admin?.id);
        res.json({ success: true, message: 'Settings updated', data: updated });
    } catch (error) { handleError(res, next, error); }
};

exports.uploadSignatory = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        const url = `/uploads/org/${req.file.filename}`;
        await settingsService.setOne('ice_signatory_image', url, req.admin?.id);
        res.json({ success: true, message: 'Signatory image uploaded', data: { url } });
    } catch (error) { handleError(res, next, error); }
};

exports.uploadLogo = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        const url = `/uploads/org/${req.file.filename}`;
        await settingsService.setOne('ice_logo', url, req.admin?.id);
        res.json({ success: true, message: 'Logo uploaded', data: { url } });
    } catch (error) { handleError(res, next, error); }
};

exports.getRequiredStatus = async (req, res, next) => {
    try {
        const missing = await settingsService.getMissingRequired();
        res.json({ success: true, data: { missing, complete: missing.length === 0 } });
    } catch (error) { handleError(res, next, error); }
};
