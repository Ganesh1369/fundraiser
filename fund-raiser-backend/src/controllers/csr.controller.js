const csrService = require('../services/csr.service');

const handle = (fn) => async (req, res, next) => {
    try { res.json({ success: true, data: await fn(req) }); }
    catch (err) {
        if (err.status) return res.status(err.status).json({ success: false, message: err.message });
        next(err);
    }
};

exports.listActive    = handle(()  => csrService.listActive());
exports.adminList     = handle(()  => csrService.listAllForAdmin());
exports.adminGet      = handle(req => csrService.getByIdForAdmin(req.params.id));
exports.adminCreate   = handle(req => csrService.create(req.body));
exports.adminUpdate   = handle(req => csrService.update(req.params.id, req.body));
exports.adminToggle   = handle(req => csrService.toggleActive(req.params.id));
exports.adminReorder  = handle(req => csrService.reorder(req.body?.items));
exports.adminDelete   = handle(req => csrService.remove(req.params.id));
