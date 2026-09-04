const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/volunteer-admin.controller');
const { verifyAdmin } = require('../middleware/auth.middleware');

router.use('/admin/volunteers', verifyAdmin);

// Literal paths first, so they are not read as an :id.
router.get('/admin/volunteers/meta', ctrl.getMeta);
router.get('/admin/volunteers/export', ctrl.exportVolunteers);

router.get('/admin/volunteers', ctrl.list);
router.get('/admin/volunteers/:id', ctrl.getById);
router.get('/admin/volunteers/:id/documents/:kind', ctrl.downloadDocument);

// The only write in the module — a visibility flag, not a workflow.
router.patch('/admin/volunteers/:id/active', ctrl.setActive);

module.exports = router;
