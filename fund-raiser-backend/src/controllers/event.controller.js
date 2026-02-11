const eventService = require('../services/event.service');

exports.createEvent = async (req, res, next) => {
    try {
        const data = await eventService.createEvent(req.body);
        res.status(201).json({ success: true, message: 'Event created successfully', data });
    } catch (error) {
        next(error);
    }
};

exports.getAllEvents = async (req, res, next) => {
    try {
        const data = await eventService.getAllEvents(req.query);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

exports.getEventById = async (req, res, next) => {
    try {
        const data = await eventService.getEventById(req.params.id);
        res.json({ success: true, data });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

exports.updateEvent = async (req, res, next) => {
    try {
        const data = await eventService.updateEvent(req.params.id, req.body);
        res.json({ success: true, message: 'Event updated successfully', data });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

exports.toggleEventStatus = async (req, res, next) => {
    try {
        const data = await eventService.toggleEventRegistration(req.params.id);
        res.json({ success: true, message: 'Event registration status toggled', data });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

exports.getEventRegistrations = async (req, res, next) => {
    try {
        const data = await eventService.getEventRegistrations(req.params.id, req.query);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

exports.exportEventRegistrations = async (req, res, next) => {
    try {
        const buffer = await eventService.exportEventRegistrations(req.params.id);
        res.setHeader('Content-Disposition', 'attachment; filename=event_registrations.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

exports.getActiveEvents = async (req, res, next) => {
    try {
        const data = await eventService.getActiveEvents();
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

exports.getEventDetails = async (req, res, next) => {
    try {
        const data = await eventService.getEventDetails(req.params.id);
        res.json({ success: true, data });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

exports.registerForEvent = async (req, res, next) => {
    try {
        const data = await eventService.registerForEvent(req.params.id, req.body);
        res.status(201).json({ success: true, ...data });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};
