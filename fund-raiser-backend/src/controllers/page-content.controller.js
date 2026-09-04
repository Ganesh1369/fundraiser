const svc = require('../services/page-content.service');
const settingsService = require('../services/settings.service');
const projectService = require('../services/project.service');

const handleError = (res, next, error) => {
    if (error?.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
};

// ── Public ───────────────────────────────────────────────────────────────────

/** Everything the volunteer page renders — roles, eligibility, and the form's area list. */
exports.getVolunteerPage = async (req, res, next) => {
    try {
        const [roles, eligibility, areas] = await Promise.all([
            svc.listPublic('volunteerRoles'),
            svc.listPublic('volunteerEligibility'),
            svc.volunteerAreas(),
        ]);
        res.json({ success: true, data: { roles, eligibility, areas } });
    } catch (error) { handleError(res, next, error); }
};

/**
 * Everything the CSR page renders. Focus areas now come from the database alongside the
 * trust block and the project cards.
 */
exports.getCsrPage = async (req, res, next) => {
    try {
        const [trust, projects, focusAreas] = await Promise.all([
            settingsService.getPublicTrust().catch(() => null),
            projectService.listActive(),
            svc.listPublic('csrFocusAreas'),
        ]);
        res.json({ success: true, data: { trust, projects, focusAreas } });
    } catch (error) { handleError(res, next, error); }
};

// ── Admin ────────────────────────────────────────────────────────────────────

exports.adminList = async (req, res, next) => {
    try {
        res.json({ success: true, data: { items: await svc.listAdmin(req.params.key), accents: svc.ACCENTS } });
    } catch (error) { handleError(res, next, error); }
};

exports.adminCreate = async (req, res, next) => {
    try {
        res.status(201).json({ success: true, message: 'Added', data: await svc.create(req.params.key, req.body) });
    } catch (error) { handleError(res, next, error); }
};

exports.adminUpdate = async (req, res, next) => {
    try {
        res.json({ success: true, message: 'Saved', data: await svc.update(req.params.key, req.params.id, req.body) });
    } catch (error) { handleError(res, next, error); }
};

exports.adminDelete = async (req, res, next) => {
    try {
        res.json({ success: true, message: 'Removed', data: await svc.remove(req.params.key, req.params.id) });
    } catch (error) { handleError(res, next, error); }
};

exports.adminReorder = async (req, res, next) => {
    try {
        res.json({ success: true, message: 'Order saved', data: await svc.reorder(req.params.key, req.body.ids) });
    } catch (error) { handleError(res, next, error); }
};
