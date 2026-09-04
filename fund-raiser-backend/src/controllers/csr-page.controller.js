const settingsService = require('../services/settings.service');
const projectService = require('../services/project.service');

const handleError = (res, next, error) => {
    if (error?.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
};

/**
 * Everything the public CSR Collaboration page renders in one request:
 *   - trust: ICE's compliance numbers (CSR-1, 12A, 80G, Section 8, PAN)
 *   - projects: active projects + their live stats, used for the CSR opportunity
 *     cards and the impact highlights strip
 *
 * A failed trust lookup degrades to null rather than failing the page — the
 * compliance section hides itself, the rest still renders.
 */
exports.getPage = async (req, res, next) => {
    try {
        const [trust, projects] = await Promise.all([
            settingsService.getPublicTrust().catch(() => null),
            projectService.listActive(),
        ]);
        res.json({ success: true, data: { trust, projects } });
    } catch (error) { handleError(res, next, error); }
};
