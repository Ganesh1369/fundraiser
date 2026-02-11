const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { verifyAdmin } = require('../middleware/auth.middleware');

// Public Routes
router.get('/events', eventController.getActiveEvents);
router.get('/events/:id', eventController.getEventDetails);
router.post('/events/:id/register', eventController.registerForEvent);

// Admin Routes
router.post('/admin/events', verifyAdmin, eventController.createEvent);
router.get('/admin/events', verifyAdmin, eventController.getAllEvents);
router.get('/admin/events/:id', verifyAdmin, eventController.getEventById);
router.put('/admin/events/:id', verifyAdmin, eventController.updateEvent);
router.patch('/admin/events/:id/toggle', verifyAdmin, eventController.toggleEventStatus);
router.get('/admin/events/:id/registrations', verifyAdmin, eventController.getEventRegistrations);
router.get('/admin/events/:id/registrations/export', verifyAdmin, eventController.exportEventRegistrations);

module.exports = router;
