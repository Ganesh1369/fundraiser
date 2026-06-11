const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { verifyAdmin } = require('../middleware/auth.middleware');

// Public Routes
router.get('/projects', projectController.listActive);
router.get('/projects/:slug', projectController.getBySlug);
router.get('/projects/:slug/recent-donors', projectController.getRecentDonors);

// Admin Routes
router.get('/admin/projects', verifyAdmin, projectController.adminList);
router.post('/admin/projects', verifyAdmin, projectController.adminCreate);
router.get('/admin/projects/:id', verifyAdmin, projectController.adminGetById);
router.put('/admin/projects/:id', verifyAdmin, projectController.adminUpdate);
router.patch('/admin/projects/:id/toggle', verifyAdmin, projectController.adminToggle);
router.delete('/admin/projects/:id', verifyAdmin, projectController.adminDelete);

router.post('/admin/projects/:id/accomplishments', verifyAdmin, projectController.adminCreateAccomplishment);
router.put('/admin/accomplishments/:accomplishmentId', verifyAdmin, projectController.adminUpdateAccomplishment);
router.delete('/admin/accomplishments/:accomplishmentId', verifyAdmin, projectController.adminDeleteAccomplishment);

module.exports = router;
