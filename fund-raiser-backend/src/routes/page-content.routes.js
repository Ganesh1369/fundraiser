const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/page-content.controller');
const { verifyAdmin } = require('../middleware/auth.middleware');

// Public — the volunteer page's content
router.get('/volunteer/page', ctrl.getVolunteerPage);

// Admin — CRUD over the editable page content.
// `key` is one of: csrFocusAreas, volunteerRoles, volunteerEligibility.
router.get   ('/admin/page-content/:key',            verifyAdmin, ctrl.adminList);
router.post  ('/admin/page-content/:key',            verifyAdmin, ctrl.adminCreate);
router.post  ('/admin/page-content/:key/reorder',    verifyAdmin, ctrl.adminReorder);
router.put   ('/admin/page-content/:key/:id',        verifyAdmin, ctrl.adminUpdate);
router.delete('/admin/page-content/:key/:id',        verifyAdmin, ctrl.adminDelete);

module.exports = router;
