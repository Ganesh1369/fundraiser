const volunteerService = require('../services/volunteer.service');
const volunteerEmailService = require('../services/volunteer-email.service');

const handleError = (res, next, error) => {
    if (error?.status) {
        const body = { success: false, message: error.message };
        if (error.errors) body.errors = error.errors;
        return res.status(error.status).json(body);
    }
    next(error);
};

const respond = (res, volunteer, message) => {
    res.status(201).json({
        success: true,
        message,
        data: {
            volunteerId: volunteer.volunteer_id,
            fullName: volunteer.full_name,
            email: volunteer.email,
            areaOfInterest: volunteer.area_of_interest,
            roleOfInterest: volunteer.role_of_interest,
        },
    });
};

/**
 * Register a volunteer and return their reference number.
 *
 * Notifications are fired after the response is composed: a volunteer must get their ID
 * even if SMTP is unavailable.
 */
exports.register = async (req, res, next) => {
    try {
        const volunteer = await volunteerService.create(req.body, req.files || {}, {
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
        respond(res, volunteer, 'Registration received');

        volunteerEmailService.notifyNewRegistration(volunteer);
    } catch (error) { handleError(res, next, error); }
};

/**
 * Same form as the public one, entered by staff for a walk-in sign-up. `viaAdmin` is set
 * here rather than read from the body, so only a request that got past verifyAdmin can
 * be stamped as staff-entered.
 */
exports.adminRegister = async (req, res, next) => {
    try {
        const volunteer = await volunteerService.create(req.body, req.files || {}, {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            viaAdmin: true,
        });
        respond(res, volunteer, 'Volunteer added');

        volunteerEmailService.notifyNewRegistration(volunteer);
    } catch (error) { handleError(res, next, error); }
};
