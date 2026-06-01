const express = require('express');
const router = express.Router();
const csr = require('../controllers/csr.controller');
const { verifyAdmin } = require('../middleware/auth.middleware');

// Public
router.get('/csr/active', csr.listActive);

// Admin
router.get   ('/admin/csr',            verifyAdmin, csr.adminList);
router.post  ('/admin/csr',            verifyAdmin, csr.adminCreate);
router.post  ('/admin/csr/reorder',    verifyAdmin, csr.adminReorder);
router.get   ('/admin/csr/:id',        verifyAdmin, csr.adminGet);
router.put   ('/admin/csr/:id',        verifyAdmin, csr.adminUpdate);
router.patch ('/admin/csr/:id/toggle', verifyAdmin, csr.adminToggle);
router.delete('/admin/csr/:id',        verifyAdmin, csr.adminDelete);

module.exports = router;
