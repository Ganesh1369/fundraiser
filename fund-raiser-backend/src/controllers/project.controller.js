const projectService = require('../services/project.service');

const handleError = (res, next, error) => {
    if (error?.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
};

exports.listActive = async (req, res, next) => {
    try {
        const projects = await projectService.listActive();
        res.json({ success: true, data: projects });
    } catch (error) { handleError(res, next, error); }
};

exports.getBySlug = async (req, res, next) => {
    try {
        const project = await projectService.getBySlug(req.params.slug);
        res.json({ success: true, data: project });
    } catch (error) { handleError(res, next, error); }
};

exports.getCsrSponsorsBySlug = async (req, res, next) => {
    try {
        const sponsors = await projectService.getCsrSponsorsBySlug(req.params.slug);
        res.json({ success: true, data: sponsors });
    } catch (error) { handleError(res, next, error); }
};

exports.adminList = async (req, res, next) => {
    try {
        const projects = await projectService.listAllForAdmin();
        res.json({ success: true, data: projects });
    } catch (error) { handleError(res, next, error); }
};

exports.adminGetById = async (req, res, next) => {
    try {
        const project = await projectService.getByIdForAdmin(req.params.id);
        res.json({ success: true, data: project });
    } catch (error) { handleError(res, next, error); }
};

exports.adminCreate = async (req, res, next) => {
    try {
        const project = await projectService.create(req.body);
        res.status(201).json({ success: true, message: 'Project created', data: project });
    } catch (error) { handleError(res, next, error); }
};

exports.adminUpdate = async (req, res, next) => {
    try {
        const project = await projectService.update(req.params.id, req.body);
        res.json({ success: true, message: 'Project updated', data: project });
    } catch (error) { handleError(res, next, error); }
};

exports.adminToggle = async (req, res, next) => {
    try {
        const project = await projectService.toggleActive(req.params.id);
        res.json({ success: true, message: 'Project status toggled', data: project });
    } catch (error) { handleError(res, next, error); }
};

exports.adminDelete = async (req, res, next) => {
    try {
        await projectService.remove(req.params.id);
        res.json({ success: true, message: 'Project deleted' });
    } catch (error) { handleError(res, next, error); }
};

exports.adminCreateAccomplishment = async (req, res, next) => {
    try {
        const accomplishment = await projectService.createAccomplishment(req.params.id, req.body);
        res.status(201).json({ success: true, message: 'Accomplishment added', data: accomplishment });
    } catch (error) { handleError(res, next, error); }
};

exports.adminUpdateAccomplishment = async (req, res, next) => {
    try {
        const accomplishment = await projectService.updateAccomplishment(req.params.accomplishmentId, req.body);
        res.json({ success: true, message: 'Accomplishment updated', data: accomplishment });
    } catch (error) { handleError(res, next, error); }
};

exports.adminDeleteAccomplishment = async (req, res, next) => {
    try {
        await projectService.deleteAccomplishment(req.params.accomplishmentId);
        res.json({ success: true, message: 'Accomplishment deleted' });
    } catch (error) { handleError(res, next, error); }
};
