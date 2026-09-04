const volunteerService = require('../services/volunteer.service');

const handleError = (res, next, error) => {
    if (error?.status) {
        const body = { success: false, message: error.message };
        if (error.errors) body.errors = error.errors;
        return res.status(error.status).json(body);
    }
    next(error);
};

/** Register a volunteer and return their reference number. */
exports.register = async (req, res, next) => {
    try {
        const volunteer = await volunteerService.create(req.body, req.files || {}, {
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.status(201).json({
            success: true,
            message: 'Registration received',
            data: {
                volunteerId: volunteer.volunteer_id,
                fullName: volunteer.full_name,
                email: volunteer.email,
                areaOfInterest: volunteer.area_of_interest,
                roleOfInterest: volunteer.role_of_interest,
            },
        });
    } catch (error) { handleError(res, next, error); }
};
